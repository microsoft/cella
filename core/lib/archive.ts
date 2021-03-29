/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from 'ee-ts';
import { Readable } from 'stream';
import { Entry, fromRandomAccessReader, RandomAccessReader, ZipFile } from 'yauzl';
import { ReadHandle } from './filesystem';
import { Session } from './session';
import { EnhancedReadable, enhanceReadable } from './streams';
import { Uri } from './uri';
import { PercentageScaler } from './util/percentage-scaler';

interface FileEntry {
  archiveUri: Uri;
  destination: Uri;
  path: string;
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
   * A regular expression to transform filenames during unpack.
   */
  transform?: string;
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
  readonly filePercentageScaler : PercentageScaler;
  constructor(public zipFile: ZipFile, public archiveUri: Uri, public outputUri: Uri, public options : OutputOptions) {
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

  async maybeUnpackEntry(entry: Entry, common: UnpackEntryCommon) : Promise<void> {
    const fileName = entry.fileName;
    const fileEntry = {
      archiveUri: common.archiveUri,
      path: fileName,
      destination: common.outputUri.join(fileName)
    };

    this.session.channels.debug(`unpacking ZIP ${common.archiveUri}/${fileName} => ${fileEntry.destination}`);

    const entriesRead = common.zipFile.entriesRead;
    const thisFilePercentageScaler = new PercentageScaler(
      0,
      100,
      common.filePercentageScaler.scalePosition(entriesRead - 1),
      common.filePercentageScaler.scalePosition(entriesRead)
    );

    this.progress(fileEntry, 0, thisFilePercentageScaler.lowestPercentage);
    if (fileName.length !== 0 && fileName[fileName.length - 1] !== '/') {
      const parentDirectory = fileEntry.destination.parent();
      await parentDirectory.createDirectory();
      const readStream = await enhanceReadable(await ZipUnpacker.openZipEntryDataStream(entry, common.zipFile), 0, entry.uncompressedSize, true);
      const writeStream = await fileEntry.destination.writeStream();
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
