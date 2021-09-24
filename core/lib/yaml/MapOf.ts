// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Pair, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { YamlObject } from './YamlObject';

// eslint-disable-next-line @typescript-eslint/ban-types
export abstract class YamlDictionary<T extends Object> extends YamlObject {
  protected cache = new WeakMap<T>();

  protected abstract wrapMember(key: string, value: any): T;

  /** Returns an iterable of entries in the map. */
  *[Symbol.iterator](): IterableIterator<[string, T]> {
    for (const { key, value } of this.members) {
      yield [<any>key, this.wrapMember(<any>key, value)];
    }
  }

  protected get members(): Array<Pair> {
    return this.isCreated ? this.selfNode.items : [];
  }

  clear(): void {
    if (this.isCreated) {
      this.members.forEach(item => this.selfNode.delete(item.key));
    }
  }

  delete(key: string): boolean {
    return this.isCreated ? this.selfNode.delete(key) : false;
  }

  remove(key: string): boolean {
    return this.isCreated ? this.selfNode.delete(key) : false;
  }

  forEach(callbackfn: (value: T, key: string, map: YamlDictionary<T>) => void, thisArg?: any): void {
    if (this.isCreated) {
      for (const { key, value } of this.members) {
        callbackfn(<any>value, <any>key, this);
      }
    }
  }

  get(key: string): T | undefined {
    if (this.isCreated) {
      const result = <YAMLMap | YAMLSeq | Scalar | undefined>this.selfNode.get(key, true);
      if (result) {
        return this.wrapMember(key, <any>result);
      }

      const item = <any>this.selfNode.get(key);
      if (item) {
        return this.wrapMember(key, item.value);
      }
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.isCreated ? this.selfNode.has(key) : false;
  }

  positionOf(key: string) {
    return this.isCreated && (<Scalar>this.selfNode.get(key, true))?.range || undefined;
  }

  getOrCreate(key: string): T {
    if (!this.selfNode.has(key)) {
      this.selfNode.set(key, new YAMLMap());
    }
    const item = <any>this.selfNode.get(key);
    if (item) {

      return this.wrapMember(key, item.value);
    }
    throw new Error(`Expected ${this.nodeName} to have a value for ${key}`);
  }

  get size(): number {
    return this.isCreated ? this.members.length : 0;
  }

  get entries(): Array<[string, T]> {
    return this.isCreated ? this.members.map(item => [(<any>item).key.value || item.key, this.wrapMember(<any>item.key, item.value)]) : [];
  }

  get keys(): Array<string> {
    return this.isCreated ? this.members.map(item => (<any>item).key.value || item.key) : [];
  }

  get values(): Array<T> {
    return this.isCreated ? this.members.map(item => this.wrapMember((<any>item).key.value || item.key, item.value)) : [];
  }
}


export abstract class MapOfPrimitive<T extends string | boolean | number> extends YamlObject {
  protected abstract wrapMember(key: string, value: any): T;

  /** Returns an iterable of entries in the map. */
  *[Symbol.iterator](): IterableIterator<[string, T]> {
    for (const { key, value } of this.members) {
      yield [<any>key, this.wrapMember(<any>key, value)];
    }
  }

  protected get members(): Array<Pair> {
    return this.isCreated ? this.selfNode.items : [];
  }

  clear(): void {
    if (this.isCreated) {
      this.members.forEach(item => this.selfNode.delete(item.key));
    }
  }

  delete(key: string): boolean {
    return this.isCreated ? this.selfNode.delete(key) : false;
  }

  remove(key: string): boolean {
    return this.isCreated ? this.selfNode.delete(key) : false;
  }

  forEach(callbackfn: (value: T, key: string, map: MapOfPrimitive<T>) => void, thisArg?: any): void {
    if (this.isCreated) {
      for (const { key, value } of this.members) {
        callbackfn(<any>value, <any>key, this);
      }
    }
  }

  get(key: string): T | undefined {
    if (this.isCreated) {
      const result = <YAMLMap | YAMLSeq | Scalar | undefined>this.selfNode.get(key, true);
      if (result) {
        return this.wrapMember(key, <any>result);
      }
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.isCreated ? this.selfNode.has(key) : false;
  }

  getOrCreate(key: string): T {
    if (!this.selfNode.has(key)) {
      this.selfNode.set(key, new YAMLMap());
    }
    const item = <any>this.selfNode.get(key);
    if (item) {

      return this.wrapMember(key, item.value);
    }
    throw new Error(`Expected ${this.nodeName} to have a value for ${key}`);
  }

  get size(): number {
    return this.isCreated ? this.members.length : 0;
  }

  get entries(): Array<[string, T]> {
    return this.isCreated ? this.members.map(item => [(<any>item).key.value || item.key, this.wrapMember(<any>item.key, item.value)]) : [];
  }

  get keys(): Array<string> {
    return this.isCreated ? this.members.map(item => (<any>item).key.value || item.key) : [];
  }

  get values(): Array<T> {
    return this.isCreated ? this.members.map(item => this.wrapMember((<any>item).key.value || item.key, item.value)) : [];
  }
}