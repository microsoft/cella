// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isMap, isScalar, isSeq } from 'yaml';
import { Coerce } from './Coerce';
import { Entity } from './Entity';
import { ScalarSequence } from './ScalarSequence';
import { EntityFactory, Node, Primitive, Yaml, YAMLSequence } from './yaml-types';


export /** @internal */ abstract class BaseMap extends Entity {
  get keys() {
    return this.node!.items.map(each => each.key);
  }

  get length(): number {
    return this.node!.items.length;
  }

  has(key: string, kind?: 'sequence' | 'entity' | 'scalar'): boolean {
    if (this.node) {
      switch (kind) {
        case 'sequence':
          return isSeq(this.node!.get(key));
        case 'entity':
          return isMap(this.node!.get(key));
        case 'scalar':
          return isScalar(this.node!.get(key));
        default:
          return this.node!.has(key);
      }
    }
    return false;
  }

  getEntity<TNode extends Node, TEntity extends Yaml<TNode> = Yaml<TNode>>(key: string, factory: EntityFactory<TNode, TEntity>): TEntity | undefined {
    if (this.node) {
      const v = this.node!.get(key, true);
      if (isMap(v)) {
        return new factory(<any>v);
      }
    }
    return undefined;
  }

  getSequence(key: string, factory: EntityFactory<YAMLSequence, Entity> | (new (node: Node, parent?: Yaml, key?: string) => ScalarSequence<Primitive>)) {
    if (this.node) {
      const v = this.node!.get(key, true);
      if (isSeq(v)) {
        return new factory(<any>v);
      }
    }
    return undefined;
  }

  getValue(key: string): Primitive | undefined {
    if (this.node) {
      const v = this.node!.get(key, true);
      if (isScalar(v)) {
        return Coerce.Primitive(v.value);
      }
    }
    return undefined;
  }

  delete(key: string) {
    let result = false;
    if (this.node) {
      result = this.node!.delete(key);
    }
    this.dispose();
    return result;
  }

  clear() {
    if (isMap(this.node) || isSeq(this.node)) {
      this.node!.items.length = 0;
    }
    this.dispose(true);
  }
}
