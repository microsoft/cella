/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from 'ee-ts';
import { sed } from 'sed-lite';
import { pipeline as origPipeline, Readable, Transform } from 'stream';
import { extract as tarExtract, Headers } from 'tar-stream';
import { promisify } from 'util';
import { Entry as ZipEntry, fromRandomAccessReader as yauzlFromRandomAccessReader, RandomAccessReader as YauzlRandomAccessReader, ZipFile } from 'yauzl';
import { createGunzip } from 'zlib';
import { ReadHandle } from './filesystem';
import { Session } from './session';
import { ProgressTrackingStream } from './streams';
import { Uri } from './uri';
import { PercentageScaler } from './util/percentage-scaler';

const pipeline = promisify(origPipeline);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bz2 = require('unbzip2-stream');

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
  transform?: Array<string>;
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

  /**
 * Returns a new path string such that the path has prefixCount path elements removed, and directory
 * separators normalized to a single forward slash.
 * If prefixCount is greater than or equal to the number of path elements in the path, undefined is returned.
 */
  public static stripPath(path: string, prefixCount: number): string | undefined {
    const elements = path.split(/[\\/]+/);
    const hasLeadingSlash = elements.length !== 0 && elements[0].length === 0;
    const hasTrailingSlash = elements.length !== 0 && elements[elements.length - 1].length === 0;
    let countForUndefined = prefixCount;
    if (hasLeadingSlash) {
      ++countForUndefined;
    }

    if (hasTrailingSlash) {
      ++countForUndefined;
    }

    if (elements.length <= countForUndefined) {
      return undefined;
    }

    if (hasLeadingSlash) {
      return '/' + elements.splice(prefixCount + 1).join('/');
    }

    return elements.splice(prefixCount).join('/');
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

    if (options.transform) {
      for (const transformExpr of options.transform) {
        if (!path) {
          break;
        }

        const sedTransformExpr = sed(transformExpr);
        path = sedTransformExpr(path);
      }
    }

    return path;
  }
}

class YauzlRandomAccessAdapter extends YauzlRandomAccessReader {
  constructor(private readonly file: ReadHandle) {
    super();
  }

