// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { ValidationError } from '../interfaces/validation-error';
import { ParentNode } from './yaml-node';


export abstract class YamlNode<TNode extends YAMLMap | Scalar | YAMLSeq> {
  constructor(parent: ParentNode, protected readonly nodeName: string) {
    this.#parent = parent;
  }

  #parent: ParentNode;
  protected get parent() {
    return this.#parent.selfNode;
  }

  get isCreated(): boolean {
    return !!this.parent?.has(this.nodeName);
  }

  protected abstract create(): TNode;

  protected get self(): TNode | undefined {
    const result = this.parent?.get(this.nodeName, true);
    return this.isValidNode(result) ? <TNode>result : undefined;
  }

  public get selfNode(): TNode {
    return this.self || this.create();
  }

  get _range(): [number, number, number] {
    return this.self?.range || [0, 0, 0];
  }

  protected abstract isValidNode(value: any): value is TNode;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *validate(): Iterable<ValidationError> {
  }
}
