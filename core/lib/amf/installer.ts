/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { YAMLMap } from 'yaml/types';
import { i } from '../i18n';
import { ErrorKind, Git, Installer, Nupkg, UnTar, UnZip, ValidationError } from '../metadata-format';
import { getOrCreateMap, getPair, isMap } from '../util/yaml';
import { NodeBase } from './base';

/** @internal */
export function createInstallerNode(node: YAMLMap, name: string): Installer {
  const n = getOrCreateMap(node, name);
  if (isMap(n)) {
    if (n.has('unzip')) {
      return new UnzipNode(n, name);
    }
    if (n.has('nupkg')) {
      return new NupkgNode(n, name);
    }
    if (n.has('untar')) {
      return new UnTarNode(n, name);
    }
    if (n.has('git')) {
      return new GitCloneNode(n, name);
    }
  }
  return new InvalidInstallerNode(getPair(node, name)!.key, name);
}


class InstallerNode extends NodeBase {
  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

class InvalidInstallerNode extends InstallerNode {
  readonly kind = 'invalid';

  *validate(): Iterable<ValidationError> {
    yield { message: i`Install node is not a valid installation declaration`, line: this.line, column: this.column, category: ErrorKind.IncorrectType };
  }
}

class FileInstallerNode extends InstallerNode {

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
    return this.strings('transform');
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
    return this.strings('unzip');
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
    return this.strings('untar');
  }
  *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }

}

class GitCloneNode extends InstallerNode implements Git {
  readonly kind = 'git';

  get location() {
    return this.strings('git');
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