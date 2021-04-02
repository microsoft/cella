/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { close, createReadStream, createWriteStream, futimes, open as openFd, Stats } from 'fs';
import { FileHandle, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable, Writable } from 'stream';
import { promisify } from 'util';
import { delay } from './events';
import { FileStat, FileSystem, FileType, ReadHandle, WriteStreamOptions } from './filesystem';
import { i } from './i18n';
import { Uri } from './uri';

function getFileType(stats: Stats) {
  return FileType.Unknown |
    (stats.isDirectory() ? FileType.Directory : 0) |
    (stats.isFile() ? FileType.File : 0) |
    (stats.isSymbolicLink() ? FileType.SymbolicLink : 0);
}

class LocalFileStats implements FileStat {
  constructor(private stats: Stats) {
    strict.ok(stats, i`stats may not be undefined`);
  }
  get type() {
    return getFileType(this.stats);
  }
  get ctime() {
    return this.stats.ctimeMs;
  }
  get mtime() {
    return this.stats.mtimeMs;
  }
  get size() {
    return this.stats.size;
  }
}


/**
 * Implementation of the Local File System
 *
 * This is used to handle the access to the local disks.
 */
export class LocalFileSystem extends FileSystem {
  async stat(uri: Uri): Promise<FileStat> {
    const path = uri.fsPath;
    const s = await stat(path);
    return new LocalFileStats(s);
  }

  async readDirectory(uri: Uri): Promise<Array<[Uri, FileType]>> {
    let retval!: Promise<Array<[Uri, FileType]>>;
    try {
      const folder = uri.fsPath;
      const items = (await readdir(folder)).map(async each => {
        const path = uri.join(each);
        return <[Uri, FileType]>[uri.fileSystem.file(join(folder, each)), getFileType(await stat(path.fsPath))];
      });
      return retval = Promise.all(items);
    } finally {
      // log that.
      this.directoryRead(uri, retval);
    }
  }

  async createDirectory(uri: Uri): Promise<void> {
    await mkdir(uri.fsPath, { recursive: true });
    this.directoryCreated(uri);
  }

  readFile(uri: Uri): Promise<Uint8Array> {
    let contents!: Promise<Uint8Array>;
    try {
      return contents = readFile(uri.fsPath);
    } finally {
      this.read(uri, contents);
    }
  }

  writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    try {
      return writeFile(uri.fsPath, content);
    } finally {
      this.write(uri, content);
    }
  }

  async delete(uri: Uri, options?: { recursive?: boolean | undefined; useTrash?: boolean | undefined; }): Promise<void> {
    try {
      options = options || { recursive: false };
      await rm(uri.fsPath, { recursive: options.recursive, force: true, maxRetries: 3, retryDelay: 20 });
      // todo: Hack -- on windows, when something is used and then deleted, the delete might not actually finish
      // before the Promise is resolved. Adding a delay fixes this (but probably is an underlying node bug)
      await delay(50);
      return;
    } finally {
      this.deleted(uri);
    }
  }

  rename(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    try {
      strict.equal(source.fileSystem, target.fileSystem, i`Cannot rename files across filesystems`);
      return rename(source.fsPath, target.fsPath);
    } finally {
      this.renamed(source, { target, options });
    }
  }

  async copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    // if (source.fileSystem === target.fileSystem) {
    //  options = options || {};
    //  return await copyFile(source.fsPath, target.fsPath, options.overwrite ? 0 : constants.COPYFILE_EXCL);
    // }

    throw new Error('cross filesystem copynot implemented yet.');
  }

  readStream(uri: Uri, options?: { start?: number, end?: number }): Promise<Readable> {
    this.read(uri);
    return Promise.resolve(createReadStream(uri.fsPath, options));
  }

  async writeStream(uri: Uri, options?: WriteStreamOptions): Promise<Writable> {
    this.write(uri);
    const flags = options?.append ? 'a' : 'w';
    let theFd : number | undefined;
    theFd = await promisify(openFd)(uri.fsPath, flags, options?.mode ?? 0o666);
    try {
      if (options?.mtime) {
        const mtime = options.mtime;
        await promisify(futimes)(theFd, new Date(), mtime);
      }

      const rawWriteStream = createWriteStream(uri.fsPath, { flags, autoClose: true, fd: theFd });
      theFd = undefined;
      return rawWriteStream;
    } finally {
      if (theFd) {
        await promisify(close)(theFd);
      }
    }
  }

  async openFile(uri: Uri): Promise<ReadHandle> {
    return new LocalReadHandle(await open(uri.fsPath, 'r'));
  }
}

class LocalReadHandle extends ReadHandle {
  constructor(private handle: FileHandle) {
    super();
  }

  read<TBuffer extends Uint8Array>(buffer: TBuffer, offset?: number | null, length?: number | null, position?: number | null): Promise<{ bytesRead: number; buffer: TBuffer; }> {
    return this.handle.read(buffer, offset, length, position);
  }

  async size(): Promise<number> {
    const stat = await this.handle.stat();
    return stat.size;
  }

  async close() {
    return this.handle.close();
  }
}
