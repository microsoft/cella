/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from 'ee-ts';
import { sed } from 'sed-lite';
import { Readable } from 'stream';
import { Entry, fromRandomAccessReader, RandomAccessReader, ZipFile } from 'yauzl';
import { ReadHandle } from './filesystem';
import { Session } from './session';
import { EnhancedReadable, enhanceReadable } from './streams';
import { Uri } from './uri';
import { PercentageScaler } from './util/percentage-scaler';

interface FileEntry {
  archiveUri: Uri;
  destination: Uri | undefined;
  path: string;
  extractPath: string | undefined;
}

/** The event definitions for for unpackers */
interface UnpackEvents {
  progress(entry: Readonly<FileEntry>, filePercentage: number, archivePercentage: number): void;
  unpacked(entry: Readonly<FileEntry>): void;
  error(entry: Readonly<FileEntry>, message: string): void;
}

/** Unpacker output options */
export interface OutputOptions {
  /**
   * Strip # directories from the path
   *
   * Typically used to remove excessive nested folders off the front of the paths in an archive.
  */
  strip?: number;

  /**
   * A regular expression to transform filenames during unpack. If the resulting file name is empty, it is not emitted.
   */
  transform?: string | string[];
}

/** Unpacker base class definition */
export abstract class Unpacker extends EventEmitter<UnpackEvents> {
  /* Event Emitters */

  /** EventEmitter: progress, at least once per file */
  protected progress(entry: Readonly<FileEntry>, filePercentage: number, archivePercentage: number): void {
    this.emit('progress', entry, filePercentage, archivePercentage);
  }


  /** EventEmitter: unpacked, emitted per file (not per archive)  */
  protected unpacked(entry: Readonly<FileEntry>) {
    this.emit('unpacked', entry);
  }

  abstract unpack(archiveUri: Uri, outputUri: Uri, options: OutputOptions): Promise<void>;

  private static isSlash(c: string): boolean {
    return c == '/' || c == '\\';
  }

  /**
 * Returns a new path string such that the path has prefixCount path elements removed.
 * If prefixCount is greater than the number of path elements in the path, undefined is returned.
 * @param prefixCount
 */
  public static stripPath(path: string, prefixCount: number): string | undefined {
    if (prefixCount == 0) {
      return path;
    }

    let first = 0;
    const last = path.length;
    // establish invariant that current character isn't a slash
    for (; ;) {
      if (first == last) {
        return undefined;
      }

      if (!this.isSlash(path[first])) {
        break;
      }

      ++first;
    }

    const firstNonSlash = first;
    // for each prefix to remove
    for (; prefixCount != 0; --prefixCount) {
      // skip over a block of not slashes
      for (; ;) {
        ++first;
        if (first == last) {
          return undefined;
        }
        if (this.isSlash(path[first])) {
          break;
        }
      }

      // then skip over a block of slashes
      for (; ;) {
        ++first;
        if (first == last) {
          return undefined;
        }
        if (!this.isSlash(path[first])) {
          break;
        }
      }
    }

    const leadingSlashes = path.slice(0, firstNonSlash);
    const trailingKept = path.slice(first, last);
    return leadingSlashes + trailingKept;
  }

  private static arrayIfy(value: string | string[] | undefined): string[] {
    if (Array.isArray(value)) {
      return value;
    } else if (value) {
      return [value];
    } else {
      return [];
    }
  }

  /**
 * Apply OutputOptions to a path before extraction.
 * @param entry The initial path to a file to unpack.
 * @param options Options to apply to that file name.
 * @returns If the file is to be emitted, the path to use; otherwise, undefined.
 */
  protected static implementOutputOptions(path: string, options: OutputOptions): string | undefined {
    if (options.strip) {
      const maybeStripped = Unpacker.stripPath(path, options.strip);
      if (maybeStripped) {
        path = maybeStripped;
      } else {
        return undefined;
      }
    }

    for (const transformExpr of Unpacker.arrayIfy(options.transform)) {
      if (!path) {
        break;
      }

      const sedTransformExpr = sed(transformExpr);
      path = sedTransformExpr(path);
    }

    return path;
  }
}

class YauzlRandomAccessAdapter extends RandomAccessReader {
  constructor(private readonly file: ReadHandle) {
    super();
  }

  _readStreamForRange(start: number, end: number): AsyncIterable<Buffer> & EnhancedReadable {
    if (end < 1) {
      throw 'invalid end';
    }

    // Note that yauzl uses halfopen ranges but node streams are closed, so we need to subtract
    // 1 from the end:
    if (end <= Number.MAX_SAFE_INTEGER) { // avoid -- on infinity
      --end;
    }

    return this.file.readStream(start, end);
  }

