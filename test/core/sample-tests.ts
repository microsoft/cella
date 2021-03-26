/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { notStrictEqual } from 'assert';
import { describe, it } from 'mocha';

// sample test using decorators.
describe('SomeTests', () => {
  it('Try This Sample Test', () => {
    notStrictEqual(5, 4, 'numbers should not be equal');
  });
});

// sample test that uses describe/it
describe('sample test', () => {
  it('does not make mistakes', () => {
    notStrictEqual('A', 'B', 'letters should not be equal');
  });
});
