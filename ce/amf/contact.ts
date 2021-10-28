// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Contact } from '../interfaces/metadata/contact';
import { ValidationError } from '../interfaces/validation-error';
import { YamlDictionary } from '../yaml/MapOf';
import { StringsSequence } from '../yaml/strings';
import { ParentNode } from '../yaml/yaml-node';
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


export class Contacts extends YamlDictionary<Contact> {
  constructor(parent: ParentNode) {
    super(parent, 'contacts');
  }
  protected override  wrapMember(key: string, value: any): Contact {
    return new ContactNode(this, key);
  }
  add(name: string) {
    return this.getOrCreate(name);
  }
}