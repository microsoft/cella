// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { fail } from 'assert';
import { parse as parseSemver } from 'semver';
import { YAMLMap } from 'yaml';
import { i } from '../i18n';
import { ErrorKind } from '../interfaces/error-kind';
import { Info } from '../interfaces/info';
import { ValidationError } from '../interfaces/validation-error';
import { checkOptionalArrayOfStrings, checkOptionalString } from '../util/checks';
import { YamlStringSet } from '../yaml/strings';
import { ParentNode } from '../yaml/yaml-node';
import { YamlObject } from '../yaml/YamlObject';

export class InfoNode extends YamlObject implements Info {
  constructor(parent: ParentNode) {
    super(parent, 'info');
  }

  get id(): string {
    return <string>this.getMember('id');
  }

  set id(value: string) {
    this.setMember('id', value);
  }

  get version(): string {
    return <string>this.getMember('version');
  }

  set version(value: string) {
    const v = parseSemver(value);
    this.setMember('version', v?.format() || fail(i`Version '${value}' is not a legal semver version`));
  }

  get summary(): string | undefined {
    return <string>this.getMember('summary') || undefined;
  }

  set summary(value: string | undefined) {
    this.setMember('summary', value);
  }

  get description(): string | undefined {
    return <string>this.selfNode.get('description') || undefined;
  }

  set description(value: string | undefined) {
    this.setMember('description', value);
  }

  get dependencyOnly(): boolean {
    return (new YamlStringSet(this.selfNode, 'options').has('dependencyOnly'));
  }

  set dependencyOnly(value: boolean) {
    if (value) {
      new YamlStringSet(this.selfNode, 'options').set('dependencyOnly');
    } else {
      new YamlStringSet(this.selfNode, 'options').unset('dependencyOnly');
    }
  }

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    if (!(this.selfNode instanceof YAMLMap)) {
      yield { message: i`Incorrect type for '${'info'}' - should be an object`, range: this._range, category: ErrorKind.IncorrectType };
      return; // stop processing in this block
    }

    if (!this.selfNode.has('id')) {
      yield { message: i`Missing identity '${'info.id'}'`, range: this._range, category: ErrorKind.FieldMissing };
    }

    if (!this.selfNode.has('version')) {
      yield { message: i`Missing version '${'info.version'}'`, range: this._range, category: ErrorKind.FieldMissing };
    }

    yield* checkOptionalString(this.selfNode, this._range, 'summary');
    yield* checkOptionalString(this.selfNode, this._range, 'description');
    yield* checkOptionalArrayOfStrings(this.selfNode, this._range, 'options');
  }
}