  read(buffer: Buffer, offset: number, length: number, position: number, callback: (err?: Error, bytesRead?: number) => void): void {
    this.file.read(buffer, offset, length, position).then(
      (buffer) => callback(undefined, buffer.bytesRead),
      callback
    );
  }

  close(callback: (err?: Error) => void): void {
    this.file.close().catch(callback);
  }
}

class UnpackEntryCommon {
  readonly filePercentageScaler: PercentageScaler;
  constructor(public zipFile: ZipFile, public archiveUri: Uri, public outputUri: Uri, public options: OutputOptions) {
    this.filePercentageScaler = new PercentageScaler(0, zipFile.entryCount);
  }
}

export class ZipUnpacker extends Unpacker {
  constructor(private readonly session: Session) {
    super();
  }

  private static openFromRandomAccessReader(adapter: YauzlRandomAccessAdapter, size: number): Promise<ZipFile> {
    return new Promise((resolve, reject) => {
      fromRandomAccessReader(adapter, size, { lazyEntries: true, autoClose: false, validateEntrySizes: false },
        (err?: Error | undefined, zipFile?: ZipFile | undefined) => {
          if (zipFile) {
            resolve(zipFile);
          } else {
            reject(err);
          }
        });
    });
  }

  private static openZipEntryDataStream(entry: Entry, zipFile: ZipFile): Promise<Readable> {
    return new Promise((resolve, reject) => {
      zipFile.openReadStream(entry, (err?: Error, stream?: Readable | undefined) => {
        if (stream) {
          resolve(stream);
        } else {
          reject(err);
        }
      });
    });
  }

  async maybeUnpackEntry(entry: Entry, common: UnpackEntryCommon): Promise<void> {
    const path = entry.fileName;
    let extractPath: string | undefined = path;
    if (extractPath.length === 0 || extractPath[extractPath.length - 1] === '/') {
      extractPath = undefined;
    }

    if (extractPath) {
      extractPath = Unpacker.implementOutputOptions(extractPath, common.options);
    }

    let destination: Uri | undefined = undefined;
    if (extractPath) {
      destination = common.outputUri.join(extractPath);
    }

    const fileEntry = {
      archiveUri: common.archiveUri,
      destination: destination,
      path: path,
      extractPath: extractPath
    };

    this.session.channels.debug(`unpacking ZIP ${common.archiveUri}/${path} => ${destination}`);

    const entriesRead = common.zipFile.entriesRead;
    const thisFilePercentageScaler = new PercentageScaler(
      0,
      100,
      common.filePercentageScaler.scalePosition(entriesRead - 1),
      common.filePercentageScaler.scalePosition(entriesRead)
    );

    this.progress(fileEntry, 0, thisFilePercentageScaler.lowestPercentage);
    if (destination) {
      const parentDirectory = destination.parent();
      await parentDirectory.createDirectory();
      const readStream = await enhanceReadable(await ZipUnpacker.openZipEntryDataStream(entry, common.zipFile), 0, entry.uncompressedSize, true);
      const writeStream = await destination.writeStream();
      readStream.on('progress', (filePercentage) =>
        this.progress(fileEntry, filePercentage, thisFilePercentageScaler.scalePosition(filePercentage)));
      readStream.pipe(writeStream);
      await readStream.is.done;
      await writeStream.is.done;
    }

    this.progress(fileEntry, 100, thisFilePercentageScaler.highestPercentage);
    this.unpacked(fileEntry);
  }

  async unpack(archiveUri: Uri, outputUri: Uri, options: OutputOptions): Promise<void> {
    this.session.channels.debug(`unpacking ZIP ${archiveUri} => ${outputUri}`);
    const openedFile = await archiveUri.openFile();
    const adapter = new YauzlRandomAccessAdapter(openedFile);
    const zipFile = await ZipUnpacker.openFromRandomAccessReader(adapter, await openedFile.size());
    const common = new UnpackEntryCommon(zipFile, archiveUri, outputUri, options);
    return new Promise<void>((resolve, reject) => {
      zipFile.on('entry', (entry: Entry) =>
        this.maybeUnpackEntry(entry, common)
          .then(() => zipFile.readEntry(), reject));
      zipFile.on('error', reject);
      zipFile.once('end', () => {
        zipFile.close();
        resolve();
      });
      zipFile.readEntry();
    });
  }
}
