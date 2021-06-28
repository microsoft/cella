/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
