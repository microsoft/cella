/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { Checksum, hash } from './checksum';
import { Session } from './session';
import { Uri } from './uri';


export class Cache {
  baseFolder: Uri;

  /**@internal  */
  constructor(private session: Session) {
    this.baseFolder = session.cellaHome.join('cache');
  }

  private toUri(filename: string | Uri) {
    return typeof filename === 'string' ? this.baseFolder.join(filename) : filename;
  }

  async exists(filename: string | Uri) {
    return this.session.fileSystem.exists(this.toUri(filename));
  }

  async delete(filename: string | Uri) {
    filename = this.toUri(filename);
    if (await this.exists(filename)) {
      await this.session.fileSystem.delete(filename);
    }
  }

  async match(filename: string | Uri, matchOptions?: Checksum) {
    filename = this.toUri(filename);
    if (await this.exists(filename)) {
      return matchOptions?.algorithm && matchOptions?.checksum?.toLowerCase() === await hash(await this.session.fileSystem.readStream(filename));
    }
    return false;
  }

  async size(filename: string | Uri) {
    filename = this.toUri(filename);
    try {
      if (this.exists(filename)) {
        return (await this.session.fileSystem.stat(filename)).size;
      }
    } catch {
      // not able to get the size. maybe not there.
    }
    return 0;
  }

  async readBlock(filename: string | Uri, start = 0, end = Infinity) {
    filename = this.toUri(filename);
    const s = await this.session.fileSystem.readStream(filename, start, end);

    let block = Buffer.alloc(0);
    for await (const chunk of s) {
      block = Buffer.concat([block, chunk]);
    }

    return block;
  }

}