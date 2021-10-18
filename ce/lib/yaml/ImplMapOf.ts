// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { strict } from 'assert';
import { isNullish } from '../util/checks';
import { YamlDictionary } from './MapOf';
import { StringsSequence } from './strings';
import { ParentNode } from './yaml-node';

// eslint-disable-next-line @typescript-eslint/ban-types
export class ObjectDictionary<T extends Object> extends YamlDictionary<T> {
  constructor(parent: ParentNode, nodeName: string, private readonly wrapper: (key: string, value: any) => T) {
    super(parent, nodeName);
  }

  protected wrapMember(key: string, value: any): T {
    strict.ok(key, `Key must not be empty '${key}'}`);
    return this.wrapper(key, value);
  }
}

export class StringDictionary extends YamlDictionary<StringsSequence> {
  protected wrapMember(key: string, value: any): StringsSequence {
    strict.ok(key, `Key must not be empty '${key}'}`);
    return new StringsSequence(this, key);
  }
}

export class PrimitiveDictionary<T extends string | boolean | number> extends YamlDictionary<T> {
  constructor(parent: ParentNode, nodeName: string, private readonly wrapper: (key: string, value: any) => T) {
    super(parent, nodeName);
  }

  protected wrapMember(key: string, value: any): T {
    strict.ok(key, `Key must not be empty '${key}'}`);
    return this.wrapper(key, isNullish(value?.value) ? value : value.value);
  }

}