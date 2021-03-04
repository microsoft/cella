/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';

// I like my collections to be easier to compare.
declare module 'assert' {
  namespace assert {
    function sequenceEqual(actual: Iterable<any>, expected: Iterable<any>, message?: string | Error): void;
    function throws(block: () => any, message?: string | Error): void;
  }
}

(<any>strict).sequenceEqual = (a: Iterable<any>, e: Iterable<any>, message: string) => {
  return strict.deepEqual([...a], [...e], message);
};