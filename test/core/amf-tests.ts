/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isNuGet, parse } from '@microsoft/cella.core';
import { suite, test } from '@testdeck/mocha';
import { strict } from 'assert';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as s from '../sequence-equal';

// don't move this. I need this.
s;

// sample test using decorators.
@suite class Amf {
  @test async 'readProfile'() {
    const content = await (await readFile(join(__dirname, 'resources', 'sample1.yaml'))).toString('utf-8');
    const doc = parse('sample1.yaml', content);
    console.log(doc.validationErrors);

    strict.ok(doc.isValidYaml, 'Ensure it is valid yaml');
    strict.ok(doc.isValid, 'Is it valid?');


    strict.equal(doc.info.id, 'sample1', 'identity incorrect');
    strict.equal(doc.info.version, '1.2.3', 'version incorrect');

  }

  @test async 'profile checks'() {
    const content = await (await readFile(join(__dirname, 'resources', 'sample1.yaml'))).toString('utf-8');
    const doc = parse('sample1.yaml', content);
    strict.ok(doc.isValidYaml, 'Ensure it\'s valid yaml');
    strict.ok(doc.isValid, 'better be valid!');

    strict.throws(() => doc.info.version = '4.1', 'Setting invalid version should throw');
    strict.equal(doc.info.version = '4.1.0', '4.1.0', 'Version should set correctly');

    strict.sequenceEqual(doc.contacts['Bob Smith'].roles, ['fallguy', 'otherguy'], 'Should return the two roles');
    doc.contacts['Bob Smith'].roles.remove('fallguy');

    strict.sequenceEqual(doc.contacts['Bob Smith'].roles, ['otherguy'], 'Should return the remaining role');

    doc.contacts['Bob Smith'].roles.add('the dude');

    doc.contacts['Bob Smith'].roles.add('the dude'); // shouldn't add this one

    strict.sequenceEqual(doc.contacts['Bob Smith'].roles, ['otherguy', 'the dude'], 'Should return only two roles');

    doc.contacts['James Brown'].email = 'jim@contoso.net';

    strict.equal(doc.contacts.keys.length, 3, 'Should have 3 contacts');

    doc.contacts.remove('James Brown');

    // this works too:
    delete doc.contacts['James Brown'];


    strict.equal(doc.contacts.keys.length, 2, 'Should have 2 contacts');

    doc.contacts.remove('James Brown'); // this is ok.

    // version can be coerced to be a string (via tostring)
    strict.equal(<any>doc.requires['foo/bar/bin'] == '~2.0.0', true, 'Version must match');

    // can we get the normalized range?
    strict.equal(doc.requires['foo/bar/bin'].range.range, '>=2.0.0 <2.1.0-0', 'The canonical ranges should match');

    // no resolved version means undefined.
    strict.equal(doc.requires['foo/bar/bin'].resolved, undefined, 'Version must match');

    // the setter is actually smart enough, but typescript does not allow heterogeneous accessors (yet! https://github.com/microsoft/TypeScript/issues/2521)
    doc.requires['just/a/version'] = <any>'1.2.3';
    strict.equal(doc.requires['just/a/version'].raw, '1.2.3', 'Should be a static version range');

    // set it with a struct
    doc.requires['range/with/resolved'] = <any>{ range: '1.*', resolved: '1.0.0' };
    strict.equal(doc.requires['range/with/resolved'].raw, '1.* 1.0.0');

    // for (const each of doc.requires.keys) {
    //  console.log(`${each} => ${doc.requires[each].range.range} ,  ${doc.requires[each].range.raw}, ${doc.requires[each].resolved}`);
    // }

    strict.equal(doc.settings.tools['CC'], 'foo/bar/cl.exe', 'should have a value');
    strict.equal(doc.settings.tools['CXX'], 'bin/baz/cl.exe', 'should have a value');
    strict.equal(doc.settings.tools['Whatever'], 'some/tool/path/foo', 'should have a value');

    doc.settings.tools.remove('CXX');
    strict.equal(doc.settings.tools.keys.length, 2, 'should only have two tools now');

    strict.deepEqual(doc.settings.variables['test'], ['abc'], 'variables should be an array');
    strict.deepEqual(doc.settings.variables['cxxflags'], ['foo=bar', 'bar=baz'], 'variables should be an array');

    doc.settings.variables['test'] = [...doc.settings.variables['test'], 'another value'];
    strict.deepEqual(doc.settings.variables['test'], ['abc', 'another value'], 'variables should be an array of two items now');

    doc.settings.paths.bin = [...doc.settings.paths.bin, 'hello/there'];
    strict.deepEqual(doc.settings.paths.bin.length, 3, 'there should be three paths in bin now.');

    strict.sequenceEqual(doc.demands, ['windows and arm'], 'should have one conditional demand');

    const install = doc['windows and arm'].install!;
    strict.ok(isNuGet(install), 'the install type should be NuGet');
    strict.equal(install.location, 'floobaloo/1.2.3', 'should have correct location');

    console.log(doc.toString());
  }

  @test async 'read invalid yaml file'() {
    const content = await (await readFile(join(__dirname, 'resources', 'errors.yaml'))).toString('utf-8');
    const doc = parse('errors.yaml', content);

    strict.equal(doc.isValidYaml, false, 'this document should have errors');
    strict.equal(doc.yamlErrors.length, 2, 'This document should have one error');
    strict.equal(doc.yamlErrors[1], 'errors.yaml:2:1 YAMLSemanticError, Map keys must be unique; "top" is repeated', 'Message is not correct');

    strict.equal(doc.info.id, 'bob', 'identity incorrect');
    strict.equal(doc.info.version, '1.0.2', 'version incorrect');
  }

  @test async 'read empty yaml file'() {
    const content = await (await readFile(join(__dirname, 'resources', 'empty.yaml'))).toString('utf-8');
    const doc = parse('empty.yaml', content);

    strict.ok(doc.isValidYaml, 'Ensure it is valid yaml');

    console.log(doc.validationErrors);

    strict.equal(doc.isValid, false, 'Should have some validation errors');
    strict.equal(doc.validationErrors[0], 'empty.yaml: SectionMessing, Missing section \'info\'', 'Should have an error about info');
  }

  @test async 'validation errors'() {
    const content = await (await readFile(join(__dirname, 'resources', 'validation-errors.yaml'))).toString('utf-8');
    const doc = parse('validation-errors.yaml', content);

    strict.ok(doc.isValidYaml, 'Ensure it is valid yaml');

    strict.equal(doc.validationErrors.length, 5, `Expecting five errors, found: ${JSON.stringify(doc.validationErrors, null, 2)}`);
  }
}
