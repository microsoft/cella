// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isMap, isSeq } from 'yaml';
import { Dictionary } from '../interfaces/collections';
import { ErrorKind } from '../interfaces/error-kind';
import { KnownArtifactRegistryTypes } from '../interfaces/metadata/metadata-format';
import { Registry as IRegistry } from '../interfaces/metadata/registries/artifact-registry';
import { ValidationError } from '../interfaces/validation-error';
import { Coerce } from '../yaml/Coerce';
import { Entity } from '../yaml/Entity';
import { Strings } from '../yaml/strings';
import { Node, Yaml, YAMLDictionary, YAMLSequence } from '../yaml/yaml-types';

export class Registries extends Yaml<YAMLDictionary | YAMLSequence> implements Dictionary<KnownArtifactRegistryTypes>, Iterable<[string, KnownArtifactRegistryTypes]>  {
  *[Symbol.iterator](): Iterator<[string, KnownArtifactRegistryTypes]> {
    if (isMap(this.node)) {
      for (const { key, value } of this.node.items) {
        const v = this.createInstance(value);
        if (v) {
          yield [key, v];
        }
      }
    }
    if (isSeq(this.node)) {
      for (const item of this.node.items) {
        if (isMap(item)) {
          const name = Coerce.String(item.get('name'));
          if (name) {
            const v = this.createInstance(item);
            if (v) {
              yield [name, v];
            }
          }
        }
      }
    }
  }
  clear(): void {
    this.dispose(true);
  }
  delete(key: string): boolean {
    const n = this.node;
    if (isMap(n)) {
      const result = n.delete(key);
      this.dispose();
      return result;
    }
    if (isSeq(n)) {
      let removed = false;
      const items = n.items;
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (isMap(item) && item.get('name') === key) {
          removed ||= n.delete(i);
        }
      }
      this.dispose();
      return removed;
    }
    return false;
  }
  get(key: string): KnownArtifactRegistryTypes | undefined {
    const n = this.node;
    if (isMap(n)) {
      return this.createInstance(<Node>n.get(key, true));
    }
    if (isSeq(n)) {
      for (const item of n.items) {
        if (isMap(item) && item.get('name') === key) {
          return this.createInstance(<Node>item);
        }
      }
    }
    return undefined;
  }

  has(key: string): boolean {
    const n = this.node;
    if (isMap(n)) {
      return n.has(key);
    }
    if (isSeq(n)) {
      for (const item of n.items) {
        if (isMap(item) && item.get('name') === key) {
          return true;
        }
      }
    }
    return false;
  }

  get length(): number {
    if (isMap(this.node) || isSeq(this.node)) {
      return this.node.items.length;
    }
    return 0;
  }
  get keys(): Array<string> {
    if (isMap(this.node)) {
      return this.node.items.map(({ key }) => Coerce.String(key) || '');
    }
    if (isSeq(this.node)) {
      const result = new Array<string>();
      for (const item of this.node.items) {
        if (isMap(item)) {
          const n = Coerce.String(item.get('name'));
          if (n) {
            result.push(n);
          }
        }
      }
      return result;
    }
    return [];
  }

  protected createInstance(node: Node) {
    if (isMap(node)) {
      const k = node.get('kind');
      const p = node.get('path');

      if (k === 'artifact' && node.has('path')) {
        return new LocalRegistry(node, this);
      }
      if (k === 'artifact' && node.has('url')) {
        return new RemoteRegistry(node, this);
      }
    }
    return undefined;
  }
}

export class Registry extends Entity implements IRegistry {

  get registryKind(): string | undefined { return Coerce.String(this.getMember('kind')); }
  set registryKind(value: string | undefined) { this.setMember('kind', value); }

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    //
    if (this.registryKind === undefined) {
      yield {
        message: 'Registry missing \'kind\'',
        range: this,
        category: ErrorKind.FieldMissing,
      };
    }
  }
}

class LocalRegistry extends Registry {
  readonly location = new Strings(undefined, this, 'path');
  /** @internal */
  override *validate(): Iterable<ValidationError> {
    //
    if (this.registryKind !== 'artifact') {
      yield {
        message: 'Registry \'kind\' is not correct for LocalRegistry ',
        range: this,
        category: ErrorKind.IncorrectType,
      };
    }
  }
}

class RemoteRegistry extends Registry {
  readonly location = new Strings(undefined, this, 'url');
  override *validate(): Iterable<ValidationError> {
    //
    if (this.registryKind !== 'artifact') {
      yield {
        message: 'Registry \'kind\' is not correct for LocalRegistry ',
        range: this,
        category: ErrorKind.IncorrectType,
      };
    }
  }
}
