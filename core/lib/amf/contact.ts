/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Contact, ValidationError } from '../metadata-format';
import { Strings } from '../util/strings';
import { NodeBase } from './base';

/** @internal */
export class ContactNode extends NodeBase implements Contact {
  get email(): string | undefined {
    return this.getString('email');
  }

  set email(address: string | undefined) {
    this.setString('email', address);
  }

  get roles(): Strings {
    return this.strings('role');
  }
  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }

}