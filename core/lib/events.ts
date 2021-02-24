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


export function async(eventEmitter: EventEmitter, event: string | symbol) {
  return promisify(eventEmitter.once)(event);
}

export function completed(stream: Stream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.once('end', resolve);
    stream.once('error', reject);
  });
}
