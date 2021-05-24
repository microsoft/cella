/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { sanitizePath } from '@microsoft/cella.core';
import { notStrictEqual, strict } from 'assert';
import { describe, it } from 'mocha';
import { pipeline as origPipeline } from 'stream';
import { promisify } from 'util';

const pipeline = promisify(origPipeline);

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


describe('sanitization of paths', () => {
  it('makes nice clean paths', () => {
    strict.equal(sanitizePath(''), '');
    strict.equal(sanitizePath('.'), '');
    strict.equal(sanitizePath('..'), '');
    strict.equal(sanitizePath('..../....'), '');
    strict.equal(sanitizePath('..../foo/....'), 'foo');
    strict.equal(sanitizePath('..../..foo/....'), '..foo');
    strict.equal(sanitizePath('.config'), '.config');
    strict.equal(sanitizePath('\\.config'), '.config');
    strict.equal(sanitizePath('..\\.config'), '.config');
    strict.equal(sanitizePath('/bar'), 'bar');
    strict.equal(sanitizePath('\\this\\is\\a//test/of//a\\path//..'), 'this/is/a/test/of/a/path');

  });
});

