/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Readable, Writable } from 'stream';
import { FileStat, FileSystem, FileType, ReadHandle } from './filesystem';
import { get, getStream, head } from './https';
import { Uri } from './uri';

/**
 * HTTP/HTTPS Filesystem
 *
 */
export class HttpFileSystem extends FileSystem {

  async stat(uri: Uri): Promise<FileStat> {
    const result = await head(uri);

    return {
      type: FileType.File,
      mtime: Date.parse(result.headers.date || ''),
      ctime: Date.parse(result.headers.date || ''),
      size: Number.parseInt(result.headers['content-length'] || '0'),
      mode: 0o555 // http is read only but always 'executable'
    };
  }
  readDirectory(uri: Uri): Promise<Array<[Uri, FileType]>> {
    throw new Error('Method not implemented.');
  }
  createDirectory(uri: Uri): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async readFile(uri: Uri): Promise<Uint8Array> {
    return (await get(uri)).rawBody;
  }
  writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.');
  }
  delete(uri: Uri, options?: { recursive?: boolean | undefined; useTrash?: boolean | undefined; }): Promise<void> {
    throw new Error('Method not implemented.');
  }
  rename(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    throw new Error('Method not implemented.');
  }
  copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<number> {
    throw new Error('Method not implemented.');
  }
  async readStream(uri: Uri, options?: { start?: number, end?: number }): Promise<Readable> {
    return getStream(uri, options);
  }
  writeStream(uri: Uri): Promise<Writable> {
    throw new Error('Method not implemented.');
  }

  openFile(uri: Uri): Promise<ReadHandle> {
    throw new Error('Method not implemented.');
  }

}
