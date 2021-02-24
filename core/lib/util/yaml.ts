import { parseDocument } from 'yaml';

export const createNode = (v: any, b = true) => parseDocument('', { prettyErrors: true }).createNode(v, { wrapScalars: b });
