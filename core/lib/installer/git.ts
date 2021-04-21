/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Installer } from '../metadata-format';
import { InstallerImpl } from './installer';


export class GitInstaller extends InstallerImpl {
  async install(id: string, version: string, install: Installer): Promise<void> {
    //
  }
}
