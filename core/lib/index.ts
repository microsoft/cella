/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { SemVer } from 'semver';
import BTree from 'sorted-btree';
import { intersect } from './intersect';
import { Dictionary, items, keys } from './linq';
import { isIterable } from './util/checks';

/* eslint-disable @typescript-eslint/ban-types */

/** Keys have to support toString so that we can serialize them */
interface HasToString {
  toString(): string;
}

/**
 * A Catalog is a index of Indexes.
 *
 * A listing of
 *
 * @param TGraph The type of object to create an index for
 * @param TIndex the custom index type.
 */
export class Catalog<TGraph extends Object, TIndex extends Index<TGraph, TIndex>> {
  private index: TIndex;
  indexOfTargets = new Array<string>();

  /**
   * Creates a catalog for fast searching.
   *
   * @param indexConstructor the class for the custom index.
   */
  constructor(protected indexConstructor: new (index: Catalog<TGraph, TIndex>) => TIndex) {
    this.index = new indexConstructor(this);
  }

  /**
   * Serializes the catalog to a javascript object graph that can be persisted.
   */
  serialize() {
    return {
      items: this.indexOfTargets,
      indexes: this.index.serialize()
    };
  }

  /**
   * Deserializes an object graph to the expected indexes.
   *
   * @param content the object graph to deserialize.
   */
  deserialize(content: any) {
    this.indexOfTargets = content.items;
    this.index.deserialize(content.indexes);
  }

  /**
   * Returns a clone of the index that can be searched, which narrows the list of
   */
  get where(): TIndex {
    // clone the index so that the consumer can filter on it.
    return this.index.clone();
  }

  /** inserts an object into the index */
  insert(content: TGraph, target: string) {
    const n = this.indexOfTargets.push(target) - 1;
    for (const indexKey of this.index.keys.values()) {
      indexKey.insert(content, n);
    }
  }
}

/** deconstructs a function declaration so that we can figure out the most logical path  */
function deconstruct(accessor: string) {
  const params = /\(?([^(=)]+)\)?=>/g.exec(accessor);
  let names = ['i'];
  if (params) {
    names = params[1].split(',').map(each => each.trim());
  }

  // find the part that looks for the value
  let path = names.slice(1);
  const expression = /=>.*i\.(.*?)(;| |\n|$)/g.exec(accessor);
  if (expression) {
    path = expression[1].replace(/\[.*?\]/g, '').replace(/[^\w.]/g, '').replace(/\.+/g, '.').split('.');
  }

  strict.ok(path.length, 'Unable to deconstruct the path to the element');

  return path;
}

/**
 * A Key is a means to creating a searchable, sortable index
 */
abstract class Key<TGraph extends Object, TKey extends HasToString, TIndex extends Index<TGraph, any>> {

  /** child class must implement a standard compare function */
  abstract compare(a: TKey, b: TKey): number;

  /** child class must implement a function to transform value into comparable key */
  abstract coerce(value: TKey | string): TKey;

  protected nestedKeys = new Array<Key<TGraph, any, TIndex>>();
  protected keys = new BTree<TKey, Set<number>>(undefined, this.compare);
  protected words = new BTree<string, Set<number>>();
  protected index: TIndex;
  protected path: Array<string>;

  /** attaches a nested key in the index. */
  with<TNestedKey extends Dictionary<Key<TGraph, any, TIndex>>>(nestedKey: TNestedKey): Key<TGraph, TKey, TIndex> & TNestedKey {
    for (const child of keys(nestedKey)) {
      this.nestedKeys.push(nestedKey[child]);
    }
    return intersect(this, nestedKey);
  }

  /** returns the textual 'identity' of this key */
  get identity() {
    return `${this.constructor.name}/${this.path.join('.')}`;
  }

  /** persists the key to an object graph */
  serialize() {
    const result = <any>{
      keys: {},
      words: {},
    };
    for (const each of this.keys.entries()) {
      result.keys[each[0]] = [...each[1]];
    }
    for (const each of this.words.entries()) {
      result.words[each[0]] = [...each[1]];
    }
    return result;
  }

