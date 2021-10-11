// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { fail } from 'assert';
import { i } from '../i18n';
import { GitRegistry } from '../interfaces/git-registry';
import { LocalRegistry } from '../interfaces/local-registry';
import { NugetRegistry } from '../interfaces/nuget-registry';
import { ValidationError } from '../interfaces/validation-error';
import { StringsSequence } from '../yaml/strings';
import { ParentNode } from '../yaml/yaml-node';
import { YamlObject } from '../yaml/YamlObject';

export class RegistryNode extends YamlObject {
  // ArtifactSource nodes are shape-polymorphic.

  location = new StringsSequence(this, 'location');
}

class NugetRegistryNode extends RegistryNode implements NugetRegistry {

  override location = new StringsSequence(this, 'nuget');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    //
  }
}

class LocalRegistryNode extends RegistryNode implements LocalRegistry {
  constructor(parent: ParentNode, sourceName: string) {
    super(parent, sourceName);
  }
  override location = new StringsSequence(this, 'path');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    //
  }
}

class GitRegistryNode extends RegistryNode implements GitRegistry {
  constructor(parent: ParentNode, sourceName: string) {
    super(parent, sourceName);
  }
  override location = new StringsSequence(this, 'git');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    // yield* super.validate();
  }
}

/** internal */
export function createRegistryNode(parent: ParentNode, name: string) {
  // detect type by presence of fields
  if (parent.selfNode.has('path')) {
    return new LocalRegistryNode(parent, name);
  }
  if (parent.selfNode.has('nupkg')) {
    return new NugetRegistryNode(parent, name);
  }
  if (parent.selfNode.has('git')) {
    return new GitRegistryNode(parent, name);
  }
  fail(i`unknown source node type`);
}

