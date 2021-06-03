import { strict } from 'assert';
import { AcquireEvents, AcquireOptions } from '../acquire';
import { OutputOptions, UnpackEvents } from '../archive';
import { Artifact } from '../artifact';
import { Installer, ResourceLocation, UnpackSettings, Verifiable } from '../metadata-format';
import { Session } from '../session';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export abstract class InstallerImpl {
  constructor(protected session: Session, protected artifact: Artifact, protected installInfo: Installer) {
  }

  protected static locations(from: ResourceLocation) {
    const result = from ? (typeof from === 'string' ? [from] : [...from]) : [];
    strict.ok(result, 'Installer - missing locations');
    return result;
  }

  abstract install(install: Installer, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void>;

  protected static applyAcquireOptions(options?: AcquireOptions, install?: Verifiable): AcquireOptions | undefined {
    if (install) {
      if (install.sha256) {
        return {...options, algorithm: 'sha256', value: install.sha256};
      }

      if (install.md5) {
        return {...options, algorithm: 'md5', value: install.md5};
      }
    }

    return options;
  }

  protected static applyUnpackOptions(install: UnpackSettings) : OutputOptions {
    return {strip: install.strip, transform: install.transform ? [...install.transform] : undefined };
  }
}
