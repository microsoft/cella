// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { fail } from 'assert';
import { i } from '../i18n';
import { GitArtifactSource, LocalArtifactSource, NuGetArtifactSource, ValidationError } from '../metadata-format';
import { StringsSequence } from '../yaml/strings';
import { ParentNode } from '../yaml/yaml-node';
import { YamlObject } from '../yaml/YamlObject';

export class SourceNode extends YamlObject {
  // ArtifactSource nodes are shape-polymorphic.

  location = new StringsSequence(this, 'location');
}

class NugetSourceNode extends SourceNode implements NuGetArtifactSource {

  location = new StringsSequence(this, 'nuget');

  /** @internal */
  *validate(): Iterable<ValidationError> {
    //
  }
}

class LocalSourceNode extends SourceNode implements LocalArtifactSource {
  constructor(parent: ParentNode, sourceName: string) {
    super(parent, sourceName);
  }
  location = new StringsSequence(this, 'path');

  /** @internal */
  *validate(): Iterable<ValidationError> {
    //
  }
}

class GitSourceNode extends SourceNode implements GitArtifactSource {
  constructor(parent: ParentNode, sourceName: string) {
    super(parent, sourceName);
  }
  location = new StringsSequence(this, 'git');

  /** @internal */
  *validate(): Iterable<ValidationError> {
    // yield* super.validate();
  }
}

/** internal */
export function createArtifactSourceNode(parent: ParentNode, name: string) {
  // detect type by presence of fields
  if (parent.selfNode.has('path')) {
    return new LocalSourceNode(parent, name);
  }
  if (parent.selfNode.has('nupkg')) {
    return new NugetSourceNode(parent, name);
  }
  if (parent.selfNode.has('git')) {
    return new GitSourceNode(parent, name);
  }
  fail(i`unknown source node type`);
}

