// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isMap, isSeq, YAMLMap, YAMLSeq } from 'yaml';
import { Sequence } from './Sequence';

/**
 * Our sequences accept either a value or an array of values.
 *
 * This type wraps the behavior to support that for sequence of object values;
 */

export abstract class ObjectSequence<TElement> extends Sequence<TElement, YAMLSeq | YAMLMap> {
  protected create() {
    return new YAMLSeq();
  }

  protected isValidNode(value: any): value is YAMLSeq | YAMLMap {
    return isSeq(value) || isMap(value);
  }

  *[Symbol.iterator](): Iterator<TElement> {
    if (this.isCreated) {
      const n = this.selfNode;
      if (isSeq(n)) {
        for (const each of n.items) {
          const v = this.wrapValue(each);
          if (v) {
            yield v;
          }
        }
      }
      if (isMap(n)) {
        const v = this.wrapValue(<any>n);
        if (v) {
          yield v;
        }

      }
    }
  }
}
