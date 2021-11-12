// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Strings } from '../collections';
import { Validation } from '../validation';

/** A person/organization/etc who either has contributed or is connected to the artifact */

export interface Contact extends Validation {
  // name: string;
  email?: string;

  readonly roles: Strings;

}
