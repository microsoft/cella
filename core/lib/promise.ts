/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
