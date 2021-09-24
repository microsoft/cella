// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isMap, isScalar, isSeq, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { isPrimitive } from '../util/checks';
import { YamlNode } from './YamlNode';


export abstract class Sequence<TElement, TNode extends YAMLMap | Scalar | YAMLSeq> extends YamlNode<TNode> {
  protected abstract wrapValue(value: any): TElement;
  abstract [Symbol.iterator](): Iterator<TElement>;

  get length(): number {
    const self = this.selfNode;
    return self ? isSeq(self) ? self.items.length : isScalar(self) || isPrimitive(self) || isMap(self) ? 1 : 0 : 0;
  }

  toArray(): Array<TElement> {
    return [...this];
  }

  toString(): string {
    return [...this].toString();
  }

  toLocaleString(): string {
    return [...this].toLocaleString();
  }

  clear(): void {
    this.parent.delete(this.nodeName);
  }
}
