/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
