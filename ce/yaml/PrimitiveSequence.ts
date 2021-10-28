// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isScalar, isSeq, Scalar, YAMLSeq } from 'yaml';
import { isPrimitive } from '../util/checks';
import { Sequence } from './Sequence';

/**
 * Our sequences accept either a value or an array of values.
 *
 * This type wraps the behavior to support that for sequence of primitive values;
 */
export class PrimitiveSequence<TElement extends string | boolean | number = string> extends Sequence<TElement, YAMLSeq | Scalar> {
  protected create() {
    return new YAMLSeq();
  }

  protected isValidNode(value: any): value is YAMLSeq | Scalar {
    return isSeq(value) || isScalar(value);
  }
  protected wrapValue(value: any | unknown): TElement {
    return value.value === undefined ? value : value.value;
  }

  *[Symbol.iterator](): Iterator<TElement> {
    if (this.isCreated) {
      const n = this.selfNode;
      if (isSeq(n)) {
        for (const each of n.items) {
          yield this.wrapValue(each);
        }
      } else if (isPrimitive(n) || isScalar(n)) {
        yield this.wrapValue(n);
      }
    }
  }
}
