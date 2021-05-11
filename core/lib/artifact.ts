/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AcquireEvents } from './acquire';
import { UnpackEvents } from './archive';
import { MultipleInstallsMatched } from './exceptions';
import { intersect } from './intersect';
import { Dictionary, linq } from './linq';
import { parseQuery } from './mediaquery/media-query';
import { Demands, MetadataFile, VersionReference } from './metadata-format';
import { Session } from './session';

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
    // .toDictionary(([name, ver]) => name, ([name, ver]) => ver);
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

  get targetLocation() {
    return this.session.installFolder.join(this.name);
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
}