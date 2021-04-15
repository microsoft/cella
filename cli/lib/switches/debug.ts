/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { cli } from '../constants';
import { Switch } from '../switch';

export class Debug extends Switch {
  switch = 'debug';
  get help() {
    return [
      i`enables debug mode, displays internal messsages about how ${cli} works`
    ];
  }
}
