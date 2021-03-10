/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { TextDecoder } from 'util';
import { Channels, Stopwatch } from './channels';
import { FileSystem } from './filesystem';
import { HttpFileSystem } from './http-filesystem';
import { i } from './i18n';
import { Dictionary, items } from './linq';
import { LocalFileSystem } from './local-filesystem';
import { MetadataFile, parseConfiguration } from './metadata-format';
import { UnifiedFileSystem } from './unified-filesystem';
import { Uri } from './uri';

const defaultConfig =
  `# Global configuration 

global:
  send-anonymous-telemetry: true
`;

const profileName = ['cella.yaml', 'cella.yml', 'cella.json'];

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
  readonly globalConfig: Uri;
  currentDirectory: Uri;
  configuration!: MetadataFile;

  readonly utf8 = new TextDecoder('utf-8').decode;

  constructor(currentDirectory: string, protected environment: { [key: string]: string | undefined; }) {
    this.fileSystem = new UnifiedFileSystem(this).
      register('file', new LocalFileSystem(this)).
      register(['http', 'https'], new HttpFileSystem(this));

    this.channels = new Channels(this);

    this.setupLogging();

    this.cellaHome = this.fileSystem.file(environment['cella_home']!);
    this.globalConfig = this.cellaHome.join('cella.config.yaml');

    this.currentDirectory = this.fileSystem.file(currentDirectory);
  }

  get telemetryEnabled() {
    return !!this.configuration.globalSettings['send-anonymous-telemetry'];
  }

  #postscriptFile!: Uri;
  get postscriptFile() {
    return this.#postscriptFile || (this.#postscriptFile = this.fileSystem.file(this.environment['CELLA_POSTSCRIPT'] || 'c:/tmp/psf'));
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

  async writePostscript() {
    if (this.postscriptFile?.fsPath.endsWith('.ps1')) {
      await this.fileSystem.writeFile(this.#postscriptFile, Buffer.from([...items(this.#postscript)].map((k, v) => { return `$ENV:${k[0]}="${k[1]}"`; }).join('\n')));
    }

    if (this.postscriptFile?.fsPath.endsWith('.sh')) {
      await this.fileSystem.writeFile(this.#postscriptFile, Buffer.from([...items(this.#postscript)].map((k, v) => { return `export ${k[0]}="${k[1]}"`; }).join('\n')));
    }

    if (this.postscriptFile?.fsPath.endsWith('.cmd')) {
      await this.fileSystem.writeFile(this.#postscriptFile, Buffer.from([...items(this.#postscript)].map((k) => { return `set ${k[0]}="${k[1]}"`; }).join('\r\n')));
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
}