// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { Switch } from '../switch';

export class Clear extends Switch {
  switch = 'clear';
  get help() {
    return [
      i`removes all files in the local cache.`
    ];
  }
}
