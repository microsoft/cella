import { Range, SemVer } from 'semver';
import { Document } from 'yaml';
import { Collection, YAMLMap } from 'yaml/types';
import { VersionReference } from '../metadata-format';
import { createNode } from '../util/yaml';

// nuget-semver parser doesn't have a ts typings package
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parseRange: any = require('@snyk/nuget-semver/lib/range-parser');

/** @internal */
export function setVersionRef(map: YAMLMap, property: string, value: string | VersionReference) {
  if (!value) {
    map.set(property, undefined);
  }
  if (typeof value === 'string') {
    return map.set(property, value);
  }
  if (value.range) {
    map.set(property, createNode(`${value.range.raw || value.range?.toString()} ${value.resolved?.raw || value.resolved?.toString() || ''}`.trim()));
  }
}

/** @internal */
export function getVersionRef(map: YAMLMap, property: string) {
  return (map.has(property)) ? new VRef(map, property) : <VersionReference><unknown>undefined;
}


/** @internal */
export class VRef implements VersionReference {
  /** @internal */
  constructor(private node: Document.Parsed | Collection, private prop: string) {
  }
  private split(): [Range, SemVer | undefined] {

    const v = <string>this.node.get(this.prop)?.toString().trim();
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
    this.node.set(this.prop, createNode(`${ver.raw} ${this.resolved?.raw || ''}`.trim()));
  }

  get resolved() {
    return this.split()[1];
  }
  set resolved(ver: SemVer | undefined) {
    this.node.set(this.prop, createNode(`${this.range.raw} ${ver?.raw || ''}`.trim()));
  }

  get raw(): string {
    return this.node.get(this.prop);
  }

  toString() {
    return this.node.get(this.prop);
  }
}
