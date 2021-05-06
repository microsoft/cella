/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AcquireEvents } from '../acquire';
import { UnpackEvents } from '../archive';
import { Installer } from '../metadata-format';
import { InstallerImpl } from './installer';


export class GitInstaller extends InstallerImpl {
  async install(install: Installer, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
    //
  }
}
