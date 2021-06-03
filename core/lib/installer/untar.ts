/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { acquireArtifactFile, AcquireEvents, AcquireOptions } from '../acquire';
import { TarBzUnpacker, TarGzUnpacker, TarUnpacker, Unpacker, UnpackEvents } from '../archive';
import { UnTar, Verifiable } from '../metadata-format';
import { InstallerImpl } from './installer';

export class UntarInstaller extends InstallerImpl {

  async acquireFile(locations: Array<string>, options?: AcquireOptions, install?: Verifiable) {
    const targetFile = `${this.artifact.name}.tar`;
    const file = await acquireArtifactFile(
      this.session,
      locations.map(each => this.session.fileSystem.parse(each)),
      targetFile,
      InstallerImpl.applyAcquireOptions(options,install));
    return file;
  }

  async install(install: UnTar, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
    const locations = InstallerImpl.locations(install.location);
    const file = await this.acquireFile(locations, options, install);
    const x = await file.readBlock(0, 128);
    let unpacker : Unpacker;
    if (x[0] === 0x1f && x[1] === 0x8b) {
      unpacker = new TarGzUnpacker(this.session);
    } else if (x[0] === 66 && x[1] === 90) {
      unpacker = new TarBzUnpacker(this.session);
    } else {
      unpacker = new TarUnpacker(this.session);
    }

    return unpacker.unpack(file,this.artifact.targetLocation, InstallerImpl.applyUnpackOptions(install));
  }
}
