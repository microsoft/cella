// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Contact } from '../interfaces/metadata/contact';
import { ValidationError } from '../interfaces/validation-error';
import { StringsSequence } from '../yaml/strings';
import { YamlObject } from '../yaml/YamlObject';

/** @internal */
export class ContactNode extends YamlObject implements Contact {
  get name() {
    return this.nodeName;
  }

  get email(): string | undefined {
    return <string>this.selfNode.get('email');
  }

  set email(address: string | undefined) {
    this.setMember('email', address);
  }

  readonly roles = new StringsSequence(this, 'role');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}
