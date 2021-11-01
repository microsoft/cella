// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { isMap, isSeq } from 'yaml';
import { Installer as IInstaller } from '../interfaces/metadata/installers/Installer';
import { NupkgInstaller } from '../interfaces/metadata/installers/nupkg';
import { UnTarInstaller } from '../interfaces/metadata/installers/tar';
import { UnZipInstaller } from '../interfaces/metadata/installers/zip';
import { Coerce } from '../yaml/Coerce';
import { Entity } from '../yaml/Entity';
import { EntitySequence } from '../yaml/EntitySequence';
import { Strings } from '../yaml/strings';
import { Node, Yaml, YAMLDictionary } from '../yaml/yaml-types';

export class Installs extends EntitySequence<Installer> {
  constructor(node?: YAMLDictionary, parent?: Yaml, key?: string) {
    super(Installer, node, parent, key);
  }

  override *[Symbol.iterator](): Iterator<Installer> {
    if (isMap(this.node)) {
      yield this.createInstance(this.node);
    }
    if (isSeq(this.node)) {
      for (const item of this.node.items) {
        yield this.createInstance(item);
      }
    }
  }

  protected createInstance(node: Node): Installer {
    if (isMap(node)) {
      if (node.has('unzip')) {
        return new UnzipNode(node, this);
      }
      if (node.has('nupkg')) {
        return new NupkgNode(node, this);
      }
      if (node.has('untar')) {
        return new UnTarNode(node, this);
      }
      if (node.has('git')) {
        return new GitCloneNode(node, this);
      }
    }
    throw new Error('Unsupported node type');
  }
}


export class Installer extends Entity implements IInstaller {
  get installerKind(): string {
    throw new Error('abstract type, should not get here.');
  }

  get lang() {
    return Coerce.String(this.getMember('lang'));
  }

  get nametag() {
    return Coerce.String(this.getMember('nametag'));
  }
}

abstract class FileInstallerNode extends Installer {
  get sha256() {
    return Coerce.String(this.getMember('sha256'));
  }

  set sha256(value: string | undefined) {
    this.setMember('sha256', value);
  }

  get sha512() {
    return Coerce.String(this.getMember('sha512'));
  }

  set sha512(value: string | undefined) {
    this.setMember('sha512', value);
  }

  get strip() {
    return Coerce.Number(this.getMember('strip'));
  }

  set strip(value: number | undefined) {
    this.setMember('1', value);
  }

  readonly transform = new Strings(undefined, this, 'transform');
}
class UnzipNode extends FileInstallerNode implements UnZipInstaller {
  override get installerKind() { return 'unzip'; }

  readonly location = new Strings(undefined, this, 'unzip');

}
class UnTarNode extends FileInstallerNode implements UnTarInstaller {
  override get installerKind() { return 'untar'; }
  location = new Strings(undefined, this, 'untar');

}
class NupkgNode extends Installer implements NupkgInstaller {
  get location() {
    return Coerce.String(this.getMember('nupkg'))!;
  }

  set location(value: string) {
    this.setMember('nupkg', value);
  }

  override get installerKind() { return 'nupkg'; }

  get strip() {
    return Coerce.Number(this.getMember('strip'));
  }

  set strip(value: number | undefined) {
    this.setMember('1', value);
  }

  get sha256() {
    return Coerce.String(this.getMember('sha256'));
  }

  set sha256(value: string | undefined) {
    this.setMember('sha256', value);
  }

  get sha512() {
    return Coerce.String(this.getMember('sha512'));
  }

  set sha512(value: string | undefined) {
    this.setMember('sha512', value);
  }

  readonly transform = new Strings(undefined, this, 'transform');

}
class GitCloneNode extends Installer {
  override get installerKind() { return 'git'; }
}


/*
abstract class InstallerNode extends NonNavigableYamlObject implements Installer {
  abstract readonly kind: string;

  /** @internal * /
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

  /** @internal * /
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

  /** @internal * /
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

class UnTarNode extends FileInstallerNode implements UnTarInstaller {
  readonly kind = 'untar';

  location = new StringsSequence(this, 'untar');

  /** @internal * /
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

  /** @internal * /
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
  }
}

export class Installs_ extends ObjectSequence<Installer> {
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

  /** @internal * /
  override * validate(): Iterable<ValidationError> {
    yield* super.validate();

    if (this.self) {
      for (const i of this) {
        yield* i.validate();
      }
    }
  }
}
*/