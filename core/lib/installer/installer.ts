import { strict } from 'assert';
import { acquireArtifactFile, AcquireEvents, AcquireOptions } from '../acquire';
import { UnpackEvents } from '../archive';
import { Artifact } from '../artifact';
import { Installer, ResourceLocation, Verifiable } from '../metadata-format';
import { Session } from '../session';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export abstract class InstallerImpl {
  constructor(protected session: Session, protected artifact: Artifact, protected installInfo: Installer) {
  }

  async acquireFile(locations: Array<string>, options?: AcquireOptions, install?: Verifiable) {
    const targetFile = `${this.artifact.name}.zip`;
    const file = await acquireArtifactFile(this.session, locations.map(each => this.session.fileSystem.parse(each)), targetFile, { ...options, algorithm: install?.sha256 ? 'sha256' : install?.md5 ? 'md5' : undefined, value: install?.sha256 || install?.md5 || undefined });
    return file;
  }

  locations(from: ResourceLocation) {
    const result = from ? (typeof from === 'string' ? [from] : [...from]) : [];
    strict.ok(result, 'Installer - missing locations');
    return result;
  }

  abstract install(install: Installer, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void>;
}