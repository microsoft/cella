/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from 'ee-ts';
import { Session } from './session';
import { EnhancedReadable, EnhancedWritable } from './streams';
import { Uri } from './uri';


/**
 * The `FileStat`-type represents metadata about a file
 */
export interface FileStat {
  /**
   * The type of the file, e.g. is a regular file, a directory, or symbolic link
   * to a file.
   *
   * *Note:* This value might be a bitmask, e.g. `FileType.File | FileType.SymbolicLink`.
   */
  type: FileType;
  /**
   * The creation timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   */
  ctime: number;
  /**
   * The modification timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   *
   * *Note:* If the file changed, it is important to provide an updated `mtime` that advanced
   * from the previous value. Otherwise there may be optimizations in place that will not show
   * the updated file contents in an editor for example.
   */
  mtime: number;
  /**
   * The size in bytes.
   *
   * *Note:* If the file changed, it is important to provide an updated `size`. Otherwise there
   * may be optimizations in place that will not show the updated file contents in an editor for
   * example.
   */
  size: number;
}

/**
* Enumeration of file types. The types `File` and `Directory` can also be
* a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
* `FileType.Directory | FileType.SymbolicLink`.
*/
export enum FileType {
  /**
   * The file type is unknown.
   */
  Unknown = 0,
  /**
   * A regular file.
   */
  File = 1,
  /**
   * A directory.
   */
  Directory = 2,
  /**
   * A symbolic link to a file.
   */
  SymbolicLink = 64
}


export abstract class FileSystem extends EventEmitter<FileSystemEvents> {

  protected baseUri?: Uri;

  /**
 * Creates a new URI from a file system path, e.g. `c:\my\files`,
 * `/usr/home`, or `\\server\share\some\path`.
 *
 * associates this FileSystem with the Uri
 *
 * @param path A file system path (see `URI#fsPath`)
 */
  file(path: string): Uri {
    return Uri.file(this, path);
  }

  /** construct an Uri from the various parts */
  from(components: {
    scheme: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return Uri.from(this, components);
  }

  /**
 * Creates a new URI from a string, e.g. `http://www.msft.com/some/path`,
 * `file:///usr/home`, or `scheme:with/path`.
 *
 * @param value A string which represents an URI (see `URI#toString`).
 */
  parse(value: string, _strict?: boolean): Uri {
    return Uri.parse(this, value, _strict);
  }

  /**
   * Retrieve metadata about a file.
   *
   * @param uri The uri of the file to retrieve metadata about.
   * @return The file metadata about the file.
   */
  abstract stat(uri: Uri): Promise<FileStat>;

  /**
   * Retrieve all entries of a [directory](#FileType.Directory).
   *
   * @param uri The uri of the folder.
   * @return An array of name/type-tuples or a Promise that resolves to such.
   */
  abstract readDirectory(uri: Uri): Promise<Array<[Uri, FileType]>>;

  /**
   * Create a new directory (Note, that new files are created via `write`-calls).
   *
   * *Note* that missing directories are created automatically, e.g this call has
   * `mkdirp` semantics.
   *
   * @param uri The uri of the new folder.
   */
  abstract createDirectory(uri: Uri): Promise<void>;

  /**
   * Read the entire contents of a file.
   *
   * @param uri The uri of the file.
   * @return An array of bytes or a Promise that resolves to such.
   */
  abstract readFile(uri: Uri): Promise<Uint8Array>;

  /**
   * Creates a stream to read a file from the filesystem
   *
   * @param uri The uri of the file.
   * @return a Readable stream
   */
  abstract readStream(uri: Uri, start?: number, end?: number): Promise<AsyncIterable<Buffer> & EnhancedReadable>;

  /**
   * Write data to a file, replacing its entire contents.
   *
   * @param uri The uri of the file.
   * @param content The new content of the file.
   */
  abstract writeFile(uri: Uri, content: Uint8Array): Promise<void>;

  /**
   * Creates a stream to write a file to the filesystem
   *
   * @param uri The uri of the file.
   * @return a Writeable stream
   */
  abstract writeStream(uri: Uri): Promise<EnhancedWritable>;

  /**
   * Delete a file.
   *
   * @param uri The resource that is to be deleted.
   * @param options Defines if trash can should be used and if deletion of folders is recursive
   */
  abstract delete(uri: Uri, options?: { recursive?: boolean, useTrash?: boolean }): Promise<void>;

  /**
   * Rename a file or folder.
   *
   * @param oldUri The existing file.
   * @param newUri The new location.
   * @param options Defines if existing files should be overwritten.
   */
  abstract rename(source: Uri, target: Uri, options?: { overwrite?: boolean }): Promise<void>;

  /**
   * Copy files or folders.
   *
   * @param source The existing file.
   * @param destination The destination location.
   * @param options Defines if existing files should be overwritten.
   */
  abstract copy(source: Uri, target: Uri, options?: { overwrite?: boolean }): Promise<void>;

  /** checks to see if the target exists */
  async exists(uri: Uri) {
    try {
      return !!(await this.stat(uri));
    } catch {
      // if this fails, we're assuming false
    }
    return false;
  }

  /** checks to see if the target is a directory/folder */
  async isDirectory(uri: Uri) {
    try {
      return !!((await this.stat(uri)) && FileType.Directory);
    } catch {
      // if this fails, we're assuming false
    }
    return false;
  }

  /** checks to see if the target is a file */
  async isFile(uri: Uri) {
    try {
      return !!((await this.stat(uri)) && FileType.File);
    } catch {
      // if this fails, we're assuming false
    }
    return false;
  }

  /** checks to see if the target is a symbolic link */
  async isSymlink(uri: Uri) {
    try {
      return !!((await this.stat(uri)) && FileType.SymbolicLink);
    } catch {
      // if this fails, we're assuming false
    }
    return false;
  }


  constructor(protected session: Session) {
    super();

  }

  /** EventEmitter for when files are read */
  protected read(path: Uri, context?: any) {
    this.emit('read', path, context, this.session.stopwatch.total);
  }

  /** EventEmitter for when files are written */
  protected write(path: Uri, context?: any) {
    this.emit('write', path, context, this.session.stopwatch.total);
  }

  /** EventEmitter for when files are deleted */
  protected deleted(path: Uri, context?: any) {
    this.emit('deleted', path, context, this.session.stopwatch.total);
  }

  /** EventEmitter for when files are renamed */
  protected renamed(path: Uri, context?: any) {
    this.emit('renamed', path, context, this.session.stopwatch.total);
  }

  /** EventEmitter for when directories are read */
  protected directoryRead(path: Uri, contents?: Promise<Array<[Uri, FileType]>>) {
    this.emit('directoryRead', path, contents, this.session.stopwatch.total);
  }

  /** EventEmitter for when direcotries are created */
  protected directoryCreated(path: Uri, context?: any) {
    this.emit('directoryCreated', path, context, this.session.stopwatch.total);
  }
}


/** Event definitions for FileSystem events */
interface FileSystemEvents {
  read(path: Uri, context: any, msec: number): void;
  write(path: Uri, context: any, msec: number): void;
  deleted(path: Uri, context: any, msec: number): void;
  renamed(path: Uri, context: any, msec: number): void;
  directoryRead(path: Uri, contents: Promise<Array<[Uri, FileType]>> | undefined, msec: number): void;
  directoryCreated(path: Uri, context: any, msec: number): void;
}
