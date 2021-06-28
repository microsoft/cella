// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { Switch } from '../switch';

export class Verbose extends Switch {
  switch = 'verbose';
  get help() {
    return [
      i`enables verbose mode, displays verbose messsages about the process`
    ];
  }
}
