// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { VersionReference } from '../interfaces/metadata/version-reference';
import { YamlDictionary } from '../yaml/MapOf';
import { ParentNode } from '../yaml/yaml-node';
import { VersionReferenceNode } from './version-reference';


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
