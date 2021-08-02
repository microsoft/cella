// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

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
