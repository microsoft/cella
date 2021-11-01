// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CustomScalarMap } from '../yaml/CustomScalarMap';
import { Yaml, YAMLDictionary } from '../yaml/yaml-types';
import { VersionReference } from './version-reference';


export class Requires extends CustomScalarMap<VersionReference> {
  constructor(node?: YAMLDictionary, parent?: Yaml, key?: string) {
    super(VersionReference, node, parent, key);
  }
}


/*
export class Requires extends YamlDictionary<VersionReference> {
  constructor(parent: ParentNode, kind: 'requires' | 'seeAlso' = 'requires') {
    super(parent, kind);
  }
  protected override wrapMember(key: string, value: any): VersionReference {
    return new VersionReferenceNode(this, key);
  }

  set(key: string, value: string | VersionReference): void {
    if (typeof value === 'string') {
      const v = new VersionReferenceNode(this, key);
      v.raw = value;
    } else {
      const v = new VersionReferenceNode(this, key);
      if (value.resolved) {
        v.raw = `${value.range} ${value.resolved}`;
      } else {
        v.raw = `${value.range}`;
      }
    }
  }
}
*/