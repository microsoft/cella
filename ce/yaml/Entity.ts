// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isNullish } from '../util/checks';
import { Primitive, Yaml, YAMLDictionary } from './yaml-types';

/** An object that is backed by a YamlMAP node */

export /** @internal */ class Entity extends Yaml<YAMLDictionary> {
  /**@internal*/ static override create(): YAMLDictionary {
    return new YAMLDictionary();
  }

  protected setMember(name: string, value: Primitive | undefined): void {
    this.assert(true);

    if (isNullish(value)) {
      this.node!.delete(name);
      return;
    }

    this.node!.set(name, value);
  }

  protected getMember(name: string): Primitive | undefined {
    return <Primitive | undefined>this.node?.get(name, false);
  }
}
