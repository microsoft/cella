/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
