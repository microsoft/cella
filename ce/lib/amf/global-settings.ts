// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isNullish } from '../util/checks';
import { YamlDictionary } from '../yaml/MapOf';
import { ParentNode } from '../yaml/yaml-node';
import { Primitive } from './metadata-file';


export class GlobalSettingsNode extends YamlDictionary<Primitive | Record<string, unknown>> {
  constructor(parent: ParentNode) {
    super(parent, 'global');
  }

  override wrapMember(key: string, value: any): Primitive | Record<string, unknown> {
    return isNullish(value?.value) ? value : value.value;
  }

  set(key: string, value: Primitive | Record<string, unknown>): void {
    if (value === undefined || value === null || value === '') {
      this.selfNode.delete(key);
      return;
    }
    this.selfNode.set(key, value);
  }
}
