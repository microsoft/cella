/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AcquireEvents, nuget } from '../acquire';
import { UnpackEvents, ZipUnpacker } from '../archive';
import { Nupkg } from '../metadata-format';
import { InstallerImpl } from './installer';


export class NupkgInstaller extends InstallerImpl {
  async install(install: Nupkg, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
    const targetFile = `${this.artifact.name}.zip`;
    const file = await nuget(
      this.session,
      install.location,
      targetFile,
      InstallerImpl.applyAcquireOptions(options,install));
    return new ZipUnpacker(this.session).unpack(
      file,
      this.artifact.targetLocation,
      InstallerImpl.applyUnpackOptions(install));
  }

}
