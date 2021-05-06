/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AcquireEvents } from '../acquire';
import { TarUnpacker, UnpackEvents } from '../archive';
import { UnTar } from '../metadata-format';
import { InstallerImpl } from './installer';

export class UntarInstaller extends InstallerImpl {
  async install(install: UnTar, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
    const locations = this.locations(install.location);
    const file = await this.acquireFile(locations, options, install);
    await new TarUnpacker(this.session).unpack(file, this.artifact.targetLocation, { ...options, strip: install.strip, transform: install.transform ? [...install.transform] : undefined });
  }
}
