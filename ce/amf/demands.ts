// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isMap, isSeq } from 'yaml';
import { ErrorKind } from '../interfaces/error-kind';
import { ValidationError } from '../interfaces/validation-error';
import { Coerce } from '../yaml/Coerce';
import { Entity } from '../yaml/Entity';
import { EntityMap } from '../yaml/EntityMap';
import { Yaml, YAMLDictionary } from '../yaml/yaml-types';
import { Installs } from './installer';
import { Requires } from './Requires';
import { Settings } from './settings';

const hostFeatures = new Set<string>(['x64', 'x86', 'arm', 'arm64', 'windows', 'linux', 'osx', 'freebsd']);

/**
 * A map of mediaquery to DemandBlock
 */
export class Demands extends EntityMap<YAMLDictionary, DemandBlock> {
  constructor(node?: YAMLDictionary, parent?: Yaml, key?: string) {
    super(DemandBlock, node, parent, key);
  }

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();

    for (const [key, value] of this) {
      if (!isMap(value) && !isSeq(value)) {
        yield {
          message: `Conditional Demand ${key} is not an object`,
          range: value.node?.range || [0, 0, 0],
          category: ErrorKind.IncorrectType
        };
      }
      yield* value.validate();
    }
  }
}

export class DemandBlock extends Entity {
  get error(): string | undefined { return Coerce.String(this.getMember('error')); }
  set error(value: string | undefined) { this.setMember('error', value); }

  get warning(): string | undefined { return Coerce.String(this.getMember('warning')); }
  set warning(value: string | undefined) { this.setMember('warning', value); }

  get message(): string | undefined { return Coerce.String(this.getMember('message')); }
  set message(value: string | undefined) { this.setMember('message', value); }

  seeAlso = new Requires(undefined, this, 'seeAlso');
  requires = new Requires(undefined, this, 'requires');

  settings = new Settings(undefined, this, 'settings');
  install = new Installs(undefined, this, 'install');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
    if (this.exists) {
      yield* this.settings.validate();
      yield* this.requires.validate();
      yield* this.seeAlso.validate();
      yield* this.install.validate();
    }
  }
}