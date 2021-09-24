// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isPair, isScalar, isSeq, Pair, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { isNullish, isPrimitive } from '../util/checks';
import { PrimitiveSequence } from './PrimitiveSequence';

export class StringsSequence extends PrimitiveSequence<string> {
  wrapValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return (isNullish(value?.value) ? value : value.value).toString();
  }

  add(value: string | Array<string>): void {
    if (Array.isArray(value)) { // push all
      for (const each of value) {
        this.add(each);
      }
      return;
    }

    if (this.isCreated) {
      const n = <any>this.selfNode;
      if (n) {

        if (isPrimitive(n)) {
          if (n == value) {
            // it's already the only value
            return;
          }
          // set the whole value as an array
          const seq = new YAMLSeq();
          seq.add(new Scalar(n));
          seq.add(new Scalar(value));
          return this.parent.set(this.nodeName, seq);
        }

        if (isScalar(n)) {
          // it's a scalar, so we need to make it an array
          const seq = new YAMLSeq();
          seq.add(new Scalar(n.value));
          seq.add(new Scalar(value));
          return this.parent.set(this.nodeName, seq);
        }

        if (isSeq(n)) {
          if (n.items.find((each: any) => each === value || each.value == value)) {
            // it's already in the set
            return;
          }
          n.add(new Scalar(value));
          return;
        }
        throw new Error('This should not be possible.');
      }
    }

    // we don't have a node yet, so we need to create it
    return this.parent.set(this.nodeName, new Scalar(value));
  }

  remove(val: string | Array<string>): void {
    if (Array.isArray(val)) { // push all
      for (const each of val) {
        this.remove(each);
      }
      return;
    }
    const n = this.selfNode;
    if (n) {
      if (isPrimitive(n)) {
        if (n == val) {
          this.parent.delete(this.nodeName);
          return;
        }
        // the value isn't there.
        return;
      }
      if (isScalar(n)) {
        if (n.value == val) {
          this.parent.delete(this.nodeName);
          return;
        }
        // the value isn't there.
        return;
      }
      if (isSeq(n)) {
        const p = (<Array<Pair<number, string | any>>><any>n.items).findIndex((p) => p.value == val || p.value.value == val);
        if (p !== undefined) {
          n.delete(p);
        }
      }

      // we don't have one
    }
  }
}

/** Represents a set of options as a YAML sequence of strings. Intended for very small sets, all operations are O(n). */
export class YamlStringSet {
  constructor(private readonly parent: YAMLMap, private readonly name: string) { }

  /** Tests whether this string set contains `value`. */
  has(value: string): boolean {
    const rawData = this.parent.get(this.name);
    if (isSeq(rawData)) {
      for (const entry of rawData.items) {
        if (isScalar(entry) && entry.value === value) {
          return true;
        }
      }
    }

    return false;
  }

  /** Sets that the value `value` is in the set. If the string set's element is not a YAML
    * sequence, it will be overwritten. Returns whether the element was inserted. */
  set(value: string): boolean {
    const items = this.parent.items;
    for (let idx = 0; idx < items.length; ++idx) {
      const item = items[idx];
      // skip items in the map that are not `name`.
      if (!isPair(item) || !isScalar(item.key) || item.key.value !== this.name) {
        continue;
      }

      if (!isSeq(item.value)) {
        // if `name` isn't already a sequence, overwrite it with one
        const newSeq = new YAMLSeq();
        newSeq.add(new Scalar(value));
        item.value = newSeq;
        return true;
      }

      // check if `value` is already in the sequence
      for (const entry of item.value.items) {
        if (isScalar(entry) && entry.value === value) {
          return false;
        }
      }

      // add the item to the sequence
      item.value.add(new Scalar(value));
      return true;
    }

    // the set isn't in the document at all
    const newSeq = new YAMLSeq();
    newSeq.add(new Scalar(value));
    this.parent.add(new Pair(new Scalar(this.name), newSeq));
    return true;
  }

  /** removes the value `value` from the set. If the string set's element is not a YAML sequence,
   * has no effects. Returns whether the element existed.
   */
  unset(value: string): boolean {
    const rawData = this.parent.get(this.name);
    if (isSeq(rawData)) {
      const items = rawData.items;
      for (let idx = 0; idx < items.length; ++idx) {
        const entry = items[idx];
        if (isScalar(entry) && entry.value === value) {
          rawData.delete(idx);
          if (items.length === 0) {
            this.parent.delete(this.name);
          }
          return true;
        }
      }
    }
    return false;
  }
}
