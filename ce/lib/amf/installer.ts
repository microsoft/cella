// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { YAMLMap } from 'yaml';
import { i } from '../i18n';
import { ErrorKind } from '../interfaces/error-kind';
import { GitInstaller } from '../interfaces/metadata/installers/git';
import { Installer } from '../interfaces/metadata/installers/Installer';
import { NupkgInstaller } from '../interfaces/metadata/installers/nupkg';
import { UnTarInstaller } from '../interfaces/metadata/installers/tar';
import { UnZipInstaller } from '../interfaces/metadata/installers/zip';
import { ValidationError } from '../interfaces/validation-error';
import { checkOptionalString } from '../util/checks';
import { ObjectSequence } from '../yaml/ObjectSequence';
import { StringsSequence } from '../yaml/strings';
import { NonNavigableYamlObject, ParentNode } from '../yaml/yaml-node';

abstract class InstallerNode extends NonNavigableYamlObject implements Installer {
  abstract readonly kind: string;

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    // yield* super.validate();
    yield* checkOptionalString(this.selfNode, this.selfNode.range!, 'lang');
  }

  protected getString(property: string): string | undefined {
    const v = this.selfNode.get(property);
    return typeof v === 'string' ? v : undefined;
  }

  protected setString(property: string, value: string | undefined) {
    if (!value) {
      if (this.selfNode.has(property)) {
        this.selfNode.delete(property);
      }
      return;
    }
    this.selfNode.set(property, value);
  }

  protected getNumber(property: string): number | undefined {
    const v = this.selfNode.get(property);
    return typeof v === 'number' ? v : undefined;
  }

  protected setNumber(property: string, value: number | undefined) {
    if (value === undefined) {
      if (this.selfNode.has(property)) {
        this.selfNode.delete(property);
      }
      return;
    }
    this.selfNode.set(property, value);
  }

  protected getBoolean(property: string): boolean | undefined {
    const v = this.selfNode.get(property);
    return typeof v === 'boolean' ? v : undefined;
  }

  protected setBoolean(property: string, value: boolean | undefined) {
    if (value === undefined) {
      if (this.selfNode.has(property)) {
        this.selfNode.delete(property);
      }
      return;
    }
    this.selfNode.set(property, value);
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

  get sha512() {
    return this.getString('sha512');
  }

  set sha512(value: string | undefined) {
    this.setString('sha512', value);
  }

  get strip() {
    return this.getNumber('strip');
  }

  set strip(value: number | undefined) {
    this.setNumber('1', value);
  }

  readonly transform = new StringsSequence(this, 'transform');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
    if (!this.sha256 && !this.sha512) {
      yield { message: i`artifacts must specify a hash algorithm ('sha256' or 'sha512') and value`, range: this.selfNode.range!, category: ErrorKind.MissingHash };
    }
  }
}

class UnzipNode extends FileInstallerNode implements UnZipInstaller {
  readonly kind = 'unzip';

  get [Symbol.toStringTag]() {
    return this.selfNode.get('UnzipNode');
  }

  location = new StringsSequence(this, 'unzip');
}

class NupkgNode extends FileInstallerNode implements NupkgInstaller {
  readonly kind = 'nupkg';

  get location() {
    return this.getString('nupkg')!;
  }

  set location(value: string) {
    this.setString('nupkg', value);
  }

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

class UnTarNode extends FileInstallerNode implements UnTarInstaller {
  readonly kind = 'untar';

  location = new StringsSequence(this, 'untar');

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

class GitCloneNode extends InstallerNode implements GitInstaller {
  readonly kind = 'git';

  location = new StringsSequence(this, 'git');

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

  /** @internal */
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

export class Installs extends ObjectSequence<Installer> {
  constructor(parent: ParentNode) {
    super(parent, 'install');
  }

  protected wrapValue(value: any): Installer {
    const v = <YAMLMap>value;
    if (v.has('unzip')) {
      return new UnzipNode(this, v);
    }
    if (v.has('nupkg')) {
      return new NupkgNode(this, v);
    }
    if (v.has('untar')) {
      return new UnTarNode(this, v);
    }
    if (v.has('git')) {
      return new GitCloneNode(this, v);
    }
    throw new Error(`Unknown installer kind: ${v.toString()}`);
  }

  /** @internal */
  override * validate(): Iterable<ValidationError> {
    yield* super.validate();

    if (this.self) {
      for (const i of this) {
        yield* i.validate();
      }
    }
  }
}