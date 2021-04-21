/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { delay } from './events';
import { MultipleInstallsMatched } from './exceptions';
import { intersect } from './intersect';
import { linq } from './linq';
import { parseQuery } from './mediaquery/media-query';
import { Demands, Installer, MetadataFile } from './metadata-format';
import { Session } from './session';

export class SetOfDemands {
  #demands = new Map<string, Demands>();
  #install?: Installer;

  constructor(metadata: MetadataFile, session: Session) {
    this.#demands.set('', metadata);

    for (const query of metadata.demands) {
      console.log(query);
      if (parseQuery(query).match(session.environment.context)) {
        this.#demands.set(query, metadata[query]);
      }
    }
  }

  get install() {
    for (const [q, d] of this.#demands.entries()) {
      console.log(d);
      if (d.install) {
        console.log(q);
      }

    }
    const install = linq.items(this.#demands).where(([query, demand]) => !!demand.install).toArray();
    console.log(install);
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
  return intersect(new ArtifactInfo(session, metadata, shortName), metadata);
}

class ArtifactInfo {
  readonly demands = new SetOfDemands(this.metadata, this.session);
  constructor(protected session: Session, protected metadata: MetadataFile, public shortName: string) {

  }

  get id() {
    return this.metadata.info.id;
  }

  get isInstalled() {
    return false;
  }

  get basePath() {
    return this.session.remoteRepositoryUri;
  }

  async install(options?: { force?: boolean }) {

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
    const installInfo = d.install;
    if (installInfo) {
      console.log('creating installer');
      const installer = this.session.createInstaller(installInfo);
      await installer.install(this.metadata.info.id, this.metadata.info.version, <any>installInfo);
    }

    await delay(1000);


  }


  async uninstall() {
    //
  }


}