// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export type Range = [number, number, number];

export interface Dictionary<T> extends Iterable<[string, T]> {
  clear(): void;
  delete(key: string): boolean;
  get(key: string): T | undefined;
  has(key: string): boolean;
  sourcePosition(key: string): Range | undefined;
  readonly length: number;
  readonly keys: Array<string>;
}

export interface Sequence<T> extends Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
  readonly length: number;
  clear(): void;
}

export interface Strings extends Sequence<string> {
  // add(value: string | Array<string>): void;
  // delete(val: string | Array<string>): void;

}