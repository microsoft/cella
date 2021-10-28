// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { strict } from 'assert';
import { compare } from 'semver';
import { parse } from 'yaml';
import { parseConfiguration } from '../amf/metadata-file';
import { Artifact, createArtifact } from '../artifacts/artifact';
import { Registry } from '../artifacts/registry';
import { acquireArtifactFile } from '../fs/acquire';
import { ZipUnpacker } from '../fs/archive';
import { FileType } from '../fs/filesystem';
import { i } from '../i18n';
import { Session } from '../session';
import { Queue } from '../util/promise';
import { Uri } from '../util/uri';
import { isYAML, serialize } from '../yaml/yaml';
import { Index } from './indexer';
import { RegistryIndex } from './registry-index';

const THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING = '# MANIFEST-INDEX';

export class StandardRegistry implements Registry {

  private index = new Index(RegistryIndex);
  private indexYaml: Uri;

  constructor(private session: Session, readonly baseFolder: Uri, readonly remoteLocation: Uri) {
    this.indexYaml = baseFolder.join('index.yaml');
  }

  get count() {
    return this.index.indexOfTargets.length;
  }

  async regenerate(): Promise<void> {
    const repo = this;
    const q = new Queue();
    async function processFile(uri: Uri) {

      const content = await uri.readUTF8();
      // if you see this, it's an index, and we can skip even trying.
      if (content.startsWith(THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING)) {
        return;
      }
      try {
        const amf = parseConfiguration(uri.fsPath, content);

        if (!amf.isFormatValid) {
          for (const err of amf.formatErrors) {
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

        repo.index.insert(amf, repo.baseFolder.relative(uri));

      } catch (e: any) {
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
    this.index.reset();
    await process(this.baseFolder);
    await q.done;

    // we're done inserting values
    this.index.doneInsertion();
  }

  #loaded = false;

  get loaded() {
    return this.#loaded;
  }

  async load(): Promise<void> {
    if (! await this.indexYaml.exists()) {
      await this.update();
    }

    strict.ok(await this.indexYaml.exists(), `Index file is missing '${this.indexYaml.fsPath}'`);

    this.session.channels.debug(`Loading repository from '${this.indexYaml.fsPath}'`);
    this.index.deserialize(parse(await this.indexYaml.readUTF8()));
    this.#loaded = true;
  }

  async save(): Promise<void> {
    await this.indexYaml.writeFile(Buffer.from(`${THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING}\n${serialize(this.index.serialize()).replace(/\s*(\d*,)\n/g, '$1')}`));
  }

  get where(): RegistryIndex {
    return this.index.where;
  }

  async update() {
    this.session.channels.message(i`Updating repository data from ${this.remoteLocation.toString()}`);

    const file = await acquireArtifactFile(this.session, [this.remoteLocation], 'repository.zip', {});
    if (await file.exists()) {
      const unpacker = new ZipUnpacker(this.session);
      await unpacker.unpack(file, this.baseFolder, { strip: 1 });
    }
  }

  private async openManifest(manifestPath: string) {
    const manifestUri = this.baseFolder.join(manifestPath);
    const content = await manifestUri.readUTF8();
    return parseConfiguration(manifestUri.fsPath, content);
  }

  async openArtifact(manifestPath: string) {
    const metadata = await this.openManifest(manifestPath);
    return createArtifact(this.session, metadata, this.index.indexSchema.id.getShortNameOf(metadata.info.id) || metadata.info.id);
  }

  async openArtifacts(manifestPaths: Array<string>) {
    let metadataFiles = new Array<Artifact>();

    // load them up async, but throttled via a queue
    await manifestPaths.forEachAsync(async (manifest) => metadataFiles.push(await this.openArtifact(manifest))).done;

    // sort the contents by version before grouping. (descending version)
    metadataFiles = metadataFiles.sort((a, b) => compare(b.metadata.info.version, a.metadata.info.version));

    // return a map.
    return metadataFiles.groupByMap(m => m.metadata.info.id, artifact => artifact);
  }
}

export class DefaultRegistry extends StandardRegistry {
  constructor(session: Session) {
    const remoteUri = session.fileSystem.parse('https://aka.ms/vcpkg-ce-default');
    const repositoryFolder = session.settings['repositoryFolder'];
    const localUri = repositoryFolder ? session.fileSystem.file(repositoryFolder) : session.homeFolder.join('repo', 'default');
    super(session, localUri, remoteUri);
  }
}
