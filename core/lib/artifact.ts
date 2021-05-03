/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AcquireEvents } from './acquire';
import { UnpackEvents } from './archive';
import { MultipleInstallsMatched } from './exceptions';
import { intersect } from './intersect';
import { linq } from './linq';
import { parseQuery } from './mediaquery/media-query';
import { Demands, MetadataFile } from './metadata-format';
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

  get install() {
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
    return linq.values(this.#demands).selectNonNullable(d => d.requires).toArray();
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

  readonly demands: SetOfDemands;
  constructor(protected session: Session, protected metadata: MetadataFile, public shortName: string) {
    this.demands = new SetOfDemands(this.metadata, this.session);
  }

  get id() {
    return this.metadata.info.id;
  }

  get isInstalled() {
    return false;
  }

  async install(listener: Partial<UnpackEvents & AcquireEvents>, options?: { force?: boolean }) {

    // is it installed?
    if (!(options?.force) && this.isInstalled) {
      return;
    }

    const d = this.demands;
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

    // write out the installed manifest
    await this.writeManifest();

    // ok, let's install this.
    const installInfo = d.install;
    if (installInfo) {
      const installer = this.session.createInstaller(this.artifact, installInfo);
      await installer.install(<any>installInfo, listener);
    }


  }

  get name() {
    return `${this.artifact.info.id.replace(/[^\w]+/g, '.')}-${this.artifact.info.version}`;
  }

  get targetLocation() {
    return this.session.installFolder.join(this.name);
  }


  async writeManifest() {
    const content = this.artifact.toString();
    await this.targetLocation.parent().createDirectory();
    await this.targetLocation.writeFile(Buffer.from(content));
  }

  async uninstall() {
    //
    await this.targetLocation.parent().delete({ recursive: true, useTrash: false });
  }


}