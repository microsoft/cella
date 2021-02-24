import { strict } from 'assert';
import { Document, parseDocument } from 'yaml';
import { Collection, YAMLMap, YAMLSeq } from 'yaml/types';
import { StringOrStrings } from '../metadata-format';


/** @internal */
export const createNode = (v: any, b = true) => parseDocument('', { prettyErrors: true }).createNode(v, { wrapScalars: b });

/** @internal */
export function getOrCreateMap(node: Document.Parsed | Collection, name: string): YAMLMap {
  let m = node.get(name);
  if (m instanceof YAMLMap) {
    return m;
  }
  strict.ok(!m, 'node is not a map');
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

