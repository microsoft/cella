// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Range, SemVer } from 'semver';
import { isScalar, Scalar } from 'yaml';
import { ValidationError } from '../interfaces/validation-error';
import { VersionReference } from '../interfaces/version-reference';
import { YamlNode } from '../yaml/YamlNode';

// nuget-semver parser doesn't have a ts typings package
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parseRange: any = require('@snyk/nuget-semver/lib/range-parser');

/** @internal */
export class VersionReferenceNode extends YamlNode<Scalar> implements VersionReference {
  protected create() {
    return new Scalar('');
  }

  protected isValidNode(value: any): value is Scalar {
    return isScalar(value);
  }

  private split(): [Range, SemVer | undefined] {

    const v = <string>(<any>this.parent).get(this.nodeName)?.toString().trim();
    if (v) {

      const [, a, b] = /(.+)\s+([\d\\.]+)/.exec(v) || [];

      if (/\[|\]|\(|\)/.exec(v)) {
        // looks like a nuget version range.
        try {
          const range = parseRange(a || v);
          let str = '';
          if (range._components[0].minOperator) {
            str = `${range._components[0].minOperator} ${range._components[0].minOperand}`;
          }
          if (range._components[0].maxOperator) {
            str = `${str} ${range._components[0].maxOperator} ${range._components[0].maxOperand}`;
          }
          const newRange = new Range(str);
          newRange.raw = a || v;

          if (b) {
            const ver = new SemVer(b, true);
            return [newRange, ver];
          }

          return [newRange, undefined];

        } catch (E) {
          //
        }
      }

      if (a) {
        // we have at least a range going on here.
        try {
          const range = new Range(a, true);
          const ver = new SemVer(b, true);
          return [range, ver];
        } catch (E) {
          //
        }
      }
      // the range or version didn't resolve correctly.
      // must be a range alone.
      return [new Range(v, true), undefined];
    }
    return [new Range('*', true), undefined];
  }
  get range() {
    return this.split()[0];
  }
  set range(ver: Range) {
    this.parent.set(this.nodeName, `${ver.raw} ${this.resolved?.raw || ''}`.trim());
  }

  get resolved() {
    return this.split()[1];
  }
  set resolved(ver: SemVer | undefined) {
    this.parent.set(this.nodeName, `${this.range.raw} ${ver?.raw || ''}`.trim());
  }

  get raw(): string {
    return <string>this.parent.get(this.nodeName);
  }

  set raw(value: string) {
    this.parent.set(this.nodeName, new Scalar(value.trim()));
  }
  override toString() {
    return this.parent.get(this.nodeName);
  }

  /** @internal */
  override * validate(): Iterable<ValidationError> {
    //
  }

}
