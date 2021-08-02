// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { fail, strict } from 'assert';
import { delimiter } from 'path';
import { TextDecoder } from 'util';
import { Activation } from './activation';
import { Artifact, createArtifact } from './artifact';
import { Channels, Stopwatch } from './channels';
import { undo } from './constants';
import { FileSystem } from './filesystem';
import { HttpsFileSystem } from './http-filesystem';
import { i } from './i18n';
import { Dictionary, items } from './linq';
import { LocalFileSystem } from './local-filesystem';
import { MetadataFile, parseConfiguration } from './metadata-format';
import { DefaultRepository, IRepository } from './repository';
import { UnifiedFileSystem } from './unified-filesystem';
import { Uri } from './uri';
import { VsixLocalFilesystem } from './vsix-local-filesystem';

const defaultConfig =
  `# Global configuration

global:
  send-anonymous-telemetry: true 
  accepted-eula: false
`;

const profileName = ['environment.yaml', 'environment.yml', 'environment.json'];
export type Context = { [key: string]: Array<string> | undefined; } & {
  readonly os: string;
  readonly arch: string;
  readonly windows: boolean;
  readonly osx: boolean;
  readonly linux: boolean;
  readonly freebsd: boolean;
  readonly x64: boolean;
  readonly x86: boolean;
  readonly arm: boolean;
  readonly arm64: boolean;
}

interface BackupFile {
  environment: Dictionary<string>;
  activation: Activation;
}
/**
 * The Session class is used to hold a reference to the
 * message channels,
 * the filesystems,
 * and any other 'global' data that should be kept.
 *
 */
export class Session {
  /** @internal */
  readonly stopwatch = new Stopwatch();
  readonly fileSystem: FileSystem;
  readonly channels: Channels;
  readonly homeFolder: Uri;
  readonly tmpFolder: Uri;
  readonly installFolder: Uri;

  readonly globalConfig: Uri;
  readonly cache: Uri;
  currentDirectory: Uri;
  configuration!: MetadataFile;

  #decoder = new TextDecoder('utf-8');
  readonly utf8 = (input?: NodeJS.ArrayBufferView | ArrayBuffer | null | undefined) => this.#decoder.decode(input);

  private readonly sources: Map<string, IRepository>;

  constructor(currentDirectory: string, public readonly context: Context, public readonly settings: Dictionary<string>, public readonly environment: NodeJS.ProcessEnv) {
    this.fileSystem = new UnifiedFileSystem(this).
      register('file', new LocalFileSystem(this)).
      register('vsix', new VsixLocalFilesystem(this)).
      register(['https'], new HttpsFileSystem(this)
      );

    this.channels = new Channels(this);

    this.setupLogging();

    this.homeFolder = this.fileSystem.file(settings['homeFolder']!);
    this.cache = this.homeFolder.join('cache');
    this.globalConfig = this.homeFolder.join('ce.config.yaml');

    this.tmpFolder = this.homeFolder.join('tmp');
    this.installFolder = this.homeFolder.join('artifacts');

    this.currentDirectory = this.fileSystem.file(currentDirectory);

    // built in repository

    this.sources = new Map<string, IRepository>([
      ['default', new DefaultRepository(this)]
    ]);
  }

  get sourceNames() {
    return this.sources.keys();
  }

  /** returns a repository given the name */
  getRepository(source = 'default') {
    const result = this.sources.get(source);

    if (!result) {
      throw new Error(i`Unknown repository '${source}'`);
    }
    return result;
  }

  parseName(id: string) {
    return id.indexOf(':') > -1 ? id.split(':') : ['default', id];
  }

