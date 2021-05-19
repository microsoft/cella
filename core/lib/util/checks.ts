/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { YAMLMap } from 'yaml';
import { i } from '../i18n';
import { ErrorKind, ValidationError } from '../metadata-format';

/** @internal */
export function isPrimitive(value: any): value is (string | number | boolean) {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
  }
  return false;
}

/** @internal */
export function isIterable<T>(source: any): source is Iterable<T> {
  return !!source && typeof (source) !== 'string' && !!source[Symbol.iterator];
}

export function *checkOptionalString(parent: YAMLMap, range: [number, number, number], name: string): Iterable<ValidationError> {
  switch (typeof parent.get(name)) {
    case 'string':
    case 'undefined':
      break;
    default:
      yield { message: i`${name} must be a string`, range: range, category: ErrorKind.IncorrectType };
  }
}

export function *checkOptionalBool(parent: YAMLMap, range: [number, number, number], name: string): Iterable<ValidationError> {
  switch (typeof parent.get(name)) {
    case 'boolean':
    case 'undefined':
      break;
    default:
      yield { message: i`${name} must be a bool`, range: range, category: ErrorKind.IncorrectType };
  }
}
