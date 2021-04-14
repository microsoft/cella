/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fail } from 'assert';
import { YAMLMap } from 'yaml/types';
import { i } from '../i18n';
import { GitArtifactSource, LocalArtifactSource, NuGetArtifactSource, ValidationError } from '../metadata-format';
import { Strings } from '../util/strings';
import { getOrCreateMap } from '../util/yaml';
import { NodeBase } from './base';

export class SourceNode extends NodeBase {
  // ArtifactSource nodes are shape-polymorphic.
  protected constructor(protected readonly node: YAMLMap, name: string, protected readonly kind: string) {
    super(node, name);
  }

  get location(): Strings {
    return this.strings('location');
  }
}

class NugetSourceNode extends SourceNode implements NuGetArtifactSource {
  constructor(node: YAMLMap, name: string) {
    super(node, name, 'nuget');
  }
  *validate(): Iterable<ValidationError> {
    //
  }
}

class LocalSourceNode extends SourceNode implements LocalArtifactSource {
  constructor(node: YAMLMap, name: string) {
    super(node, name, 'path');
  }
  *validate(): Iterable<ValidationError> {
    //
  }

}

class GitSourceNode extends SourceNode implements GitArtifactSource {
  constructor(node: YAMLMap, name: string) {
    super(node, name, 'git');
  }
  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }

}

/** internal */
export function createArtifactSourceNode(node: YAMLMap, name: string) {
  // detect type by presence of fields
  if (node.has('path')) {
    return new LocalSourceNode(getOrCreateMap(node, name), name);
  }
  if (node.has('nupkg')) {
    return new NugetSourceNode(getOrCreateMap(node, name), name);
  }
  if (node.has('git')) {
    return new GitSourceNode(getOrCreateMap(node, name), name);
  }
  fail(i`unknown source node type`);
}
