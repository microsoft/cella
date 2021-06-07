/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as micromatch from 'micromatch';
import { AcquireEvents } from './acquire';
import { Activation } from './activation';
import { UnpackEvents } from './archive';
import { MultipleInstallsMatched } from './exceptions';
import { i } from './i18n';
import { intersect } from './intersect';
import { Dictionary, linq } from './linq';
import { parseQuery } from './mediaquery/media-query';
import { Demands, MetadataFile, VersionReference } from './metadata-format';
import { Session } from './session';
import { Uri } from './uri';

export class SetOfDemands {
  #demands = new Map<string, Demands>();

  constructor(metadata: MetadataFile, session: Session) {
    this.#demands.set('', metadata);

    for (const query of metadata.demands) {
      if (parseQuery(query).match(session.environment.context)) {
        this.#demands.set(query, metadata[query]);
      }
    }
  }

  get installer() {
    const install = linq.items(this.#demands).where(([query, demand]) => !!demand.install).toArray();

    if (install.length > 1) {
      // bad. There should only ever be one install block.
      throw new MultipleInstallsMatched(install.map(each => each[0]));
    }

    return install[0]?.[1].install;
  }

  get errors() {
    return linq.values(this.#demands).selectNonNullable(d => d.error).toArray();
  }
  get warnings() {
    return linq.values(this.#demands).selectNonNullable(d => d.warning).toArray();
  }
  get messages() {
    return linq.values(this.#demands).selectNonNullable(d => d.message).toArray();
  }
  get settings() {
    return linq.values(this.#demands).selectNonNullable(d => d.settings).toArray();
  }
  get seeAlso() {
    return linq.values(this.#demands).selectNonNullable(d => d.seeAlso).toArray();
  }
  get requires() {
    const d = this.#demands;
    const rq1 = linq.values(d).selectNonNullable(d => d.requires).toArray();
    const rq = [...d.values()].map(each => each.requires).filter(each => each);
    const result = new Dictionary<VersionReference>();
    for (const dict of rq) {
      for (const name of dict.keys) {
        result[name] = dict[name];
      }
    }
    return result;
  }
}

export type Artifact = ArtifactInfo & MetadataFile;

export function createArtifact(session: Session, metadata: MetadataFile, shortName: string): Artifact {
  const artifact = intersect(new ArtifactInfo(session, metadata, shortName), metadata);
  artifact.artifact = artifact;
  return artifact;
}

class ArtifactInfo {
  /**@internal */ artifact!: Artifact;

  readonly applicableDemands: SetOfDemands;
  constructor(protected session: Session, protected metadata: MetadataFile, public shortName: string) {
    this.applicableDemands = new SetOfDemands(this.metadata, this.session);
  }

  get id() {
    return this.metadata.info.id;
  }

  get isInstalled() {
    return this.targetLocation.exists('artifact.yaml');
  }

  async install(options?: { events?: Partial<UnpackEvents & AcquireEvents>, force?: boolean }) {
    // is it installed?
    if (await this.isInstalled && !(options?.force)) {
      return;
    }

    if (options?.force) {
      try {
        await this.uninstall();
      } catch {
        // if a file is locked, it may not get removed. We'll deal with this later.
      }
    }

    const d = this.applicableDemands;
    let fail = false;
    for (const each of d.errors) {
      this.session.channels.error(each);
      fail = true;
    }

    // check to see that we only have one install block

    if (fail) {
      throw Error('errors present');
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
    const installInfo = d.installer;
    if (installInfo) {
      const installer = this.session.createInstaller(this.artifact, installInfo);
      await installer.install(installInfo, options);
    }

    // after we unpack it, write out the installed manifest
    await this.writeManifest();
  }

  get name() {
    return `${this.artifact.info.id.replace(/[^\w]+/g, '.')}-${this.artifact.info.version}`;
  }

  #targetLocation: Uri | undefined;
  get targetLocation() {
    // tools/contoso/something/x64/1.2.3/
    // slashes to folders, non-word-chars to dot, append version
    return this.#targetLocation || (this.#targetLocation = this.session.installFolder.join(...this.artifact.info.id.split('/').map(n => n.replace(/[^\w]+/g, '.')), this.artifact.info.version));
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
    const allPaths = await (await this.targetLocation.readDirectory(undefined, { recursive: true })).select(([name, stat]) => name.toString().substr(l));

    for (const s of this.applicableDemands.settings) {
      for (const key of s.defines.keys) {
        let value = s.defines[key];
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
        let k = key.toUpperCase();

        // transform aliases to actual key
        switch (k) {
          case 'BIN':
          case 'PATH':
            k = 'PATH';
            break;

          case 'INCLUDE':
          case 'INCLUDEPATH':
            k = 'INCLUDE';
            break;

          case 'LIB':
          case 'LIBPATH':
            k = 'LIB';
            break;

          case 'LDSCRIPT':
            k = 'LDSCRIPT';
            break;

          case 'OBJECT':
          case 'OBJ':
            k = 'OBJPATH';
            break;
        }

        const p = activation.paths.getOrDefault(k, []);
        const locations = s.paths[key].selectMany(path => {
          const p = sanitizePath(path);
          return p ? micromatch(allPaths, p) : [''];
        }).map(each => this.targetLocation.join(each));

        if (locations.length) {
          p.push(...locations);
          this.session.channels.debug(`locations: ${locations.map(l => l.toString())}`);
        }
      }

      for (const key of s.tools.keys) {
        const k = key.toUpperCase();
        if (activation.tools.has(k)) {
          this.session.channels.error(i`Duplicate tool declared ${key} during activation. Probably not a good thing?`);
        }

        const location = sanitizePath(s.tools[key]);
        const uri = this.targetLocation.join(location);
        if (! await uri.exists()) {
          this.session.channels.error(i`Tool '${key}' is specified as '${location}' which does not exist in the package`);
        }

        activation.tools.set(k, uri);
      }

      for (const key of s.variables.keys) {
        const value = s.variables[key];
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

