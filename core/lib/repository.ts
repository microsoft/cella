/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { compare, SemVer } from 'semver';
import { parse } from 'yaml';
import { http } from './acquire';
import { ZipUnpacker } from './archive';
import { Catalog, IdentityKey, Index, SemverKey, StringKey } from './catalog';
import { FileType } from './filesystem';
import { linq } from './linq';
import { MetadataFile, parseConfiguration } from './metadata-format';
import { Session } from './session';
import { Uri } from './uri';
import { isYAML, serialize } from './util/yaml';

class RepoIndex extends Index<MetadataFile, RepoIndex> {
  id = new IdentityKey(this, (i) => i.info.id)
  version = new SemverKey(this, (i) => new SemVer(i.info.version));
  description = new StringKey(this, (i) => i.info.description);
  summary = new StringKey(this, (i) => i.info.summary);
}

const MAGIC_STRING = '# MANIFEST-INDEX';

export class Repository {

  private catalog = new Catalog(RepoIndex);
  private indexYaml: Uri;

  constructor(private session: Session) {
    this.indexYaml = session.repo.join('index.yaml');
  }

  get count() {
    return this.catalog.indexOfTargets.length;
  }

  async regenerate(): Promise<void> {
    const $ = this;
    async function process(folder: Uri) {
      const processing = new Array<Promise<void>>();
      for (const each of await folder.readDirectory()) {
        if (each[1] & FileType.Directory) {
          processing.push(process(each[0]));
          continue;
        }
        if (each[1] & FileType.File && isYAML(each[0].path)) {
          const content = $.session.utf8(await each[0].readFile());
          if (content.startsWith(MAGIC_STRING)) {
            continue;
          }
          $.session.channels.debug(`index processing ${each[0].fsPath}`);
          try {
            const amf = parseConfiguration(each[0].fsPath, content);
            $.catalog.insert(amf, $.session.repo.relative(each[0]));
          } catch (e) {
            $.session.channels.warning(`skipping invalid metadata file ${each[0].fsPath}`);
          }
        }
      }
      await Promise.all(processing);
    }
    await process(this.session.repo);

    // we're done inserting values
    this.catalog.doneInsertion();
  }

  async load(): Promise<void> {
    strict.ok(await this.indexYaml.exists(), `Index file is missing '${this.indexYaml.fsPath}'`);
    this.catalog.deserialize(parse(this.session.utf8(await this.indexYaml.readFile())));
  }

  async save(): Promise<void> {
    await this.indexYaml.writeFile(Buffer.from(`${MAGIC_STRING}\n${serialize(this.catalog.serialize()).replace(/\s*(\d*,)\n/g, '$1').replace(/\s*(\d*,)\n/g, '$1')}`)); //.replace(/,\s+(\d)/g, ', $1').replace(/,\s+/g, ' ').replace(/:\n\s*\[/g, ': [').replace(/\n\s*\]/g, ']')
  }

  get where(): RepoIndex {
    return this.catalog.where;
  }

  async update(ghAuthToken: string) {
    const file = await http(this.session, [this.session.repoUri], 'repository.zip', { credentials: { githubToken: ghAuthToken } });
    if (await file.exists()) {
      const unpacker = new ZipUnpacker(this.session);
      await unpacker.unpack(file, this.session.repo, { strip: 1 });
    }
  }

  async open(manifests: Array<string>) {
    // how many to do concurrently
    const batch = 10;

    const metadataFiles = new Array<MetadataFile>();

    for (let i = 0; i < manifests.length; i += batch) {
      const group = manifests.slice(i, Math.min(manifests.length, i + batch));

      // parallel so we don't have a long delay loading
      await Promise.all(group.map(async manifest => {
        const manifestUri = this.session.repo.join(manifest);
        const content = this.session.utf8(await manifestUri.readFile());

        insertManifest(metadataFiles, parseConfiguration(manifestUri.fsPath, content));
      }));
    }
    // return a map.
    return linq.values(metadataFiles).groupBy(m => m.info.id, metadata => ({ shortName: this.catalog.index.id.getShortNameOf(metadata.info.id) || metadata.info.id, metadata }));
  }
}

function insertManifest(sortedArray: Array<MetadataFile>, element: MetadataFile, lowerBound = 0, upperBound = sortedArray.length - 1): Array<MetadataFile> {
  const band = upperBound - lowerBound;
  switch (band) {
    case -1:
      sortedArray.push(element);
      return sortedArray;

    case 0:
    case 1:
      if (compare(element.info.version, sortedArray[lowerBound].info.version) < 0) {
        sortedArray.splice(lowerBound, 0, element);
        return sortedArray;
      }

      if (compare(element.info.version, sortedArray[upperBound].info.version) > 0) {
        sortedArray.splice(upperBound + 1, 0, element);
        return sortedArray;
      }

      sortedArray.splice(upperBound, 0, element);
      return sortedArray;
  }
  const halfway = lowerBound + Math.floor(band / 2);

  return compare(element.info.version, sortedArray[halfway].info.version) < 0
    ? insertManifest(sortedArray, element, lowerBound, halfway)
    : insertManifest(sortedArray, element, halfway, upperBound);
}
