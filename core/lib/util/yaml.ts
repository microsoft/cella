/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Document, parseDocument } from 'yaml';
import { Collection, Node, Pair, Scalar, YAMLMap, YAMLSeq } from 'yaml/types';
import { Type } from 'yaml/util';
import { StringOrStrings } from '../metadata-format';


/** @internal */
export const createNode = (v: any, b = true) => parseDocument('', { prettyErrors: false, keepCstNodes: true }).createNode(v, { wrapScalars: b });

/** @internal */
export function getOrCreateMap(node: Document.Parsed | Collection, name: string): YAMLMap {
  let m = node.get(name);
  if (m) {
    return m;
  }
  // these should be picked up in validate()
  // strict.ok(m instanceof YAMLMap, 'node is not a map');

  node.set(name, m = new YAMLMap());
  return m;
}


export function getStrings(node: Document.Parsed | Collection, name: string): Array<string> {
  const r = node.get(name);
  if (r) {
    if (r instanceof YAMLSeq) {
      return r.items.map(each => each.value);
    }
    if (typeof r === 'string') {
      return [r];
    }
  }
  return [];
}

export function setStrings(node: Document.Parsed | Collection, name: string, value: StringOrStrings) {
  if (Array.isArray(value)) {
    switch (value.length) {
      case 0:
        return node.set(name, undefined);
      case 1:
        return node.set(name, value[0]);
    }
    return node.set(name, createNode(value, true));
  }
  node.set(name, value);
}


/** @internal */
export function isMap(item: Node): item is YAMLMap {
  return item && item.type === Type.MAP;
}

/** @internal */
export function isSequence(item: Node): item is YAMLSeq {
  return item && item.type === Type.SEQ;
}

export function getPair(from: Collection, name: string): Pair | undefined {
  return from.items.find(each => (<Scalar>each.key).value === name);
}

export function column(node: Node, addOffset?: number | { column: number }) {
  return (node.cstNode?.rangeAsLinePos?.start.col || 0) + (Number(addOffset) || Number((<any>addOffset)?.column) || 0);
}
export function line(node: Node, addOffset?: number | { line: number }) {
  return (node.cstNode?.rangeAsLinePos?.start.line || 0) + (Number(addOffset) || Number((<any>addOffset)?.line) || 0);
}