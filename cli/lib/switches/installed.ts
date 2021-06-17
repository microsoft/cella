/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { Switch } from '../switch';

export class Installed extends Switch {
  switch = 'installed';
  get help() {
    return [
      i`shows the _installed_ artifacts`
    ];
  }
}
