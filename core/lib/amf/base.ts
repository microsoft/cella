/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { YAMLMap } from 'yaml';
import { StringOrStrings, ValidationError } from '../metadata-format';
import { Strings } from '../util/strings';
import { createNode, getStrings } from '../util/yaml';

/** @internal */
export class NodeBase {
  #name: string;
  #props = <{ [key: string]: Strings; }>{};

  protected strings(property: string) {
    return this.#props[property] || (this.#props[property] = new Strings(this.node, property));
  }

  constructor(protected readonly node: YAMLMap, name: string) {
    this.#name = name;
  }

  get name() {
    return this.#name;
  }

  set name(name: string) {
    // have to use the parent node and move this whole node.
  }

  protected getString(property: string): string | undefined {
    const v = this.node.get(property);
    return typeof v === 'string' ? v : undefined;
  }
  protected setString(property: string, value: string | undefined) {
    if (!value) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }
    this.node.set(property, value);
  }

  protected getNumber(property: string): number | undefined {
    const v = this.node.get(property);
    return typeof v === 'number' ? v : undefined;
  }
  protected setNumber(property: string, value: number | undefined) {
    if (value === undefined) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }
    this.node.set(property, value);
  }

  protected getBoolean(property: string): boolean | undefined {
    const v = this.node.get(property);
    return typeof v === 'boolean' ? v : undefined;
  }

  protected setBoolean(property: string, value: boolean | undefined) {
    if (value === undefined) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }
    this.node.set(property, value);
  }

  protected getStrings(property: string): Array<string> {
    return getStrings(this.node, property);
  }
  protected setStrings(property: string, value: StringOrStrings | undefined) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }

    // force it to copy the values
    if (value instanceof Strings) {
      value = [...value];
    }

    if (Array.isArray(value)) {
      switch (value.length) {
        case 0:
          return this.node.set(property, undefined);
        case 1:
          return this.node.set(property, value[0]);
      }
      return this.node.set(property, createNode(value, true));
    }
    this.node.set(property, value);
  }

  *validate(): Iterable<ValidationError> {
    //
  }

  protected has(element: string) {
    return this.node?.has(element);
  }
}
