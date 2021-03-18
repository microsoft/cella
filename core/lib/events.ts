/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter as eventemitter } from 'ee-ts';
import { EventEmitter } from 'events';
import { Stream } from 'stream';
import { promisify } from 'util';


/**
 * Creates a promise that resolves after a delay
 *
 * @param delayMS the length of time to delay in milliseconds.
 */
export function Delay(delayMS: number): Promise<void> {
  return new Promise<void>(res => setTimeout(res, delayMS));
}

export type Emitter<T extends (EventEmitter | eventemitter)> = Pick<T, 'on' | 'off'>;

export class EventForwarder<UnionOfEmiters extends (EventEmitter | eventemitter)> implements Emitter<UnionOfEmiters> {
  #emitters = new Array<UnionOfEmiters>();
  #subscriptions = new Array<[string, any]>();

  /** @internal */
  register(emitter: UnionOfEmiters) {
    for (const [event, listener] of this.#subscriptions) {
      emitter.on(event, listener);
    }
    this.#emitters.push(emitter);
  }

  on(event: any, listener: any) {
    this.#subscriptions.push([event, listener]);
    for (const emitter of this.#emitters) {
      emitter.on(event, listener);
    }
    return <any>this;
  }

  off(event: any, listener: any) {
    for (const emitter of this.#emitters) {
      emitter.off(event, listener);
    }
    return <any>this;
  }
}


export function async(eventEmitter: EventEmitter, event: string | symbol) {
  return promisify(eventEmitter.once)(event);
}

export function completed(stream: Stream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.once('end', resolve);
    stream.once('error', reject);
  });
}
