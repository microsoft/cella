/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { acquireArtifactFile, AcquireEvents, AcquireOptions } from '../acquire';
import { UnpackEvents, ZipUnpacker } from '../archive';
import { UnZip, Verifiable } from '../metadata-format';
import { InstallerImpl } from './installer';

export class UnzipInstaller extends InstallerImpl {
  async acquireFile(locations: Array<string>, options?: AcquireOptions, install?: Verifiable) {
    const targetFile = `${this.artifact.name}.zip`;
    const file = await acquireArtifactFile(
      this.session,
      locations.map(each => this.session.fileSystem.parse(each)),
      targetFile,
      InstallerImpl.applyAcquireOptions(options,install));
    return file;
  }

  async install(install: UnZip, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
    const locations = this.locations(install.location);
    const file = await this.acquireFile(locations, options, install);
    await new ZipUnpacker(this.session).unpack(
      file,
      this.artifact.targetLocation,
      InstallerImpl.applyUnpackOptions(install));
  }
}
