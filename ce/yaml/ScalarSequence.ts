// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isScalar, isSeq, Scalar, YAMLSeq } from 'yaml';
import { Primitive, Yaml, YAMLScalar, YAMLSequence } from './yaml-types';

/**
 * ScalarSequence is expressed as either a single scalar value or a sequence of scalar values.
 */

export /** @internal */ class ScalarSequence<TElement extends Primitive> extends Yaml<YAMLSeq<TElement> | Scalar<TElement>> {
  static override create(): YAMLScalar {
    return new YAMLScalar('');
  }

  get length(): number {
    if (this.node) {
      if (isSeq(this.node)) {
        return this.node.items.length;
      }
      if (isScalar(this.node)) {
        return 1;
      }
    }
    return 0;
  }

  add(value: TElement) {
    if (value === undefined || value === null) {
      throw new Error('Cannot add undefined or null to a sequence');
    }

    if (!this.node) {
      // if we don't have a node at the moment, we need to create one.
      this.assert(true);
      (<YAMLScalar><any>this.node).value = value;
      return;
    }

    if (isScalar(this.node)) {
      // this is currently a single item.
      // we need to convert it to a sequence
      const n = this.node;
      const seq = new YAMLSequence();
      seq.add(n);
      this.node = seq;

      // fall thru to the sequnce add
    }

    if (isSeq(this.node)) {
      this.node.add(value);
    }
  }

  get(index: number): TElement | undefined {
    if (isSeq(this.node)) {
      return <TElement>this.node.items[index];
    }

    if (isScalar(this.node) && index === 0) {
      return <TElement>this.node.value;
    }

    return undefined;
  }

  [Symbol.iterator](): Iterable<TElement> {
    if (isSeq(this.node)) {
      return this.node.items.values();
    }
    if (isScalar(this.node)) {
      return [this.node.value];
    }
    return [];
  }

  clear() {
    if (isSeq(this.node)) {
      // just make sure the collection is emptied first
      this.node.items.length = 0;
    }
    this.dispose(true);
  }
}
