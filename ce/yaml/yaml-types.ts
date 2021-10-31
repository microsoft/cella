// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isCollection, isMap, isScalar, isSeq, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { ValidationError } from '../interfaces/validation-error';
import { isNullish } from '../util/checks';
import { Coerce } from './Coerce';
import { Entity } from './Entity';
import { Flags } from './Flags';

export class YAMLDictionary extends YAMLMap<string, any> { }
export class YAMLSequence extends YAMLSeq<any> { }
export class YAMLScalar extends Scalar<any> { }
export type Primitive = string | number | boolean;
export type Node = YAMLDictionary | YAMLSequence | YAMLScalar;
export type Range = [number, number, number];

export /** @internal */ abstract class Yaml<ThisType extends Node = Node> {
  protected createNode(): ThisType {
    return (<NodeFactory<ThisType>>this.constructor).create();
  }

  /**@internal*/ static create() {
    throw new Error('creator not Not implemented on base class.');
  }

  constructor(/** @internal */ public node?: ThisType, protected parent?: Yaml<Node>, protected key?: string) {
    if (!(<NodeFactory<ThisType>>(this.constructor)).create) {
      throw new Error(`class ${this.constructor.name} is missing implementation for create`);
    }
  }

  sourcePosition(key?: string | number): Range | undefined {
    if (!this.node) {
      return undefined;
    }
    if (key !== undefined) {
      if ((isMap(this.node) || isSeq(this.node))) {
        const node = <Node>this.node.get(<any>key);
        if (node) {
          return node.range || undefined;
        }
        return undefined;
      }
      if (isScalar(this.node)) {
        throw new Error('Scalar does not have a key to get a source position');
      }
    }
    return this.node?.range || undefined;
  }

  /** will dispose of this object if it is empty (or forced) */
  dispose(force = false, deleteFromParent = true) {
    if ((this.empty || force) && this.node) {
      if (deleteFromParent) {
        this.parent?.deleteChild(this);
      }
      this.node = undefined;
    }
  }

  /** if this node has any data, this should return false */
  get empty(): boolean {
    if (isCollection(this.node)) {
      return !(this.node?.items.length);
    }
    return !isNullish(this.node?.value);
  }

  /** @internal */ assert(recreateIfDisposed = false, node = this.node) {
    if (this.node === node) {
      return; // quick and fast
    }

    if (recreateIfDisposed) {
      // ensure that this node is the node we're supposed to be.
      this.node = node;

      if (this.parent) {
        // ensure that the parent is not disposed
        this.parent.assert(true);

        if (isMap(this.parent.node)) {
          if (this.key) {
            // we have a parent, and the key, we can add the node.
            // let's just check if there is one first
            const n = this.parent.node.get(this.key);
            this.parent!.assert(true);
            this.parent.node.set(this.key, this.node = this.node || this.createNode());
            return;
          }
          // the parent is a map, but we don't have a key, so we can't add the node.
          throw new Error('Parent is a map, but we don\'t have a key');
        }

        if (isSeq(this.parent.node)) {
          this.parent.node.add(this.node = this.node || this.createNode());
          return;
        }

        throw new Error('YAML parent is not a container.');
      }
    }
    throw new Error('YAML node is undefined');
  }

  protected deleteChild(child: Yaml<ThisType>) {
    if (!child.node) {
      // this child is already disposed
      return;
    }

    this.assert();

    if (isMap(this.node)) {
      if (child.key) {
        this.node.delete(child.key);
        child.dispose(true, false);
        this.dispose(); // clean up if this is empty
        return;
      }
    }

    if (isCollection(this.node)) {
      // child is in some kind of collection.
      // we should be able to find the child's index and remove it.
      for (let i = 0; i < this.node.items.length; i++) {
        if (this.node.items[i].value === child.node) {
          this.node.delete(this.node.items[i].key);
          child.dispose(true, false);
          this.dispose(); // clean up if this is empty
          return;
        }
      }

      // if we get here, we didn't find the child.
      // but, it's not in the object, so we're good I guess
      throw new Error('Child Node not found trying to delete');
      // return;
    }

    throw new Error('this node does not have children.');
  }

  *validate(): Iterable<ValidationError> {
    // shh.
  }
}

export /** @internal */ interface EntityFactory<TNode extends Node, TEntity extends Yaml = Yaml<TNode>> extends NodeFactory<TNode> {
  /**@internal*/ new(node: TNode, parent?: Yaml, key?: string): TEntity;
}

export /** @internal */ interface NodeFactory<TNode extends Node> extends Function {
  /**@internal*/ create(): TNode;
}

export /** @internal */ class Info extends Entity {
  /** @internal */ constructor(node?: YAMLDictionary, parent?: Yaml, key?: string) {
    super(node, parent, key);
  }

  get version(): string | undefined { return Coerce.String(this.getMember('version')); }
  set version(value: string | undefined) { this.setMember('version', value); }

  get id(): string | undefined { return Coerce.String(this.getMember('id')); }
  set id(value: string | undefined) { this.setMember('id', value); }

  get summary(): string | undefined { return Coerce.String(this.getMember('summary')); }
  set summary(value: string | undefined) { this.setMember('summary', value); }

  get description(): string | undefined { return Coerce.String(this.getMember('description')); }
  set description(value: string | undefined) { this.setMember('description', value); }

  private flags = new Flags(undefined, this, 'options');

  get dependencyOnly(): boolean { return this.flags.has('dependencyOnly'); }
  set dependencyOnly(value: boolean) { this.flags.set('dependencyOnly', value); }
}

