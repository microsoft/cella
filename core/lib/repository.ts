/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { compare, SemVer } from 'semver';
import { parse } from 'yaml';
import { http } from './acquire';
import { ZipUnpacker } from './archive';
import { Catalog, IdentityKey, Index, SemverKey, StringKey } from './catalog';
import { FileType } from './filesystem';
import { MetadataFile, parseConfiguration } from './metadata-format';
import { Queue } from './promise';
import { Session } from './session';
import { Uri } from './uri';
import { isYAML, serialize } from './util/yaml';

class RepoIndex extends Index<MetadataFile, RepoIndex> {
  id = new IdentityKey(this, (i) => i.info.id)
  version = new SemverKey(this, (i) => new SemVer(i.info.version));
  summary = new StringKey(this, (i) => i.info.summary);
}

const THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING = '# MANIFEST-INDEX';

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
    const repo = this;
    const q = new Queue();
    async function processFile(uri: Uri) {

      const content = repo.session.utf8(await uri.readFile());
      // if you see this, it's an index, and we can skip even trying.
      if (content.startsWith(THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING)) {
        return;
      }
      try {
        const amf = parseConfiguration(uri.fsPath, content);
        repo.catalog.insert(amf, repo.session.repo.relative(uri));
      } catch (e) {
        repo.session.channels.warning(`skipping invalid metadata file ${uri.fsPath}`);
      }
    }

    async function process(folder: Uri) {
      for (const [entry, type] of await folder.readDirectory()) {
        if (type & FileType.Directory) {
          await process(entry);
          continue;
        }

        if (type & FileType.File && isYAML(entry.path)) {
          void q.enqueue(() => processFile(entry));
        }
      }
    }

    await process(this.session.repo);
    await q.done;

    // we're done inserting values
    this.catalog.doneInsertion();
  }

  async load(): Promise<void> {
    strict.ok(await this.indexYaml.exists(), `Index file is missing '${this.indexYaml.fsPath}'`);
    this.catalog.deserialize(parse(this.session.utf8(await this.indexYaml.readFile())));
  }

  async save(): Promise<void> {
    await this.indexYaml.writeFile(Buffer.from(`${THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING}\n${serialize(this.catalog.serialize()).replace(/\s*(\d*,)\n/g, '$1')}`));
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
    let metadataFiles = new Array<MetadataFile>();

    // load them up async, but throttled with the queue
    await manifests.forEachAsync(async (manifest) => {
      const manifestUri = this.session.repo.join(manifest);
      const content = this.session.utf8(await manifestUri.readFile());
      metadataFiles.push(parseConfiguration(manifestUri.fsPath, content));
    }).done;

    // sort the contents by version before grouping.
    metadataFiles = metadataFiles.sort((a, b) => compare(a.info.version, b.info.version));

    // return a map.
    return metadataFiles.groupByMap(m => m.info.id, metadata => ({ shortName: this.catalog.index.id.getShortNameOf(metadata.info.id) || metadata.info.id, metadata }));
  }
}

