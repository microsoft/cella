// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { KnownArtifactRegistryTypes } from '../interfaces/metadata-format';
import { ObjectSequence } from '../yaml/ObjectSequence';
import { ParentNode } from '../yaml/yaml-node';
import { LocalRegistryNode, RemoteArtifactRegistry } from './artifact-source';


/**
 * The collection of registries in manifest
 */
export class Registries extends ObjectSequence<KnownArtifactRegistryTypes> {
  constructor(parent: ParentNode) {
    super(parent, 'registries');
  }

  override wrapValue(value: any): KnownArtifactRegistryTypes | undefined {
    if (value.kind === 'artifact' && value.path) {
      return new LocalRegistryNode(this, value);
    }
    if (value.kind === 'artifact' && value.url) {
      return new RemoteArtifactRegistry(this, value);
    }

    return undefined;
  }

  get values() {
    const result = new Array<KnownArtifactRegistryTypes>();
    for (const each of this.selfNode.items) {
      const v = this.wrapValue(each);
      if (v) {
        result.push(v);
      }
    }
    return result;
  }
}
