/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import EventEmitter = require('events');
import { Transform, TransformCallback } from 'stream';
import { Stopwatch } from './channels';
import { PercentageScaler } from './util/percentage-scaler';

export interface Progress {
  progress(percent: number, bytes: number, msec: number): void;
}

export interface ProgressTrackingEvents extends EventEmitter {
  on(event: 'progress', callback: (progress: number, currentPosition: number, msec: number) => void): this;
}

export class ProgressTrackingStream extends Transform implements ProgressTrackingEvents {
  private readonly stopwatch = new Stopwatch;
  private readonly scaler: PercentageScaler;
  private currentPosition: number;

  constructor(start: number, end: number) {
    super();
    this.scaler = new PercentageScaler(start, end);
    this.currentPosition = start;
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    if (<string>encoding !== 'buffer') {
      return callback(new Error('unexpected chunk type'));
    }

    const chunkBuffer = <Buffer>chunk;
    this.currentPosition += chunkBuffer.byteLength;
    this.emit('progress', this.scaler.scalePosition(this.currentPosition), this.currentPosition, this.stopwatch.total);
    return callback(null, chunk);
  }
}
