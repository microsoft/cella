// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ErrorKind } from '../interfaces/error-kind';
import { LocalRegistry } from '../interfaces/metadata/registries/local-registry';
import { ValidationError } from '../interfaces/validation-error';
import { StringsSequence } from '../yaml/strings';
import { NonNavigableYamlObject } from '../yaml/yaml-node';

export abstract class RegistryNode extends NonNavigableYamlObject {
  // KnownArtifactRegistryTypes nodes are shape-polymorphic.
  abstract readonly location: StringsSequence;

  get kind(): string {
    return <string>this.selfNode.get('kind');
  }

  set kind(kind: string | undefined) {
    this.setMember('kind', kind);
  }

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    //
    if (this.kind === undefined) {
      yield {
        message: 'Registry missing \'kind\'',
        range: this._range,
        category: ErrorKind.FieldMissing,
      };
    }
  }
}

export class LocalRegistryNode extends RegistryNode implements LocalRegistry {
  override location = new StringsSequence(this, 'path');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    //
    if (this.kind !== 'artifact') {
      yield {
        message: 'Registry \'kind\' is not correct for LocalRegistry ',
        range: this._range,
        category: ErrorKind.IncorrectType,
      };
    }
  }
}


export class RemoteArtifactRegistry extends RegistryNode implements LocalRegistry {
  override location = new StringsSequence(this, 'url');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    //
    if (this.kind !== 'artifact') {
      yield {
        message: 'Registry \'kind\' is not correct for RemoteArtifactRegistry ',
        range: this._range,
        category: ErrorKind.IncorrectType,
      };
    }
  }
}

