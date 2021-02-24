import { fail } from 'assert';
import { YAMLMap } from 'yaml/types';
import { i } from '../i18n';
import { Git, Installer, NuGet, UnTar, UnZip } from '../metadata-format';
import { getOrCreateMap } from '../util/yaml';
import { NodeBase } from './base';


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
}

class UnzipNode extends FileInstallerNode implements UnZip {
  get [Symbol.toStringTag]() {
    return this.node.get('UnzipNode');
  }

  get unzip() {
    return this.strings('unzip');
  }
}

class NugetNode extends FileInstallerNode implements NuGet {
  get nuget() {
    return this.getString('nuget')!;
  }

  set nuget(value: string) {
    this.setString('nuget', value);
  }
}

class UnTarNode extends FileInstallerNode implements UnTar {
  get untar() {
    return this.strings('untar');
  }
}

class GitCloneNode extends InstallerNode implements Git {
  get git() {
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

}