// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export type Range = [number, number, number];

export interface Dictionary<T> {
  clear(): void;
  delete(key: string): boolean;
  remove(key: string): boolean;
  forEach(callbackfn: (value: T, key: string, map: Dictionary<T>) => void, thisArg?: any): void;
  get(key: string): T | undefined;
  has(key: string): boolean;
  positionOf(key: string): Range | undefined;
  getOrCreate(key: string): T;
  readonly size: number;
  readonly entries: Array<[string, T]>;
  readonly keys: Array<string>;
  readonly values: Array<T>;
}

export interface Sequence<T> {
  [Symbol.iterator](): Iterator<T>;
  readonly length: number;
  toArray(): Array<T>;
  toString(): string;
  toLocaleString(): string;
  clear(): void;
}

export interface Strings extends Sequence<string> {
  add(value: string | Array<string>): void;
  remove(val: string | Array<string>): void;

}