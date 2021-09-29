// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { fail } from 'assert';
import * as micromatch from 'micromatch';
import { MetadataFile } from '../amf/metadata-file';
import { Demands, Installer, Nupkg, UnTar, UnZip, VersionReference } from '../amf/metadata-format';
import { AcquireEvents } from '../fs/acquire';
import { UnpackEvents } from '../fs/archive';
import { i } from '../i18n';
import { parseQuery } from '../mediaquery/media-query';
import { Session } from '../session';
import { MultipleInstallsMatched } from '../util/exceptions';
import { Dictionary, linq } from '../util/linq';
import { Uri } from '../util/uri';
import { Activation } from './activation';
import { installNuGet, installUnTar, installUnZip } from './installer-impl';

export class SetOfDemands {
  _demands = new Map<string, Demands>();

  constructor(metadata: MetadataFile, session: Session) {
    this._demands.set('', metadata);

    for (const [query, demands] of metadata.entries) {
      if (parseQuery(query).match(session.context)) {
        session.channels.debug(`Matching demand query: '${query}'`);
        this._demands.set(query, demands);
      }
    }
  }

  get installer() {
    const install = linq.items(this._demands).where(([query, demand]) => demand.install.length > 0).toArray();

    if (install.length > 1) {
      // bad. There should only ever be one install block.
      throw new MultipleInstallsMatched(install.map(each => each[0]));
    }

    return install[0]?.[1].install || [];
  }

  get errors() {
    return linq.values(this._demands).selectNonNullable(d => d.error).toArray();
  }
  get warnings() {
    return linq.values(this._demands).selectNonNullable(d => d.warning).toArray();
  }
  get messages() {
    return linq.values(this._demands).selectNonNullable(d => d.message).toArray();
  }
  get settings() {
    return linq.values(this._demands).selectNonNullable(d => d.settings).toArray();
  }
  get seeAlso() {
    return linq.values(this._demands).selectNonNullable(d => d.seeAlso).toArray();
  }
  get requires() {
    const d = this._demands;
    const rq1 = linq.values(d).selectNonNullable(d => d.requires).toArray();
    const result = new Dictionary<VersionReference>();
    for (const dict of rq1) {
      for (const [query, demands] of dict.entries) {
        result[query] = demands;
      }
    }
    const rq = [...d.values()].map(each => each.requires).filter(each => each);

    for (const dict of rq) {
      for (const [query, demands] of dict.entries) {
        result[query] = demands;
      }
    }
    return result;
  }
}

export function createArtifact(session: Session, metadata: MetadataFile, shortName: string): Artifact {
  return new Artifact(session, metadata, shortName);
}

export class Artifact {
  isPrimary = false;

  readonly applicableDemands: SetOfDemands;
  constructor(protected session: Session, public readonly metadata: MetadataFile, public shortName: string) {
    this.applicableDemands = new SetOfDemands(this.metadata, this.session);
  }

  get id() {
    return this.metadata.info.id;
  }

  get version() {
    return this.metadata.info.version;
  }

  get isInstalled() {
    return this.targetLocation.exists('artifact.yaml');
  }

  private async installSingle(installInfo: Installer, options: { events?: Partial<UnpackEvents & AcquireEvents>, allLanguages?: boolean, language?: string }): Promise<void> {
    if (installInfo.lang && !options.allLanguages && options.language && options.language.toLowerCase() !== installInfo.lang.toLowerCase()) {
      return;
    }

    switch (installInfo.kind) {
      case 'nupkg':
        await installNuGet(this.session, this, <Nupkg>installInfo, options);
        break;
      case 'unzip':
        await installUnZip(this.session, this, <UnZip>installInfo, options);
        break;
      case 'untar':
        await installUnTar(this.session, this, <UnTar>installInfo, options);
        break;
      case 'git':
        throw new Error('not implemented');
      default:
        fail(i`Unknown installer type ${installInfo!.kind}`);
    }
  }

  async install(options?: { events?: Partial<UnpackEvents & AcquireEvents>, force?: boolean, allLanguages?: boolean, language?: string }): Promise<boolean> {
    if (!options) {
      options = {};
    }

    // is it installed?
    if (await this.isInstalled && !options.force) {
      return false;
    }

    if (options.force) {
      try {
        await this.uninstall();
      } catch {
        // if a file is locked, it may not get removed. We'll deal with this later.
      }
    }

    const d = this.applicableDemands;
    {
      let fail = false;
      for (const each of d.errors) {
        this.session.channels.error(each);
        fail = true;
      }

      // check to see that we only have one install block

      if (fail) {
        throw Error('errors present');
      }
    }

    // warnings
    for (const each of d.warnings) {
      this.session.channels.warning(each);
    }

    // messages
    for (const each of d.messages) {
      this.session.channels.message(each);
    }

    // ok, let's install this.
    for (const singleInstallInfo of d.installer) {
      await this.installSingle(singleInstallInfo, options);
    }

    // after we unpack it, write out the installed manifest
    await this.writeManifest();

    return true;
  }

