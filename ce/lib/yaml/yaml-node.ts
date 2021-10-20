// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { YAMLMap, YAMLSeq } from 'yaml';
import { YamlObject } from './YamlObject';

export interface ParentNode {
  selfNode: YAMLMap | YAMLSeq;
}

export class NonNavigableYamlObject extends YamlObject {
  override get self(): YAMLMap {
    return this.instance;
  }

  override get selfNode(): YAMLMap {
    return this.instance;
  }

  constructor(parent: ParentNode, private instance: YAMLMap) {
    super(parent, '?');
  }
}

