/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isMap, isSeq, YAMLMap } from 'yaml';
import { Git, Installer, Nupkg, UnTar, UnZip, ValidationError } from '../metadata-format';
import { checkOptionalString } from '../util/checks';
import { getOrCreateMap } from '../util/yaml';
import { NodeBase } from './base';

function createSingleInstallerNode(n: YAMLMap, containingName: string) : InstallerNode | undefined {
  if (n.has('unzip')) {
    return new UnzipNode(n, containingName);
  }
  if (n.has('nupkg')) {
    return new NupkgNode(n, containingName);
  }
  if (n.has('untar')) {
    return new UnTarNode(n, containingName);
  }
  if (n.has('git')) {
    return new GitCloneNode(n, containingName);
  }

  return undefined;
}

/** @internal */
export function createInstallerNode(containingNode: YAMLMap, keyName: string): Array<Installer> {
  const candidate = getOrCreateMap(containingNode, keyName);

  if (isSeq(candidate)) {
    const items = candidate.items;
    if (items.all(item => isMap(item))) {
      const maps = <Array<YAMLMap>><unknown>items;
      const convertedItems = maps.select((item) => createSingleInstallerNode(<YAMLMap>item, keyName));
      if (convertedItems.all(item => !!item)) {
        return <Array<Installer>>convertedItems;
      }
    }
  } else if (isMap(candidate)) {
    const single = createSingleInstallerNode(candidate, keyName);
    if (single) {
      return [single];
    }
  }

  return [];
}


abstract class InstallerNode extends NodeBase implements Installer {
  abstract readonly kind : string;
  *validate(): Iterable<ValidationError> {
    yield* super.validate();
    yield* checkOptionalString(this.node, this.node.range!, 'lang');
  }

  get lang() {
    return this.getString('lang');
  }

  get nametag() {
    return this.getString('nametag');
  }
}

abstract class FileInstallerNode extends InstallerNode {
  get sha256() {
    return this.getString('sha256');
  }

  set sha256(value: string | undefined) {
    this.setString('sha256', value);
  }

  get md5() {
    return this.getString('md5');
  }

  set md5(value: string | undefined) {
    this.setString('md5', value);
  }

  get strip() {
    return this.getNumber('strip');
  }

  set strip(value: number | undefined) {
    this.setNumber('1', value);
  }

  get transform() {
    return this.getStrings('transform');
  }

  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

class UnzipNode extends FileInstallerNode implements UnZip {
  readonly kind = 'unzip';

  get [Symbol.toStringTag]() {
    return this.node.get('UnzipNode');
  }

  get location() {
    return this.getStrings('unzip');
  }
}

class NupkgNode extends FileInstallerNode implements Nupkg {
  readonly kind = 'nupkg';

  get location() {
    return this.getString('nupkg')!;
  }

  set location(value: string) {
    this.setString('nupkg', value);
  }

  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

class UnTarNode extends FileInstallerNode implements UnTar {
  readonly kind = 'untar';

  get location() {
    return this.getStrings('untar');
  }

  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

class GitCloneNode extends InstallerNode implements Git {
  readonly kind = 'git';

  get location() {
    return this.getStrings('git');
  }

  get tag() {
    return this.getString('tag');
  }

  set tag(value: string | undefined) {
    this.setString('tag', value);
  }

  get full() {
    return this.getBoolean('full');
  }

  set full(value: boolean | undefined) {
    this.setBoolean('full', value);
  }

  get recurse() {
    return this.getBoolean('recurse');
  }

  set recurse(value: boolean | undefined) {
    this.setBoolean('recurse', value);
  }

  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}
