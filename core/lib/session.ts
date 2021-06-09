/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fail, strict } from 'assert';
import { delimiter } from 'path';
import { TextDecoder } from 'util';
import { Activation } from './activation';
import { Artifact, createArtifact } from './artifact';
import { Channels, Stopwatch } from './channels';
import { FileSystem } from './filesystem';
import { HttpFileSystem } from './http-filesystem';
import { i } from './i18n';
import { Dictionary, items } from './linq';
import { LocalFileSystem } from './local-filesystem';
import { MetadataFile, parseConfiguration } from './metadata-format';
import { DefaultRepository, Repository } from './repository';
import { UnifiedFileSystem } from './unified-filesystem';
import { Uri } from './uri';
import { VsixLocalFilesystem } from './vsix-local-filesystem';

const defaultConfig =
  `# Global configuration

global:
  send-anonymous-telemetry: true
`;

const profileName = ['cella.yaml', 'cella.yml', 'cella.json'];
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

export type Environment = { [key: string]: string | undefined; } & {
  context: Context;
};

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
  readonly cellaHome: Uri;
  readonly tmpFolder: Uri;
  readonly installFolder: Uri;

  readonly globalConfig: Uri;
  readonly cache: Uri;
  currentDirectory: Uri;
  configuration!: MetadataFile;

  #decoder = new TextDecoder('utf-8');
  readonly utf8 = (input?: NodeJS.ArrayBufferView | ArrayBuffer | null | undefined) => this.#decoder.decode(input);

  private readonly sources: Map<string, Repository>;

  constructor(currentDirectory: string, public readonly environment: Environment) {
    this.fileSystem = new UnifiedFileSystem(this).
      register('file', new LocalFileSystem(this)).
      register('vsix', new VsixLocalFilesystem(this)).
      register(['http', 'https'], new HttpFileSystem(this)
      );

    this.channels = new Channels(this);

    this.setupLogging();

    this.cellaHome = this.fileSystem.file(environment['cella_home']!);
    this.cache = this.cellaHome.join('cache');
    this.globalConfig = this.cellaHome.join('cella.config.yaml');

    this.tmpFolder = this.cellaHome.join('tmp');
    this.installFolder = this.cellaHome.join('artifacts');

    this.currentDirectory = this.fileSystem.file(currentDirectory);

    // built in repository

    this.sources = new Map<string, Repository>([
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
  async getArtifact(idOrShortName: string, version: string | undefined) {
    const [source, name] = this.parseName(idOrShortName);
    const repository = this.getRepository(source);

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

      default:
        // multiple matches
        fail(i`Artifact identity '${idOrShortName}' matched more than one result. This should never happen. or is this multiple version matches?`);
        break;
    }
  }


  get telemetryEnabled() {
    return !!this.configuration.globalSettings['send-anonymous-telemetry'];
  }

  #postscriptFile?: Uri;
  get postscriptFile() {
    return this.#postscriptFile || (this.#postscriptFile = this.environment['CELLA_POSTSCRIPT'] ? this.fileSystem.file(this.environment['CELLA_POSTSCRIPT']) : undefined);
  }

  async init() {
    // load global configuration
    if (!await this.fileSystem.isDirectory(this.cellaHome)) {
      // let's create the folder
      try {
        await this.fileSystem.createDirectory(this.cellaHome);
      } catch (error: any) {
        // if this throws, let it
        this.channels.debug(error?.message);
      }
      // check if it got made, because at an absolute minimum, we need a folder, so failing this is catastrophic.
      strict.ok(await this.fileSystem.isDirectory(this.cellaHome), i`Fatal: The root folder '${this.cellaHome.fsPath}' can not be created.`);
    }

    if (!await this.fileSystem.isFile(this.globalConfig)) {
      try {
        await this.fileSystem.writeFile(this.globalConfig, Buffer.from(defaultConfig, 'utf-8'));
      } catch {
        // if this throws, let it
      }
      // check if it got made, because at an absolute minimum, we need the config file, so failing this is catastrophic.
      strict.ok(await this.fileSystem.isFile(this.globalConfig), i`Fatal: The global configuration file '${this.globalConfig.fsPath}' can not be created.`);
    }

    // got past the checks, let's load the configuration.
    this.configuration = parseConfiguration(this.globalConfig.toString(), (await this.fileSystem.readFile(this.globalConfig)).toString());
    this.channels.debug(`Loaded global configuration file '${this.globalConfig.fsPath}'`);
    return this;
  }

  async findProjectProfile(startLocation = this.currentDirectory): Promise<Uri | undefined> {
    let location = startLocation;
    for (const loc of profileName) {
      const path = location.join(loc);
      if (await this.fileSystem.isFile(path)) {
        return path;
      }
    }
    location = location.join('..');

    return (location.toString() === startLocation.toString()) ? undefined : this.findProjectProfile(location);
  }

  #postscript = new Dictionary<string>();
  addPostscript(variableName: string, value: string) {
    this.#postscript[variableName] = value;
  }

  setActivationInPostscript(a: Activation) {
    for (const [variable, value] of a.Paths) {
      this.addPostscript(variable, `${value}${delimiter}${process.env[variable]}`);
    }

    for (const [variable, value] of a.Variables) {
      this.addPostscript(variable, value);
    }

    // for now.
    if (a.defines.size > 0) {
      this.addPostscript('DEFINES', a.Defines.map(([define, value]) => `${define}=${value}`).join(' '));
    }
  }

  async writePostscript() {
    const psf = this.postscriptFile;
    switch (psf?.fsPath.substr(-3)) {
      case 'ps1':
        return await this.fileSystem.writeFile(psf, Buffer.from([...items(this.#postscript)].map((k, v) => { return `$\{ENV:${k[0]}}="${k[1]}"`; }).join('\n')));
      case 'cmd':
        return await this.fileSystem.writeFile(psf, Buffer.from([...items(this.#postscript)].map((k) => { return `set ${k[0]}="${k[1]}"`; }).join('\r\n')));
      case '.sh':
        return await this.fileSystem.writeFile(psf, Buffer.from([...items(this.#postscript)].map((k, v) => { return `export ${k[0]}="${k[1]}"`; }).join('\n')));
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
}
