/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { FileStat, FileSystem, FileType } from './filesystem';
import { i } from './i18n';
import { Dictionary } from './linq';
import { EnhancedReadable, EnhancedWritable } from './streams';
import { Uri } from './uri';

/**
 * gets the scheme off the front of an uri.
 * @param uri the uri to get the scheme for.
 * @returns the scheme, undefined if the uri has no scheme (colon)
 */
function schemeOf(uri: string) {
  strict.ok(uri, i`Uri may not be empty`);
  return /^(\w*):/.exec(uri)?.[1];
}

export class UnifiedFileSystem extends FileSystem {
  private filesystems: Dictionary<FileSystem> = {};

  /** registers a scheme to a given filesystem
   *
   * @param scheme the Uri scheme to reserve
   * @param fileSystem the filesystem to associate with the scheme
   */
  register(scheme: string | Array<string>, fileSystem: FileSystem) {
    if (Array.isArray(scheme)) {
      for (const each of scheme) {
        this.register(each, fileSystem);
      }
      return this;
    }
    strict.ok(!this.filesystems[scheme], i`scheme '${scheme}' already registered.`);
    this.filesystems[scheme] = fileSystem;
    return this;
  }

  /**
   * gets the filesystem for the given uri.
   *
   * @param uri the uri to check the filesystem for
   *
   * @returns the filesystem. Will throw if no filesystem is valid.
   */
  protected filesystem(uri: string | Uri) {
    const scheme = schemeOf(uri.toString());
    strict.ok(scheme, i`uri ${uri.toString()} has no scheme`);

    const filesystem = this.filesystems[scheme];
    strict.ok(filesystem, i`scheme ${scheme} has no filesystem associated with it`);

    return filesystem;
  }

  /**
  * Creates a new URI from a string, e.g. `http://www.msft.com/some/path`,
  * `file:///usr/home`, or `scheme:with/path`.
  *
  * @param uri A string which represents an URI (see `URI#toString`).
  */
  parse(uri: string, _strict?: boolean): Uri {
    return this.filesystem(uri).parse(uri);
  }

  stat(uri: Uri): Promise<FileStat> {
    return this.filesystem(uri).stat(uri);
  }

  async readDirectory(uri: Uri): Promise<Array<[Uri, FileType]>> {
    return this.filesystem(uri).readDirectory(uri);
  }

  createDirectory(uri: Uri): Promise<void> {
    return this.filesystem(uri).createDirectory(uri);
  }

  readFile(uri: Uri): Promise<Uint8Array> {
    return this.filesystem(uri).readFile(uri);
  }

  writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    return this.filesystem(uri).writeFile(uri, content);
  }

  readStream(uri: Uri, start = 0, end = Infinity): Promise<AsyncIterable<Buffer> & EnhancedReadable> {
    return this.filesystem(uri).readStream(uri, start, end);
  }

  writeStream(uri: Uri): Promise<EnhancedWritable> {
    return this.filesystem(uri).writeStream(uri);
  }

  delete(uri: Uri, options?: { recursive?: boolean | undefined; useTrash?: boolean | undefined; }): Promise<void> {
    return this.filesystem(uri).delete(uri, options);
  }

  rename(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    strict.ok(source.fileSystem === target.fileSystem, i`may not rename across filesystems`);
    return source.fileSystem.rename(source, target, options);
  }

  copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    return target.fileSystem.copy(source, target);
  }
}
