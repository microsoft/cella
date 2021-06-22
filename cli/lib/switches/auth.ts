// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { Switch } from '../switch';

export class GithubAuthToken extends Switch {
  switch = 'github-auth-token';
  get help() {
    return [
      i`specify a github authentication token to access protected github repositories/urls`
    ];
  }
}