  _readStreamForRange(start: number, end: number): Readable {
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

interface UnpackEntryCommon {
  filePercentageScaler: PercentageScaler;
  zipFile: ZipFile;
  archiveUri: Uri;
  outputUri: Uri;
  options: OutputOptions;
}

export class ZipUnpacker extends Unpacker {
  constructor(private readonly session: Session) {
    super();
  }

  private static openFromRandomAccessReader(adapter: YauzlRandomAccessAdapter, size: number): Promise<ZipFile> {
    return new Promise((resolve, reject) => {
      // validateEntrySizes is set to false to workaround https://github.com/thejoshwolfe/yauzl/pull/123
      yauzlFromRandomAccessReader(adapter, size, { lazyEntries: true, autoClose: false, validateEntrySizes: false },
        (err?: Error | undefined, zipFile?: ZipFile | undefined) => {
          if (zipFile) {
            resolve(zipFile);
          } else {
            reject(err);
          }
        });
    });
  }

  private static openZipEntryDataStream(entry: ZipEntry, zipFile: ZipFile): Promise<Readable> {
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

  private static dosDateTimeToDateUTC(date: number, time: number): Date {
    // https://github.com/thejoshwolfe/yauzl/blob/96f0eb552c560632a754ae0e1701a7edacbda389/index.js#L594
    // except using Date.UTC
    var day = date & 0x1f; // 1-31
    var month = (date >> 5 & 0xf) - 1; // 1-12, 0-11
    var year = (date >> 9 & 0x7f) + 1980; // 0-128, 1980-2108

    var millisecond = 0;
    var second = (time & 0x1f) * 2; // 0-29, 0-58 (even numbers)
    var minute = time >> 5 & 0x3f; // 0-59
    var hour = time >> 11 & 0x1f; // 0-23

    return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
  }

  async maybeUnpackEntry(entry: ZipEntry, common: UnpackEntryCommon): Promise<void> {
    const path = entry.fileName;
    let extractPath = !path || path.endsWith('/') ? undefined : path;

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
      const readStream = await ZipUnpacker.openZipEntryDataStream(entry, common.zipFile);
      const progressStream = new ProgressTrackingStream(0, entry.uncompressedSize);
      progressStream.on('progress', (filePercentage) =>
        this.progress(fileEntry, filePercentage, thisFilePercentageScaler.scalePosition(filePercentage)));
      const writeStream = await destination.writeStream({
        mtime: ZipUnpacker.dosDateTimeToDateUTC(entry.lastModFileDate, entry.lastModFileTime)
      });
      await pipeline(readStream, progressStream, writeStream);
    }

    this.progress(fileEntry, 100, thisFilePercentageScaler.highestPercentage);
    this.unpacked(fileEntry);
  }

  async unpack(archiveUri: Uri, outputUri: Uri, options: OutputOptions): Promise<void> {
    this.session.channels.debug(`unpacking ZIP ${archiveUri} => ${outputUri}`);
    const openedFile = await archiveUri.openFile();
    const adapter = new YauzlRandomAccessAdapter(openedFile);
    const zipFile = await ZipUnpacker.openFromRandomAccessReader(adapter, await openedFile.size());
    const common = { zipFile, archiveUri, outputUri, options, filePercentageScaler: new PercentageScaler(0, zipFile.entryCount) };
    return new Promise<void>((resolve, reject) => {
      zipFile.on('entry', (entry: ZipEntry) =>
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

abstract class BasicTarUnpacker extends Unpacker {
  constructor(protected readonly session: Session) {
    super();
  }

  async maybeUnpackEntry(archiveUri: Uri, outputUri: Uri, options: OutputOptions, archiveProgress: ProgressTrackingStream, header: Headers, stream: Readable): Promise<void> {
    const streamPromise = new Promise((accept, reject) => {
      stream.on('end', accept);
      stream.on('error', reject);
    });

    try {
      if (header?.type !== 'file') {
        this.session.channels.debug(`in ${archiveUri} skipping ${header.name} because it is a ${header?.type}`);
        return;
      }

      const extractPath = Unpacker.implementOutputOptions(header.name, options);
      let destination: Uri | undefined = undefined;
      if (extractPath) {
        destination = outputUri.join(extractPath);
      }

      const fileEntry = {
        archiveUri: archiveUri,
        destination: destination,
        path: header.name,
        extractPath: extractPath
      };

      this.session.channels.debug(`unpacking TAR ${archiveUri}/${header.name} => ${destination}`);
      this.progress(fileEntry, 0, archiveProgress.currentPercentage);
      if (destination && header.size) {
        const parentDirectory = destination.parent();
        await parentDirectory.createDirectory();
        const fileProgress = new ProgressTrackingStream(0, header.size);
        fileProgress.on('progress', (filePercentage) => this.progress(fileEntry, filePercentage, archiveProgress.currentPercentage));
        const writeStream = await destination.writeStream({ mtime: header.mtime, mode: header.mode });
        await pipeline(stream, fileProgress, writeStream);
      }

      this.progress(fileEntry, 100, archiveProgress.currentPercentage);
      this.unpacked(fileEntry);
    } finally {
      stream.resume();
      await streamPromise;
    }
  }

  protected async unpackTar(archiveUri: Uri, outputUri: Uri, options: OutputOptions, decompressor?: Transform): Promise<void> {
    const archiveSize = await archiveUri.size();
    const archiveFileStream = await archiveUri.readStream(0, archiveSize);
    const archiveProgress = new ProgressTrackingStream(0, archiveSize);
    const tarExtractor = tarExtract();
    tarExtractor.on('entry', (header, stream, next) =>
      this.maybeUnpackEntry(archiveUri, outputUri, options, archiveProgress, header, stream)
        .then(next, (err) => (<any>next)(err)));
    if (decompressor) {
      await pipeline(archiveFileStream, archiveProgress, decompressor, tarExtractor);
    } else {
      await pipeline(archiveFileStream, archiveProgress, tarExtractor);
    }
  }
}

export class TarUnpacker extends BasicTarUnpacker {
  unpack(archiveUri: Uri, outputUri: Uri, options: OutputOptions): Promise<void> {
    this.session.channels.debug(`unpacking TAR ${archiveUri} => ${outputUri}`);
    return this.unpackTar(archiveUri, outputUri, options);
  }
}

export class TarGzUnpacker extends BasicTarUnpacker {
  unpack(archiveUri: Uri, outputUri: Uri, options: OutputOptions): Promise<void> {
    this.session.channels.debug(`unpacking TAR.GZ ${archiveUri} => ${outputUri}`);
    return this.unpackTar(archiveUri, outputUri, options, createGunzip());
  }
}

export class TarBzUnpacker extends BasicTarUnpacker {
  unpack(archiveUri: Uri, outputUri: Uri, options: OutputOptions): Promise<void> {
    this.session.channels.debug(`unpacking TAR.BZ2 ${archiveUri} => ${outputUri}`);
    return this.unpackTar(archiveUri, outputUri, options, bz2());
  }
}
