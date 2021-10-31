// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export type Range = [number, number, number];

export interface Dictionary<T> {
  clear(): void;
  delete(key: string): boolean;
  get(key: string): T | undefined;
  has(key: string): boolean;
  sourcePosition(key: string): Range | undefined;
  readonly length: number;
  readonly keys: Array<string>;
}

export interface Sequence<T> {
  [Symbol.iterator](): Iterator<T>;
  readonly length: number;
  clear(): void;
}

export interface Strings extends Sequence<string> {
  add(value: string | Array<string>): void;
  remove(val: string | Array<string>): void;

}