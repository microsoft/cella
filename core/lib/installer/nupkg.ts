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
    const file = await nuget(this.session, install.location, targetFile, { ...options, algorithm: install?.sha256 ? 'sha256' : install?.md5 ? 'md5' : undefined, value: install?.sha256 || install?.md5 || undefined });
    await new ZipUnpacker(this.session).unpack(file, this.artifact.targetLocation, { ...options, strip: install.strip, transform: install.transform ? [...install.transform] : undefined });
  }

}
