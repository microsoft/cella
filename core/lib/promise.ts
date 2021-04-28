/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ManualPromise } from './manual-promise';

/** a precrafted failed Promise */
const waiting = Promise.reject(0xDEFACED);
waiting.catch(() => { /** */ });

/**
 * Does a Promise.any(), and accept the one that first matches the predicate, or if all resolve, and none match, the first.
 *
 * @remarks WARNING - this requires Node 15+ or node 14.12+ with --harmony
 * @param from
 * @param predicate
 */
export async function anyWhere<T>(from: Iterable<Promise<T>>, predicate: (value: T) => boolean) {
  let unfulfilled = new Array<Promise<T>>();
  const failed = new Array<Promise<T>>();
  const completed = new Array<T>();

  // wait for something to succeed. if nothing suceeds, then this will throw.
  const first = await Promise.any(from);
  let success: T | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {

    //
    for (const each of from) {
      // if we had a winner, return now.
      await Promise.any([each, waiting]).then(antecedent => {
        if (predicate(antecedent)) {
          success = antecedent;
          return antecedent;
        }
        completed.push(antecedent);
        return undefined;
      }).catch(r => {
        if (r === 0xDEFACED) {
          // it's not done yet.
          unfulfilled.push(each);
        } else {
          // oh, it returned and it was a failure.
          failed.push(each);
        }
        return undefined;
      });
    }
    // we found one that passes muster!
    if (success) {
      return success;
    }

    if (unfulfilled.length) {
      // something completed successfully, but nothing passed the predicate yet.
      // so hope remains eternal, lets rerun whats left with the unfulfilled.
      from = unfulfilled;
      unfulfilled = [];
      continue;
    }

    // they all finished
    // but nothing hit the happy path.
    break;
  }

  // if we get here, then we're
  // everything completed, but nothing passed the predicate
  // give them the first to suceed
  return first;
}


export class Queue {
  private total = 0;
  private active = 0;
  private tail: Promise<any> | undefined;
  private whenZero: ManualPromise<number> | undefined;
  private rejections = new Array<any>();
  private resolves = new Array<any>();

  constructor(private maxConcurency = 8) {
  }

  get count() {
    return this.total;
  }

  get done() {
    return this.zero();
  }

  /** Will block until the queue hits the zero mark */
  private async zero(): Promise<number> {
    if (this.active) {
      this.whenZero = this.whenZero || new ManualPromise<number>();
      await this.whenZero;
    }
    if (this.rejections.length > 0) {
      throw new AggregateError(this.rejections);
    }
    this.whenZero = undefined;
    return this.total;
  }

  /**
   * Queues up actions for throttling the number of concurrent async tasks running at a given time.
   *
   * If the process has reached max concurrency, the action is deferred until the last item
   * The last item
   * @param action
   */
  enqueue<T>(action: () => Promise<T>): Promise<T> {
    this.active++;
    this.total++;

    if (this.active < this.maxConcurency) {
      this.tail = action().catch(async (e) => { this.rejections.push(e); throw e; });
      this.tail.finally(() => (--this.active) || this.whenZero?.resolve(0));
      return this.tail;
    }

    const result = new ManualPromise<T>();
    this.tail!.finally(() => {
      this.tail = action().then(r => { result.resolve(r); }, e => { result.reject(e); this.rejections.push(e); });
      this.tail.finally(() => (--this.active) || this.whenZero?.resolve(0));
    });

    return result;
  }

  enqueueMany<S, T>(array: Array<S>, fn: (v: S) => Promise<T>) {
    for (const each of array) {
      this.active++;
      this.total++;

      if (this.active < this.maxConcurency) {
        this.tail = fn(each);
        this.tail.finally(() => (--this.active) || this.whenZero?.resolve(0));
        continue;
      }

      const result = new ManualPromise<T>();
      this.tail!.finally(() => {
        this.tail = fn(each).then(r => { result.resolve(r); }, e => result.reject(e));
        this.tail.finally(() => (--this.active) || this.whenZero?.resolve(0));
      });

      continue;
    }
    return this;
  }
}

