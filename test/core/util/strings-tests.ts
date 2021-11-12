// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/*
import { YamlStringSet } from '@microsoft/vcpkg-ce/dist/yaml/strings';
import { strict } from 'assert';
import { Document, YAMLMap } from 'yaml';

describe('YamlStringsSet', () => {
  it('BehavesLikeASet', () => {
    const doc = new Document(new YAMLMap());
    const rootMap = <YAMLMap>doc.contents;
    const wrapper = new YamlStringSet(rootMap, 'options');
    strict.equal('{}\n', doc.toString());
    // has + unset have no effect when the name doesn't exist
    strict.ok(!wrapper.has('hello'));
    strict.ok(!wrapper.unset('hello'));

    // inserting into the set creates the whole sequence
    strict.ok(wrapper.set('hello'));
    strict.equal('options:\n  - hello\n', doc.toString());
    // repeated inserts of the same value have no effect
    strict.ok(!wrapper.set('hello'));
    strict.equal('options:\n  - hello\n', doc.toString());
    // try again with other values in the set too
    strict.ok(wrapper.set('world'));
    strict.ok(wrapper.set('there'));
    strict.ok(!wrapper.set('hello'));
    // check that 'has' works with the name created
    strict.ok(wrapper.has('world'));
    strict.ok(!wrapper.has('otherwise'));
    // check that unsetting a value removes it but does not shuffle other values
    strict.equal('options:\n  - hello\n  - world\n  - there\n', doc.toString());
    strict.ok(wrapper.unset('world'));
    strict.equal('options:\n  - hello\n  - there\n', doc.toString());
    // check that unsetting everything removes the whole name
    strict.ok(wrapper.unset('there'));
    strict.ok(wrapper.unset('hello'));
    strict.equal('{}\n', doc.toString());

    // also make sure that relative order in an overall doc is maintained if that happens
    rootMap.set(doc.createNode('someKey'), doc.createNode('someValue'));
    rootMap.set(doc.createNode('options'), doc.createNode(['someValue']));
    rootMap.set(doc.createNode('someKey2'), doc.createNode('someValue'));
    wrapper.unset('someValue');
    strict.equal('someKey: someValue\nsomeKey2: someValue\n', doc.toString());
    rootMap.delete('someKey');
    rootMap.delete('someKey2');

    // check that if the name already exists as a non-sequence, unset and has have no effect and
    // set clobbers
    rootMap.set(doc.createNode('options'), doc.createNode(42));
    strict.equal('options: 42\n', doc.toString());
    strict.ok(!wrapper.has('world'));
    strict.ok(!wrapper.has('otherwise'));
    strict.ok(wrapper.set('hello'));
    strict.equal('options:\n  - hello\n', doc.toString());
  });
});
*/