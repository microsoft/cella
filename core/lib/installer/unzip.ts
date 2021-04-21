import { http } from '../acquire';
import { ZipUnpacker } from '../archive';
import { delay } from '../events';
import { UnZip } from '../metadata-format';
import { InstallerImpl } from './installer';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class UnzipInstaller extends InstallerImpl {
  async install(id: string, version: string, install: UnZip): Promise<void> {
    //
    const locations = install.location ? (typeof install.location === 'string' ? [install.location] : [...install.location]) : [];
    if (!locations.length) {
      throw new Error('missing locations');
    }
    const name = `${id.replace(/[^\w]+/g, '.')}-${version}`;
    const targetFile = `${name}.zip`;
    const progress = http(this.session, locations.map(each => this.session.fileSystem.parse(each)), targetFile);

    const file = await progress;

    const unpacker = new ZipUnpacker(this.session);
    try {
      await unpacker.unpack(file, this.session.installFolder.join(name), { strip: install.strip, transform: install.transform ? [...install.transform] : undefined });
    } catch (e) {
      console.log(e);
    }
    await delay(10000);
    console.log('hi');
  }
}

