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
          yield this.wrapValue(each);
        }
      }
      if (isMap(n)) {
        yield this.wrapValue(<any>n);
      }
    }
  }
}
