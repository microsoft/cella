/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fail } from 'assert';
import { parse as parseSemver } from 'semver';
import { YAMLMap } from 'yaml';
import { i } from '../i18n';
import { ErrorKind, Info, ValidationError } from '../metadata-format';
import { checkOptionalArrayOfStrings, checkOptionalString } from '../util/checks';
import { YamlStringSet } from '../util/strings';
import { createNode } from '../util/yaml';

/** @internal */
export class InfoNode implements Info {
  /** @internal */
  constructor(protected node: YAMLMap) {
  }

  get id(): string {
    return <string>this.node.get('id');
  }

  set id(value: string) {
    this.node.set('id', createNode(value));
  }

  get version(): string {
    return <string>this.node.get('version');
  }

  set version(value: string) {
    const v = parseSemver(value);
    this.node.set('version', v?.format() || fail(i`Version '${value}' is not a legal semver version`));
  }

  get summary(): string | undefined {
    return <string>this.node.get('summary') || undefined;
  }

  set summary(value: string | undefined) {
    this.node.set('summary', value);
  }

  get description(): string | undefined {
    return <string>this.node.get('description') || undefined;
  }
  set description(value: string | undefined) {
    this.node.set('description', value);
  }

  get dependencyOnly(): boolean {
    return (new YamlStringSet(this.node, 'options').has('dependencyOnly'));
  }
  set dependencyOnly(value: boolean) {
    if (value) {
      new YamlStringSet(this.node, 'options').set('dependencyOnly');
    } else {
      new YamlStringSet(this.node, 'options').unset('dependencyOnly');
    }
  }

  protected get range(): [number, number, number] {
    return <any>this.node.range!;
  }

  *validate(): Iterable<ValidationError> {
    if (!(this.node instanceof YAMLMap)) {
      yield { message: i`Incorrect type for '${'info'}' - should be an object`, range: this.range, category: ErrorKind.IncorrectType };
      return; // stop processing in this block
    }

    if (!this.node.has('id')) {
      yield { message: i`Missing identity '${'info.id'}'`, range: this.range, category: ErrorKind.FieldMissing };
    }

    if (!this.node.has('version')) {
      yield { message: i`Missing version '${'info.version'}'`, range: this.range, category: ErrorKind.FieldMissing };
    }

    yield* checkOptionalString(this.node, this.range, 'summary');
    yield* checkOptionalString(this.node, this.range, 'description');
    yield* checkOptionalArrayOfStrings(this.node, this.range, 'options');
  }
}
