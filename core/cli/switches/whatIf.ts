// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/vcpkg-ce.core';
import { Switch } from '../switch';

export class WhatIf extends Switch {
  switch = 'what-if';
  get help() {
    return [
      i`does not actually perform the action, shows only what would be done`
    ];
  }
}
