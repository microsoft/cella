/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Scalar, YAMLMap } from 'yaml/types';
import { isPrimitive } from './checks';
import { createNode } from './yaml';

export class Strings {
  #parent: YAMLMap;
  #property: string;

  private get node(): YAMLMap {
    return this.#parent.get(this.#property);
  }

  private get unboxed() {
    const n = this.node;
    return n ? isPrimitive(n) ? [n.toString()] : n.items.map(each => each.value) : [];
  }

  constructor(parent: YAMLMap, property: string) {
    this.#parent = parent;
    this.#property = property;
  }

  readonly [n: number]: string;

  get length(): number {
    const n = this.node;
    return n ? isPrimitive(n) ? 1 : n.items.length : 0;
  }

  toString(): string | undefined {
    return this.unboxed.toString();
  }

  toLocaleString(): string {
    return this.unboxed.toLocaleString();
  }

  join(separator?: string): string {
    return this.unboxed.join(separator);
  }

  slice(start?: number, end?: number): Array<string> {
    return this.unboxed.slice(start, end);
  }

  indexOf(searchElement: string, fromIndex?: number): number {
    return this.unboxed.indexOf(searchElement, fromIndex);
  }

  lastIndexOf(searchElement: string, fromIndex?: number): number {
    return this.unboxed.lastIndexOf(searchElement, fromIndex);
  }

  some(predicate: (value: string, index: number, array: ReadonlyArray<string>) => unknown, thisArg?: any): boolean {
    return this.unboxed.some(predicate, thisArg);
  }

  forEach(callbackfn: (value: string, index: number, array: ReadonlyArray<string>) => void, thisArg?: any): void {
    return this.unboxed.forEach(callbackfn, thisArg);
  }

  map<U>(callbackfn: (value: string, index: number, array: ReadonlyArray<string>) => U, thisArg?: any): Array<U> {
    return this.unboxed.map(callbackfn, thisArg);
  }

  filter<S extends string>(predicate: (value: string, index: number, array: ReadonlyArray<string>) => value is S, thisArg?: any): Array<S>
  filter(predicate: (value: string, index: number, array: ReadonlyArray<string>) => unknown, thisArg?: any): Array<string> {
    return this.unboxed.filter(predicate, thisArg);
  }

  reduce<U>(callbackfn: (previousValue: U, currentValue: string, currentIndex: number, array: ReadonlyArray<string>) => U, initialValue: U): U;
  reduce(callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: ReadonlyArray<string>) => string): string;
  reduce(callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: ReadonlyArray<string>) => string, initialValue?: string): string {
    return this.unboxed.reduce(callbackfn, initialValue);
  }


  reduceRight<U>(callbackfn: (previousValue: U, currentValue: string, currentIndex: number, array: ReadonlyArray<string>) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: ReadonlyArray<string>) => string): string;
  reduceRight(callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: ReadonlyArray<string>) => string, initialValue?: string): string {
    return this.unboxed.reduceRight(callbackfn, initialValue);
  }

  find<S extends string>(predicate: (this: void, value: string, index: number, obj: ReadonlyArray<string>) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: string, index: number, obj: ReadonlyArray<string>) => unknown, thisArg?: any): string | undefined {
    return this.unboxed.find(predicate, thisArg);
  }

  findIndex(predicate: (value: string, index: number, obj: ReadonlyArray<string>) => unknown, thisArg?: any): number {
    return this.unboxed.findIndex(predicate, thisArg);
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.unboxed[Symbol.iterator]();
  }

  entries(): IterableIterator<[number, string]> {
    return this.unboxed.entries();
  }

  keys(): IterableIterator<number> {
    return this.unboxed.keys();
  }

  values(): IterableIterator<string> {
    return this.unboxed.values();
  }

  includes(searchElement: string, fromIndex?: number): boolean {
    return this.unboxed.includes(searchElement, fromIndex);
  }

  flatMap<U, This = undefined>(callback: (this: This, value: string, index: number, array: Array<string>) => U | ReadonlyArray<U>, thisArg?: This): Array<U> {
    return this.unboxed.flatMap(callback, thisArg);
  }

  flat<A, D extends number = 1>(depth?: D): Array<FlatArray<A, D>> {
    return this.unboxed.flat(depth);
  }

  add(value: string): void {
    const n = this.node;
    if (n) {
      if (isPrimitive(n)) {
        if (n == value) {
          // it's already the only value
          return;
        }
        // set the whole value as an array
        return this.#parent.set(this.#property, createNode([n, value]));
      }
      if (n.items.find((each: any) => each === value || each.value == value)) {
        // it's already in the set
        return;
      }
      // add the new value at the end
      return n.set(n.items.length, new Scalar(value));
    }
    // O_o this doesn't look valid, let's force it to just the value we have
    return this.#parent.set(this.#property, value);
  }

  remove(value: string): void {
    const n = this.node;
    if (n) {
      if (isPrimitive(n)) {
        if (n == value) {
          this.#parent.delete(this.#property);
          return;
        }
        // the value isn't there.
        return;
      }
      const i = n.items.findIndex((each: any) => each == value || each.value == value);
      if (i > -1) {
        // remove that item
        n.delete(i);
        return;
      }
      // we don't have one
    }
  }

  clear(): void {
    this.#parent.delete(this.#property);
  }
}