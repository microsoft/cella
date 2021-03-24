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

interface FileEntry {
  archiveUri: Uri;
  destination: Uri;
  path: string;
}

/** The event definitions for for unpackers */
interface UnpackEvents {
  progress(entry: Readonly<FileEntry>, percentage: number): void;
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
  protected progress(entry: Readonly<FileEntry>, percentage: number): void {
    this.emit('progress', entry, percentage);
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
      (reason) => callback(reason)
    );
  }

  close(callback: (err?: Error) => void): void {
    this.file.close()
      .then(() => callback(), (reason) => callback(reason));
  }
}

export class ZipUnpacker extends Unpacker {
  constructor(private readonly session: Session) {
    super();
  }

  private openFromRandomAccessReader(adapter: YauzlRandomAccessAdapter, size: number): Promise<ZipFile> {
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

  private openReadStream(entry: Entry, zipFile: ZipFile): Promise<Readable> {
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

  async maybeUnpackEntry(entry: Entry, zipFile: ZipFile, archiveUri: Uri, outputUri: Uri, options: OutputOptions) : Promise<void> {
    const fileName = entry.fileName;
    if (fileName.length === 0 || fileName[fileName.length - 1] === '/') {
      // skip directories or empty filenames
      return;
    }

    const fileEntry = {
      archiveUri: archiveUri,
      path: fileName,
      destination: outputUri.join(fileName)
    };

    this.session.channels.debug(`unpacking ZIP ${archiveUri}/${fileName} => ${fileEntry.destination}`);
    this.progress(fileEntry, 0);
    const parentDirectory = fileEntry.destination.parent();
    await parentDirectory.createDirectory();
    const readStream = await enhanceReadable(await this.openReadStream(entry, zipFile), 0, entry.uncompressedSize, true);
    const writeStream = await fileEntry.destination.writeStream();
    readStream.on('progress', (percent) => this.progress(fileEntry, percent));
    readStream.pipe(writeStream);
    await readStream.is.done;
    readStream.unpipe(writeStream);
    writeStream.end();
    this.progress(fileEntry, 100);
    this.unpacked(fileEntry);
  }

  async unpack(archiveUri: Uri, outputUri: Uri, options: OutputOptions): Promise<void> {
    this.session.channels.debug(`unpacking ZIP ${archiveUri} => ${outputUri}`);
    const openedFile = await archiveUri.openFile();
    const adapter = new YauzlRandomAccessAdapter(openedFile);
    const zipFile = await this.openFromRandomAccessReader(adapter, await openedFile.size());
    return new Promise<void>((resolve, reject) => {
      zipFile.on('entry', (entry: Entry) =>
        this.maybeUnpackEntry(entry, zipFile, archiveUri, outputUri, options)
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
