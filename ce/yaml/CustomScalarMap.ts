// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isScalar, Scalar } from 'yaml';
import { BaseMap } from './BaseMap';
import { EntityFactory, Yaml, YAMLDictionary } from './yaml-types';


export /** @internal */ class CustomScalarMap<TElement extends Yaml<Scalar>> extends BaseMap {
  protected constructor(protected factory: EntityFactory<Scalar, TElement>, node?: YAMLDictionary, parent?: Yaml, key?: string) {
    super(node, parent, key);
  }

  get(key: string): TElement | undefined {
    if (this.node) {
      const v = this.node!.get(key, true);
      if (isScalar(v)) {
        return new this.factory(v, this, key);
      }
    }
    return undefined;
  }

  set(key: string, value: TElement) {
    if (value === undefined || value === null) {
      throw new Error('Cannot set undefined or null to a map');
    }

    if (value.empty) {
      throw new Error('Cannot set an empty entity to a map');
    }

    if (!this.node) {
      // if we don't have a node at the moment, we need to create one.
      this.assert(true);
    }

    this.node!.set(key, value.node);
  }
}
