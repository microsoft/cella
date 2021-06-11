/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { compare, SemVer } from 'semver';
import { parse } from 'yaml';
import { acquireArtifactFile } from './acquire';
import { ZipUnpacker } from './archive';
import { Artifact, createArtifact } from './artifact';
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

export interface Repository {
  readonly count: number;
  readonly where: RepoIndex;
  readonly loaded: boolean;

  load(): Promise<void>;
  save(): Promise<void>;
  update(): Promise<void>;
  regenerate(): Promise<void>;

  openArtifact(manifestPath: string): Promise<Artifact>;
  openArtifacts(manifestPaths: Array<string>): Promise<Map<string, Array<Artifact>>>;
  readonly baseFolder: Uri;
}

export class CellaRepository implements Repository {

  private catalog = new Catalog(RepoIndex);
  private indexYaml: Uri;

  constructor(private session: Session, readonly baseFolder: Uri, readonly remoteLocation: Uri) {
    this.indexYaml = baseFolder.join('index.yaml');
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


        if (!amf.isValidYaml) {
          for (const err of amf.yamlErrors) {
            repo.session.channels.warning(`Parse errors in metadata file ${err}}`);
          }
          throw new Error('invalid yaml');
        }

        amf.validate();

        if (!amf.isValid) {
          for (const err of amf.validationErrors) {
            repo.session.channels.warning(`Validation errors in metadata file ${err}}`);
          }
          throw new Error('invalid manifest');
        }

        repo.catalog.insert(amf, repo.baseFolder.relative(uri));

      } catch (e) {
        repo.session.channels.debug(e.toString());
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
    this.catalog.reset();
    await process(this.baseFolder);
    await q.done;

    // we're done inserting values
    this.catalog.doneInsertion();
  }

  #loaded = false;

  get loaded() {
    return this.#loaded;
  }

  async load(): Promise<void> {
    strict.ok(await this.indexYaml.exists(), `Index file is missing '${this.indexYaml.fsPath}'`);
    this.session.channels.debug(`Loading repository from '${this.indexYaml.fsPath}'`);
    this.catalog.deserialize(parse(this.session.utf8(await this.indexYaml.readFile())));
    this.#loaded = true;
  }

  async save(): Promise<void> {
    await this.indexYaml.writeFile(Buffer.from(`${THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING}\n${serialize(this.catalog.serialize()).replace(/\s*(\d*,)\n/g, '$1')}`));
  }

  get where(): RepoIndex {
    return this.catalog.where;
  }

  async update() {
    const file = await acquireArtifactFile(this.session, [this.remoteLocation], 'repository.zip', {
      credentials: {
        githubToken: this.session.environment['githubAuthToken']
      }
    });
    if (await file.exists()) {
      const unpacker = new ZipUnpacker(this.session);
      await unpacker.unpack(file, this.baseFolder, { strip: 1 });
    }
  }

  async resolveDependencies(manifests: Array<string>) {
    // open all the ones that are listed
    // go thru each one, and add in the dependencies
    //
  }

  private async openManifest(manifestPath: string) {
    const manifestUri = this.baseFolder.join(manifestPath);
    const content = this.session.utf8(await manifestUri.readFile());
    return parseConfiguration(manifestUri.fsPath, content);
  }

  async openArtifact(manifestPath: string) {
    const metadata = await this.openManifest(manifestPath);
    return createArtifact(this.session, metadata, this.catalog.index.id.getShortNameOf(metadata.info.id) || metadata.info.id);
  }

  async openArtifacts(manifestPaths: Array<string>) {
    let metadataFiles = new Array<Artifact>();

    // load them up async, but throttled via a queue
    await manifestPaths.forEachAsync(async (manifest) => metadataFiles.push(await this.openArtifact(manifest))).done;

    // sort the contents by version before grouping. (descending version)
    metadataFiles = metadataFiles.sort((a, b) => compare(b.info.version, a.info.version));

    // return a map.
    return metadataFiles.groupByMap(m => m.info.id, artifact => artifact);
  }
}

export class DefaultRepository extends CellaRepository {
  constructor(session: Session) {
    const remoteUri = session.fileSystem.parse('https://github.com/fearthecowboy/scratch/archive/refs/heads/metadata.zip');
    //('https://github.com/microsoft/cella-metadata/archive/refs/heads/main.zip');
    const repositoryFolder = session.settings['repositoryFolder'];
    const localUri = repositoryFolder ? session.fileSystem.file(repositoryFolder) : session.cellaHome.join('repo', 'default');
    super(session, localUri, remoteUri);
  }
}
