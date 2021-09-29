// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.


import { PrimitiveDictionary, StringDictionary } from '../yaml/ImplMapOf';
import { YamlDictionary } from '../yaml/MapOf';
import { ParentNode } from '../yaml/yaml-node';
import { Primitive } from './metadata-file';
import { Settings, ValidationError } from './metadata-format';


export class SettingsNode extends YamlDictionary<Primitive | Record<string, unknown>> implements Settings {
  constructor(parent: ParentNode) {
    super(parent, 'settings');
  }

  wrapMember(key: string, value: any): Primitive | Record<string, unknown> {
    return value;
  }

  paths: StringDictionary = new StringDictionary(this, 'paths');
  variables: StringDictionary = new StringDictionary(this, 'variables');
  tools: YamlDictionary<string> = new PrimitiveDictionary<string>(this, 'tools', (k, v) => v);
  defines: YamlDictionary<string> = new PrimitiveDictionary<string>(this, 'defines', (k, v) => v);

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    // todo: what validations do we need?
  }

}
