// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { StringsSequence } from '../yaml/strings';
import { YamlObject } from '../yaml/YamlObject';
import { Contact, ValidationError } from './metadata-format';

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
