import { strict } from 'assert';
import { AcquireEvents } from '../acquire';
import { UnpackEvents } from '../archive';
import { Artifact } from '../artifact';
import { Installer, ResourceLocation } from '../metadata-format';
import { Session } from '../session';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export abstract class InstallerImpl {
  constructor(protected session: Session, protected artifact: Artifact, protected installInfo: Installer) {
  }

  locations(from: ResourceLocation) {
    const result = from ? (typeof from === 'string' ? [from] : [...from]) : [];
    strict.ok(result, 'Installer - missing locations');
    return result;
  }

  abstract install(install: Installer, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void>;
}