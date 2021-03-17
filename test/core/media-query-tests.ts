/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { parseQuery } from '@microsoft/cella.core';
import { strict } from 'assert';

describe('MediaQuery', () => {
  it('windows', async () => {
    const queryList = parseQuery('windows');
    strict.equal(queryList.length, 1, 'should be just one query');
    strict.equal(queryList.queries[0].expressions.length, 1, 'should be just one expression');
    strict.equal(queryList.queries[0].expressions[0].feature, 'windows');
  });

  it('windows and arm', async () => {
    const queryList = parseQuery('windows and arm');
    strict.equal(queryList.length, 1, 'should be just one query');
    strict.equal(queryList.queries[0].expressions.length, 2, 'should be two expressions');
    strict.sequenceEqual(queryList.queries[0].expressions.map(each => each.feature), ['windows', 'arm']);
  });

  it('target:x64', async () => {
    const queryList = parseQuery('target:x64');
    strict.equal(queryList.length, 1, 'should be just one query');
    strict.equal(queryList.queries[0].expressions.length, 1, 'should be one expression');
    strict.equal(queryList.queries[0].expressions[0].feature, 'target', `feature should say target (got ${queryList.queries[0].expressions[0].feature})`);
    strict.equal(queryList.queries[0].expressions[0].constant, 'x64', 'constant should say x64');
  });

  it('just test the parser for good queries', async () => {
    parseQuery('foo and bar');
    parseQuery('foo and (bar)');
    parseQuery('foo and (bar:100)');
    parseQuery('foo and (bar:"hello")');
    parseQuery('foo and (bar:"hello") and buzz');
    parseQuery('not foo and not bar');
  });

  it('test for known bad query strings', async () => {

    strict.equal(parseQuery('!').error?.message, 'Expected expression, found "!"');
    strict.equal(parseQuery('foo and !').error?.message, 'Expected expression, found "!"');
    strict.equal(parseQuery('foo or (bar:100)').error?.message, 'Expected comma, found "or"');
    strict.equal(parseQuery('not not bar').error?.message, 'Expression specified NOT twice');
    strict.equal(parseQuery('"hello" and bar').error?.message, 'Expected expression, found "\\"hello\\""');
    strict.equal(parseQuery('foo and (bar: : 200 )').error?.message, 'Expected one of {Number, Boolean, Identifier, String}, found token ":"');
    strict.equal(parseQuery('"').error?.message, 'Unexpected end of file while searching for \'"\'');
    strict.equal(parseQuery('foo:0x01fz').error?.message, 'Expected comma, found "z"');
    strict.equal(parseQuery('foo:?100').error?.message, 'Expected one of {Number, Boolean, Identifier, String}, found token "?"');
  });

  it('test for matches', async () => {
    strict.ok(parseQuery('foo').match({ foo: true }), 'foo was present, it should match!');
    strict.ok(parseQuery('foo').match({ foo: null }), 'foo was present, it should match!');
    strict.ok(parseQuery('foo').match({ foo: false }), 'foo was present, it should match!');
    strict.ok(!parseQuery('foo').match({}), 'foo was not present, it should not match!');

    strict.ok(parseQuery('foo and windows').match({ foo: true, windows: true, books: true }), 'foo,windows was present, it should match!');
    strict.ok(!parseQuery('bar and windows').match({ foo: true, windows: true, books: true }), 'bar was not , it should not match!');

    strict.ok(parseQuery('windows and x64 and target:amd64, osx').match({ windows: true, x64: true, target: 'amd64' }), 'should match');
    strict.ok(parseQuery('windows and (x64) and (target:amd64), osx').match({ windows: true, x64: true, target: 'amd64' }), 'should match');

    strict.ok(parseQuery('windows and x64 and target:amd64, osx').match({ osx: true }), 'should match');
    strict.ok(!parseQuery('windows and x64 and target:amd64, osx').match({ linux: true }), 'should not match');

  });
});
