// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { BaseMap } from './BaseMap';
import { Primitive } from './yaml-types';


export /** @internal */ class ScalarMap<TElement extends Primitive = Primitive> extends BaseMap {
  get(key: string): TElement | undefined {
    return <TElement>this.getValue(key);
  }

  set(key: string, value: TElement) {
    this.assert(true);
    this.node!.set(key, value);
  }
}
