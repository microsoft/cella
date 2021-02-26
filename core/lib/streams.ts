/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Readable, Writable } from 'stream';

/**
 * Adds Event to Promise mapping to Readable streams
 * */
export class ReadableEvents {
  /** @internal */
  constructor(private readable: Readable) {

  }

  get closed() {
    return new Promise<void>((resolve, reject) => {
      this.readable.once('close', resolve);
      this.readable.once('error', reject);
    });
  }

  get data() {
    return new Promise<Buffer>((resolve, reject) => {
      this.readable.once('data', resolve);
      this.readable.once('end', () => resolve(Buffer.from([])));
      this.readable.once('error', reject);
    });
  }

  get ended() {
    return new Promise<void>((resolve, reject) => {
      this.readable.once('end', resolve);
      this.readable.once('error', reject);
    });
  }

  get readyToRead() {
    return new Promise<void>((resolve, reject) => {
      this.readable.once('readable', resolve);
      this.readable.once('error', reject);
    });
  }

}

/**
 * Adds Event to Promise mapping to Writeable streams
 * */

export class WritableEvents {
  /** @internal */
  constructor(private writable: Writable) {

  }

  get closed() {
    return new Promise<void>((resolve, reject) => {
      this.writable.once('close', resolve);
      this.writable.once('error', reject);
    });
  }
  get drained() {
    return new Promise<void>((resolve, reject) => {
      this.writable.once('drain', resolve);
      this.writable.once('error', reject);
    });
  }
  get finished() {
    return new Promise<void>((resolve, reject) => {
      this.writable.once('finish', resolve);
      this.writable.once('error', reject);
    });
  }
  get piped() {
    return new Promise<Readable>((resolve, reject) => {
      this.writable.once('pipe', resolve);
      this.writable.once('error', reject);
    });
  }
  get unpiped() {
    return new Promise<Readable>((resolve, reject) => {
      this.writable.once('unpiped', resolve);
      this.writable.once('error', reject);
    });
  }
}

export interface EnhancedReadable extends Readable {
  is: ReadableEvents;
}

export interface EnhancedWritable extends Writable {
  is: WritableEvents;
  writeTo(chunk: Buffer): Promise<void>;
}

/** @internal */
export function enhanceReadable(readableStream: Readable) {
  const result = <AsyncIterable<Buffer> & EnhancedReadable>readableStream;
  result.is = result.is || new ReadableEvents(readableStream);
  return result;
}

function writeTo(this: Writable, chunk: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.write(chunk, (error: Error | null | undefined) => {
      // callback gave us an error.
      if (error) {
        reject(error);
      }
    })) {
      // returned true, we're good to go.
      resolve();
    } else {
      // returned false
      // we were told to wait for it to drain.
      this.once('drain', resolve);
      this.once('error', reject);
    }
  });
}

/** @internal */
export function enhanceWritable(writableStream: Writable) {
  const result = <EnhancedWritable>writableStream;
  result.is = result.is || new WritableEvents(writableStream);
  if (!result.writeTo) {
    result.writeTo = writeTo.bind(result);
  }
  return result;
}