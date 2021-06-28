// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { Switch } from '../switch';

export class Force extends Switch {
  switch = 'force';
  get help() {
    return [
      i`proceeds with the (potentially dangerous) action without confirmation`
    ];
  }
}
