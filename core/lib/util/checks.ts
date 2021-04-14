/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
<<<<<<< HEAD

/** @internal */
export function isIterable<T>(source: any): source is Iterable<T> {
  return !!source && typeof (source) !== 'string' && !!source[Symbol.iterator];
}
=======
>>>>>>> f221c2db894875ce656e9b932045b08bdb2355a1
