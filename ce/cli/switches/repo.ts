// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '../../i18n';
import { Switch } from '../switch';

export class Repo extends Switch {
  switch = 'repo';
  get help() {
    return [
      i`override the path to the repository`
    ];
  }
}