import { fail } from 'assert';
import { YAMLMap } from 'yaml/types';
import { i } from '../i18n';
import { Git, Installer, NuGet, UnTar, UnZip, ValidationError } from '../metadata-format';
import { getOrCreateMap } from '../util/yaml';
import { NodeBase } from './base';

/** @internal */
export function createInstallerNode(node: YAMLMap, name: string): Installer {
  const n = getOrCreateMap(node, name);
  if (n.has('unzip')) {
    return new UnzipNode(n, name);
  }
  if (n.has('nuget')) {
    return new NugetNode(n, name);
  }
  if (n.has('untar')) {
    return new UnTarNode(n, name);
  }
  if (n.has('git')) {
    return new GitCloneNode(n, name);
  }
  fail(i`unknown install type`);
}

class InstallerNode extends NodeBase {
  *validate(): Iterable<ValidationError> {
    yield* super.validate();
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

class NugetNode extends FileInstallerNode implements NuGet {
  readonly kind = 'nuget';

  get location() {
    return this.getString('nuget')!;
  }

  set location(value: string) {
    this.setString('nuget', value);
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