  /** deserializes an object graph back into this key */
  deserialize(content: any) {
    for (const [key, ids] of items(content.keys)) {
      this.keys.set(this.coerce(key), new Set(<any>ids));
    }
    for (const [key, ids] of items(content.words)) {
      this.words.set(key, new Set(<any>ids));
    }
  }

  /** adds key value to this Key */
  protected addKey(each: TKey, n: number) {
    let set = this.keys.get(each);
    if (!set) {
      set = new Set<number>();
      this.keys.set(each, set);
    }
    set.add(n);
  }

  /** adds a 'word' value to this key  */
  protected addWord(each: TKey, n: number) {
    const words = each.toString().split(/\W/);
    for (const word of words.filter(i => i)) {
      let set = this.words.get(word);
      if (!set) {
        set = new Set<number>();
        this.words.set(word, set);
      }
      set.add(n);
    }
  }

  /** processes an object to generate key/word values for it. */
  insert(graph: TGraph, n: number) {
    let value = this.accessor(graph);
    if (value) {
      value = <Array<TKey>>(Array.isArray(value) ? value
        : typeof value === 'string' ? [value]
          : isIterable(value) ? [...value] : [value]);

      this.insertKey(graph, n, value);
    }
  }

  /** insert the key/word values and process any children */
  private insertKey(graph: TGraph, n: number, value: TKey | Iterable<TKey>) {
    if (isIterable(value)) {
      for (const each of value) {
        this.addKey(each, n);
        this.addWord(each, n);
        if (this.nestedKeys) {
          for (const child of this.nestedKeys) {
            const v = child.accessor(graph, each.toString());
            if (v) {
              child.insertKey(graph, n, v);
            }
          }
        }
      }
    } else {
      this.addKey(value, n);
      this.addWord(value, n);
    }

  }

  /** construct a Key */
  constructor(index: Index<TGraph, TIndex>, public accessor: (value: TGraph, ...args: Array<any>) => TKey | undefined | Array<TKey> | Iterable<TKey>) {
    index.index;

    this.path = deconstruct(accessor.toString());
    this.index = <TIndex><unknown>index;
    this.index.keys.set(this.identity, this);
  }

  /** word search */
  contains(value: TKey | string): TIndex {
    if (value !== undefined && value !== '') {
      const matches = this.words.get(value.toString());
      if (matches) {
        this.index.filter(matches);
      }
    }
    return this.index;
  }

  /** exact match search */
  equals(value: TKey | string): TIndex {
    if (value !== undefined && value !== '') {
      const matches = this.keys.get(this.coerce(value));
      if (matches) {
        this.index.filter(matches);
      }
    }
    return this.index;
  }

  /** metadata value is greater than search */
  greaterThan(value: TKey | string): TIndex {
    const max = this.keys.maxKey();
    if (max && value !== undefined && value !== '') {
      const set = new Set<number>();
      this.keys.forRange(this.coerce(value), max, true, (k, v) => {
        for (const n of v) {
          set.add(n);
        }
      });
      this.index.filter(set.values());
    }
    return this.index;
  }

  /** metadata value is less than search */
  lessThan(value: TKey | string): TIndex {
    const min = this.keys.minKey();
    if (min && value !== undefined && value !== '') {
      value = this.coerce(value);
      const set = new Set<number>();
      this.keys.forRange(min, this.coerce(value), false, (k, v) => {
        for (const n of v) {
          set.add(n);
        }
      });
      this.index.filter(set.values());
    }
    return this.index;
  }