  /**
   * returns an artifact for the strongly-named artifact id/version.
   *
   * @param idOrShortName the identity of the artifact. If the string has no '<source>:' at the front, default source is assumed.
   * @param version the version of the artifact
   */
  async getArtifact(idOrShortName: string, version: string | undefined): Promise<Artifact | undefined> {
    const [source, name] = this.parseName(idOrShortName);
    const repository = this.getRepository(source);
    if (!repository.loaded) {
      await repository.load();
    }

    const query = repository.where.id.nameOrShortNameIs(name);
    if (version) {
      query.version.rangeMatch(version);
    }
    const matches = query.items;

    switch (matches.length) {
      case 0:
        // did not match a name or short name.
        return undefined; // nothing matched.

      case 1: {
        // found the artifact. awesome.
        return await repository.openArtifact(matches[0]);
      }

      default: {
        // multiple matches.
        const artifacts = await repository.openArtifacts(matches);
        // there should be a single id matched.
        switch (artifacts.size) {
          case 0:
            return undefined;
          case 1:
            // we want the first item, because it's the highest version that matches in what we were asked for
            return artifacts.entries().next().value[1];
        }
        // this should not be happening.
        fail(i`Artifact identity '${idOrShortName}' matched more than one result (${[...artifacts.keys()].join(',')}). This should never happen. or is this multiple version matches?`);
      }
        break;
    }
  }


  get telemetryEnabled() {
    return !!this.configuration.globalSettings['send-anonymous-telemetry'];
  }

  get acceptedEula() {
    return !!this.configuration.globalSettings['accepted-eula'];
  }

  async acceptEula() {
    this.configuration.globalSettings['accepted-eula'] = <any>true;
    await this.saveConfig();
  }

  async saveConfig() {
    await this.fileSystem.writeFile(this.globalConfig, Buffer.from(this.configuration.content, 'utf-8'));
  }

  #postscriptFile?: Uri;
  get postscriptFile() {
    return this.#postscriptFile || (this.#postscriptFile = this.environment['CE_POSTSCRIPT'] ? this.fileSystem.file(this.environment['CE_POSTSCRIPT']) : undefined);
  }

  async init() {
    // load global configuration
    if (!await this.fileSystem.isDirectory(this.homeFolder)) {
      // let's create the folder
      try {
        await this.fileSystem.createDirectory(this.homeFolder);
      } catch (error: any) {
        // if this throws, let it
        this.channels.debug(error?.message);
      }
      // check if it got made, because at an absolute minimum, we need a folder, so failing this is catastrophic.
      strict.ok(await this.fileSystem.isDirectory(this.homeFolder), i`Fatal: The root folder '${this.homeFolder.fsPath}' can not be created`);
    }

    if (!await this.fileSystem.isFile(this.globalConfig)) {
      try {
        await this.fileSystem.writeFile(this.globalConfig, Buffer.from(defaultConfig, 'utf-8'));
      } catch {
        // if this throws, let it
      }
      // check if it got made, because at an absolute minimum, we need the config file, so failing this is catastrophic.
      strict.ok(await this.fileSystem.isFile(this.globalConfig), i`Fatal: The global configuration file '${this.globalConfig.fsPath}' can not be created`);
    }

    // got past the checks, let's load the configuration.
    this.configuration = parseConfiguration(this.globalConfig.toString(), (await this.fileSystem.readFile(this.globalConfig)).toString());
    this.channels.debug(`Loaded global configuration file '${this.globalConfig.fsPath}'`);

    return this;
  }

  async findProjectProfile(startLocation = this.currentDirectory, search = true): Promise<Uri | undefined> {
    let location = startLocation;
    for (const loc of profileName) {
      const path = location.join(loc);
      if (await this.fileSystem.isFile(path)) {
        return path;
      }
    }
    location = location.join('..');
    if (search) {
      return (location.toString() === startLocation.toString()) ? undefined : this.findProjectProfile(location);
    }
    return undefined;
  }

  #postscript = new Dictionary<string>();
  addPostscript(variableName: string, value: string) {
    this.#postscript[variableName] = value;
  }

  async deactivate() {
    // get the deactivation information
    const lastEnv = this.environment[undo];

    // remove the variable first.
    delete this.environment[undo];
    this.addPostscript(undo, '');

    if (lastEnv) {
      const fileUri = this.fileSystem.parse(lastEnv);
      if (await fileUri.exists()) {
        const contents = this.utf8(await fileUri.readFile());
        await fileUri.delete();

        if (contents) {
          try {
            const original = <BackupFile>JSON.parse(contents, (k, v) => this.deserializer(k, v));

            // reset the environment variables
            // and queue them up in the postscript
            for (const [variable, value] of items(original.environment)) {
              if (value) {
                this.environment[variable] = value;
                this.addPostscript(variable, value);
              } else {
                delete this.environment[variable];
                this.addPostscript(variable, '');
              }
            }

            // in the paths, let's remove all the entries
            for (const [variable, uris] of original.activation.paths.entries()) {
              let pathLikeVariable = this.environment[variable];
              if (pathLikeVariable) {
                for (const uri of uris) {
                  pathLikeVariable = pathLikeVariable.replace(uri.fsPath, '');
                }
                const rx = new RegExp(`${delimiter}+`, 'g');
                pathLikeVariable = pathLikeVariable.replace(rx, delimiter).replace(/^;|;$/g, '');
                // persist that.
                this.environment[variable] = pathLikeVariable;
                this.addPostscript(variable, pathLikeVariable);
              }
            }
          } catch {
            // file not valid, bail.
          }
        }
      }
    }
  }

