/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { acquireArtifactFile, AcquireEvents, AcquireOptions } from '../acquire';
import { TarBzUnpacker, TarGzUnpacker, TarUnpacker, UnpackEvents } from '../archive';
import { UnTar, Verifiable } from '../metadata-format';
import { InstallerImpl } from './installer';

export class UntarInstaller extends InstallerImpl {

  async acquireFile(locations: Array<string>, options?: AcquireOptions, install?: Verifiable) {
    const targetFile = `${this.artifact.name}.tar`;
    const file = await acquireArtifactFile(this.session, locations.map(each => this.session.fileSystem.parse(each)), targetFile, { ...options, algorithm: install?.sha256 ? 'sha256' : install?.md5 ? 'md5' : undefined, value: install?.sha256 || install?.md5 || undefined });
    return file;
  }

  async install(install: UnTar, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
    const locations = this.locations(install.location);
    const file = await this.acquireFile(locations, options, install);
    const x = await file.readBlock(0, 128);
    if (x[0] === 0x1f && x[1] === 0x8b) {
      await new TarGzUnpacker(this.session).unpack(file, this.artifact.targetLocation, { ...options, strip: install.strip, transform: install.transform ? [...install.transform] : undefined });
      return;
    }
    if (x[0] === 66 && x[1] === 90) {
      await new TarBzUnpacker(this.session).unpack(file, this.artifact.targetLocation, { ...options, strip: install.strip, transform: install.transform ? [...install.transform] : undefined });
      return;
    }
    await new TarUnpacker(this.session).unpack(file, this.artifact.targetLocation, { ...options, strip: install.strip, transform: install.transform ? [...install.transform] : undefined });
  }
}