  /** regex search -- WARNING: slower */
  match(regex: string): TIndex {
    // This could be faster if we stored a reverse lookup
    // array that had the id for each key, but .. I don't
    // think the perf will suffer much doing it this way.

    const set = new Set<number>();

    for (const node of this.keys.entries()) {
      for (const id of node[1]) {
        if (!this.index.selectedElements || this.index.selectedElements.has(id)) {
          // it's currently in the keep list.
          if (regex.match(node.toString())) {
            set.add(id);
          }
        }
      }
    }

    this.index.filter(set.values());
    return this.index;
  }
  /** substring match -- slower */
  startsWith(value: TKey | string): TIndex {
    // ok, I'm being lazy here. I can add a check to see if we're past
    // the point where this could be a match, but I don't know if I'll
    // even need this enough to keep it.

    const set = new Set<number>();

    for (const node of this.keys.entries()) {
      for (const id of node[1]) {
        if (!this.index.selectedElements || this.index.selectedElements.has(id)) {
          // it's currently in the keep list.
          if (node[0].toString().startsWith((<any>value).toString())) {
            set.add(id);
          }
        }
      }
    }

    this.index.filter(set.values());
    return this.index;
  }
  /** substring match -- slower */
  endsWith(value: TKey | string): TIndex {
    // Same thing here, but I'd have to do a reversal of all the strings.

    const set = new Set<number>();

    for (const node of this.keys.entries()) {
      for (const id of node[1]) {
        if (!this.index.selectedElements || this.index.selectedElements.has(id)) {
          // it's currently in the keep list.
          if (node[0].toString().endsWith((<any>value).toString())) {
            set.add(id);
          }
        }
      }
    }

    this.index.filter(set.values());
    return this.index;
  }
}

/** An index key for string values. */
export class StringKey<TGraph extends Object, TIndex extends Index<TGraph, any>> extends Key<TGraph, string, TIndex> {
  compare(a: string, b: string): number {
    if (a && b) {
      return a.localeCompare(b);
    }
    if (a) {
      return 1;
    }
    if (b) {
      return 1;
    }
    return 0;
  }
  /** impl: transform value into comparable key */
  coerce(value: string): string {
    //
    return value;
  }
}


/** An index key for string values. Does not support 'word' searches */
export class SemverKey<TGraph extends Object, TIndex extends Index<TGraph, any>> extends Key<TGraph, SemVer, TIndex> {
  compare(a: SemVer, b: SemVer): number {
    return a.compare(b);
  }
  coerce(value: SemVer | string): SemVer {
    if (typeof value === 'string') {
      return new SemVer(value);
    }
    return value;
  }
  protected addWord(each: SemVer, n: number) {
    // no parts
  }

  serialize() {
    const result = super.serialize();
    result.words = undefined;

    return result;
  }
}

/**
 * Base class for a custom Index
 *
 * @param TGraph - the object kind to be indexing
 * @param TSelf - the child class that is being constructed.
 */
export abstract class Index<TGraph, TSelf extends Index<TGraph, any>> {
  /** the collection of keys in this index */
  readonly keys = new Map<string, Key<TGraph, any, TSelf>>();

  /**
   * the selected element ids.
   *
   * if this is `undefined`, the whole set is currently selected
   */
  selectedElements?: Set<number>;

  /**
   * filter the selected elements down to an intersetction of the {selectedelements} ∩ {idsToKeep}
   *
   * @param idsToKeep the element ids to intersect with.
   */
  filter(idsToKeep: Iterable<number>) {
    if (this.selectedElements) {
      const selected = new Set<number>();
      for (const each of idsToKeep) {
        if (this.selectedElements.has(each)) {
          selected.add(each);
        }
      }
      this.selectedElements = selected;
    } else {
      this.selectedElements = new Set<number>(idsToKeep);
    }
  }

  /**
   * Serializes this index to a persistable object graph.
   */
  serialize() {
    const result = <any>{
    };
    for (const [key, impl] of this.keys.entries()) {
      result[key] = impl.serialize();
    }
    return result;
  }

  /**
   * Deserializes a persistable object graph into the index.
   *
   * replaces any existing data in the index.
   * @param content the persistable object graph.
   */
  deserialize(content: any) {
    for (const [key, impl] of this.keys.entries()) {
      impl.deserialize(content[key]);
    }
  }

  /**
   * returns the selected
   */
  get items(): Array<string> {
    return this.selectedElements ? [...this.selectedElements].map(each => this.index.indexOfTargets[each]) : this.index.indexOfTargets;
  }

  /** @internal */
  protected constructor(public index: Catalog<TGraph, TSelf>) {
  }

  /** Clones this index so that the consumer can perform ever-narrowing search criteria on it. */
  clone(): this {
    return Object.setPrototypeOf({ ... this }, Object.getPrototypeOf(this));
  }
}

