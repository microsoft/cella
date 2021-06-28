/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { Switch } from '../switch';

export class WhatIf extends Switch {
  switch = 'what-if';
  get help() {
    return [
      i`does not actually perform the action, shows only what would be done`
    ];
  }
}
