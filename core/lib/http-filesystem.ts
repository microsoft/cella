/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileStat, FileSystem, FileType } from './filesystem';
import { get, getStream, head } from './https';
import { EnhancedReadable, EnhancedWritable, enhanceReadable } from './streams';
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
      size: Number.parseInt(result.headers['content-length'] || '0')
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
  copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async readStream(uri: Uri, options?: { start?: number, end?: number }): Promise<AsyncIterable<Buffer> & EnhancedReadable> {
    return enhanceReadable(getStream(uri, options), options?.start, options?.end);
  }
  writeStream(uri: Uri): Promise<EnhancedWritable> {
    throw new Error('Method not implemented.');
  }
}
