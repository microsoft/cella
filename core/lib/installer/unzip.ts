import { AcquireEvents, http } from '../acquire';
import { UnpackEvents, ZipUnpacker } from '../archive';
import { UnZip } from '../metadata-format';
import { InstallerImpl } from './installer';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class UnzipInstaller extends InstallerImpl {
  async install(install: UnZip, listener: Partial<UnpackEvents & AcquireEvents> = {}): Promise<void> {
    //
    const locations = install.location ? (typeof install.location === 'string' ? [install.location] : [...install.location]) : [];
    if (!locations.length) {
      throw new Error('missing locations');
    }

    const targetFile = `${this.artifact.name}.zip`;
    const file = await http(this.session, locations.map(each => this.session.fileSystem.parse(each)), targetFile, listener);

    const unpacker = new ZipUnpacker(this.session);
    try {
      await unpacker.unpack(file, this.artifact.targetLocation, listener, { strip: install.strip, transform: install.transform ? [...install.transform] : undefined });
    } catch (e) {
      console.log(e);
    }
  }
}