  async setActivationInPostscript(activation: Activation, backupEnvironment = true) {

    // capture any variables that we set.
    const contents = <BackupFile>{ environment: {}, activation };

    for (const [variable, value] of activation.Paths) {
      this.addPostscript(variable, `${value}${delimiter}${process.env[variable]}`);
      // for path activations, we undo specific entries, so we don't store the variable here (in case the path is modified after)
    }

    for (const [variable, value] of activation.Variables) {
      this.addPostscript(variable, value);
      contents.environment[variable] = this.environment[variable] || ''; // track the original value
    }

    // for now.
    if (activation.defines.size > 0) {
      this.addPostscript('DEFINES', activation.Defines.map(([define, value]) => `${define}=${value}`).join(' '));
    }

    if (backupEnvironment) {
      // create the environment backup file
      const backupFile = this.tmpFolder.join(`previous-environment-${Date.now().toFixed()}.json`);

      await backupFile.writeFile(Buffer.from(JSON.stringify(contents, (k, v) => this.serializer(k, v), 2)));
      this.addPostscript(undo, backupFile.toString());
    }
  }

  async writePostscript() {
    let content = '';
    const psf = this.postscriptFile;
    if (psf) {
      switch (psf?.fsPath.substr(-3)) {
        case 'ps1':
          // update environment variables. (powershell)
          content += [...items(this.#postscript)].map((k, v) => { return `$\{ENV:${k[0]}}="${k[1]}"`; }).join('\n');
          break;

        case 'cmd':
          // update environment variables. (cmd)
          content += [...items(this.#postscript)].map((k) => { return `set ${k[0]}=${k[1]}`; }).join('\r\n');
          break;

        case '.sh':
          // update environment variables. (posix)'
          content += [...items(this.#postscript)].map((k, v) => {
            return k[1] ? `export ${k[0]}="${k[1]}"` : `unset ${k[0]}`;
          }).join('\n');
      }

      if (content) {
        await this.fileSystem.writeFile(psf, Buffer.from(content));
      }
    }
  }

  setupLogging() {
    // at this point, we can subscribe to the events in the export * from './lib/version';FileSystem and Channels
    // and do what we need to do (record, store, etc.)
    //
    // (We'll defer actually this until we get to #23: Create Bug Report)
    //
    // this.FileSystem.on('deleted', (uri) => { console.log(uri) })
  }

  async getInstalledArtifacts() {
    const result = new Array<{ folder: Uri, id: string, artifact: Artifact }>();
    if (! await this.installFolder.exists()) {
      return result;
    }
    for (const [folder, stat] of await this.installFolder.readDirectory(undefined, { recursive: true })) {
      try {

        const content = this.utf8(await folder.readFile('artifact.yaml'));
        const metadata = parseConfiguration(folder.fsPath, content);
        result.push({
          folder,
          id: metadata.info.id,
          artifact: createArtifact(this, metadata, '')
        });
      } catch {
        // not a valid install.
      }
    }
    return result;
  }

  async openManifest(manifestFile: Uri) {
    return parseConfiguration(manifestFile.fsPath, this.utf8(await manifestFile.readFile()));
  }

  serializer(key: any, value: any) {
    if (value instanceof Map) {
      return { dataType: 'Map', value: Array.from(value.entries()) };
    }
    return value;
  }

  deserializer(key: any, value: any) {
    if (typeof value === 'object' && value !== null) {
      switch (value.dataType) {
        case 'Map':
          return new Map(value.value);
      }
      if (value.scheme && value.path) {
        return this.fileSystem.from(value);
      }
    }
    return value;
  }
}