  get name() {
    return `${this.metadata.info.id.replace(/[^\w]+/g, '.')}-${this.metadata.info.version}`;
  }

  #targetLocation: Uri | undefined;
  get targetLocation(): Uri {
    // tools/contoso/something/x64/1.2.3/
    // slashes to folders, non-word-chars to dot, append version
    return this.#targetLocation || (this.#targetLocation = this.session.installFolder.join(...this.metadata.info.id.split('/').map(n => n.replace(/[^\w]+/g, '.')), this.metadata.info.version));
  }

  async writeManifest() {
    const content = this.metadata.content;
    await this.targetLocation.createDirectory();
    await this.targetLocation.join('artifact.yaml').writeFile(Buffer.from(content));
  }

  async uninstall() {
    await this.targetLocation.delete({ recursive: true, useTrash: false });
  }

  async resolveDependencies(artifacts = new Set<Artifact>()) {
    // find the dependencies and add them to the set
    for (const [id, version] of linq.items(this.applicableDemands.requires)) {
      const dep = await this.session.getArtifact(id, version.raw);
      if (!dep) {
        throw new Error(`Unable to resolve dependency ${id}/${version}`);
      }

      if (!artifacts.has(dep)) {
        artifacts.add(dep);
        // process it's dependencies too.
        await dep.resolveDependencies(artifacts);
      }
    }
    return artifacts;
  }

  async loadActivationSettings(activation: Activation) {
    // construct paths (bin, lib, include, etc.)
    // construct tools
    // compose variables
    // defines

    const l = this.targetLocation.toString().length + 1;
    const allPaths = (await this.targetLocation.readDirectory(undefined, { recursive: true })).select(([name, stat]) => name.toString().substr(l));

    for (const s of this.applicableDemands.settings) {
      // eslint-disable-next-line prefer-const
      for (let [key, value] of s.defines.entries) {
        if (value === 'true') {
          value = '1';
        }

        const v = activation.defines.get(key);
        if (v && v !== value) {
          // conflict. todo: what do we want to do?
          this.session.channels.warning(i`Duplicate define ${key} during activation. New value will replace old `);
        }
        activation.defines.set(key, value);
      }

      for (const key of s.paths.keys) {
        if (!key) {
          continue;
        }
        const pathEnvVariable = key.toUpperCase();
        const p = activation.paths.getOrDefault(pathEnvVariable, []);
        const locations = s.paths.get(key)?.toArray().map(each => each).selectMany(path => {
          const p = sanitizePath(path);
          return p ? micromatch(allPaths, p) : [''];
        }).map(each => this.targetLocation.join(each));

        if (locations?.length) {
          p.push(...locations);
          this.session.channels.debug(`locations: ${locations.map(l => l.toString())}`);
        }
      }

      for (const key of s.tools.keys) {
        const envVariable = key.toUpperCase();
        if (activation.tools.has(envVariable)) {
          this.session.channels.error(i`Duplicate tool declared ${key} during activation. Probably not a good thing?`);
        }

        const location = sanitizePath(s.tools.get(key) || '');
        const uri = this.targetLocation.join(location);

        if (! await uri.exists()) {
          this.session.channels.error(i`Tool '${key}' is specified as '${location}' which does not exist in the package`);
        }

        activation.tools.set(envVariable, uri);
      }

      for (const [key, value] of s.variables.entries) {
        const envKey = activation.environment.getOrDefault(key, []);
        envKey.push(...value);
      }
    }
  }
}

export function sanitizePath(path: string) {
  return path.
    replace(/[\\/]+/g, '/').     // forward slahses please
    replace(/[?<>:|"]/g, ''). // remove illegal characters.
    // eslint-disable-next-line no-control-regex
    replace(/[\x00-\x1f\x80-\x9f]/g, ''). // remove unicode control codes
    replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i, ''). // no reserved names
    replace(/^[/.]*\//, ''). // dots and slashes off the front.
    replace(/[/.]+$/, ''). // dots and slashes off the back.
    replace(/\/\.+\//g, '/'). // no parts made just of dots.
    replace(/\/+/g, '/'); // duplicate slashes.
}

