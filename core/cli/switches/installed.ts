// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/vcpkg-ce.core';
import { Switch } from '../switch';

export class Installed extends Switch {
  switch = 'installed';
  get help() {
    return [
      i`shows the _installed_ artifacts`
    ];
  }
}
