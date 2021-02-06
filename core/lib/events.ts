import { EventEmitter } from 'events';
import { Stream } from 'stream';
import { promisify } from 'util';


export function async(eventEmitter: EventEmitter, event: string | symbol) {
  return promisify(eventEmitter.once)(event);
}

export function completed(stream: Stream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.once('end', resolve);
    stream.once('error', reject);
  });
}
