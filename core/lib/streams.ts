/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from 'ee-ts';
import { Readable, Writable } from 'stream';
import { Stopwatch } from './channels';
import { intersect } from './intersect';
import { PercentageScaler } from './util/percentage-scaler';

/** a Stream or a Promise to a Stream (and explicitly calling it an async iterable so it doesn't have to be recast later) */
export type ReadableStream = AsyncIterable<Buffer> & EnhancedReadable | Promise<AsyncIterable<Buffer> & EnhancedReadable>;

/**
 * Adds Event to Promise mapping to Readable streams
 * */
export class ReadableEvents extends EventEmitter<Progress> {
  progress = 0;
  /** @internal */
  public readonly stopwatch = new Stopwatch();
  /** @internal */
  private readonly scaler: PercentageScaler;
  /** @internal */
  constructor(private readable: Readable, public currentPosition: number, public expectedLength: number, public enforceExpectedLength: boolean = false) {
    super();
    this.scaler = new PercentageScaler(currentPosition, currentPosition + expectedLength);
    readable.on('data', (chunk) => {
      this.currentPosition += chunk.length;
      if (this.enforceExpectedLength && this.currentPosition > this.expectedLength) {
        this.readable.emit('error', new Error('bad length'));
      }

      this.progress = this.scaler.scalePosition(this.currentPosition);
      this.emit('progress', this.progress, this.currentPosition, this.stopwatch.total);
    });
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

  get done() {
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
  #finished = false;
  #closed = false;
  /** @internal */
  constructor(private writable: Writable) {
    this.writable.once('finish', () => {
      // force writable streams to be destroyed immediately after finishing.
      this.#finished = true;
      this.writable.destroy();
    });
    this.writable.once('close', () => {
      // force writable streams to be destroyed immediately after finishing.
      this.#closed = true;
      this.writable.destroy();
    });
  }

  get done() {
    // if it's already done, we resolve immediately
    if (this.#closed) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.writable.once('close', resolve);
      this.writable.once('error', reject);
    });
  }

  get closed() {
    // if it's already done, we resolve immediately
    if (this.#closed) {
      return Promise.resolve();
    }
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
    // if it's already done, we resolve immediately
    if (this.#finished) {
      return Promise.resolve();
    }
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

  on(event: 'close', listener: () => void): this;
  on(event: 'data', listener: (chunk: any) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'pause', listener: () => void): this;
  on(event: 'readable', listener: () => void): this;
  on(event: 'resume', listener: () => void): this;
  on(event: 'progress', callback: (progress: number, currentPosition: number, msec: number) => void): this;
  on(event: string | symbol, listener: (...args: Array<any>) => void): this;
}

export interface EnhancedWritable extends Writable {
  is: WritableEvents;
  writeAsync(chunk: Buffer): Promise<void>;
}

/** @internal */
export function enhanceReadable<T extends Readable>(readableStream: T, currentPosition = 0, expectedLength = 0, enforceExpectedLength = false): AsyncIterable<Buffer> & EnhancedReadable & T {
  if ((<any>readableStream).is) {
    return <AsyncIterable<Buffer> & EnhancedReadable & T>readableStream;
  }
  const is = new ReadableEvents(readableStream, currentPosition, expectedLength, enforceExpectedLength);
  return <AsyncIterable<Buffer> & EnhancedReadable & T>intersect({
    on: (event: string | symbol, listener: (...args: Array<any>) => void) => {
      switch (event) {
        case 'progress':
          is.on(event, listener);

          // we're going to emit one current progress event so that
          // they can be assured they get at least one progress message
          listener(is.progress, is.currentPosition, is.stopwatch.total);
          return;

        default:
          readableStream.on(event, listener);
      }
    },
    off: (event: string | symbol, listener: (...args: Array<any>) => void) => {
      switch (event) {
        case 'progress':
          is.off(event, listener);
          return;
        default:
          readableStream.off(event, listener);
      }
    },
    is,


  }, readableStream);
}

function writeAsync(this: Writable, chunk: Buffer): Promise<void> {
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
export function enhanceWritable<T extends Writable>(writableStream: Writable) {
  const result = <EnhancedWritable>writableStream;
  result.is = result.is || new WritableEvents(writableStream);
  if (!result.writeAsync) {
    result.writeAsync = writeAsync.bind(result);
  }
  return result;
}

export interface Progress {
  progress(percent: number, bytes: number, msec: number): void;
}
