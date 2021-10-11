// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isMap, YAMLMap } from 'yaml';
import { ValidationError } from '../interfaces/validation-error';
import { isNullish } from '../util/checks';
import { YamlNode } from './YamlNode';

export class YamlObject extends YamlNode<YAMLMap> {
  protected create() {
    return new YAMLMap();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  override *validate(): Iterable<ValidationError> {
  }

  protected isValidNode(value: any): value is YAMLMap {
    return isMap(value);
  }

  protected setMember(name: string, value: any): void {
    if (isNullish(value)) {
      this.selfNode.delete(name);
      return;
    }
    this.selfNode.set(name, value);
  }

  protected getMember(name: string) {
    return this.selfNode.get(name, false);
  }
}
