import { fail } from 'assert';
import { DictionaryOf, Installer, StringOrStrings, VersionReference } from '../metadata-format';
import { getOrCreateMap } from '../util/yaml';
import { NodeBase } from './base';
import { proxyDictionary } from './dictionary';
import { createInstallerNode } from './installer';
import { SettingsNode } from './settings';
import { getVersionRef, setVersionRef } from './version-reference';

/** @internal */
export class DemandNode extends NodeBase {

  #requires!: DictionaryOf<VersionReference>;
  get requires(): DictionaryOf<VersionReference> {
    return this.#requires || (this.#requires = <DictionaryOf<VersionReference>>proxyDictionary(getOrCreateMap(this.node, 'requires'), getVersionRef, setVersionRef));
  }

  get error(): string | undefined {
    return this.node.get('error');
  }

  set error(errorMessage: string | undefined) {
    this.node.set('error', errorMessage);
  }

  get warning(): string | undefined {
    return this.node.get('warning');
  }
  set warning(warningMessage: string | undefined) {
    this.node.set('warning', warningMessage);
  }

  get message(): string | undefined {
    return this.node.get('message');
  }
  set message(message: string | undefined) {
    this.node.set('message', message);
  }

  #seeAlso!: DictionaryOf<VersionReference>;
  get seeAlso(): DictionaryOf<VersionReference> {
    return this.#seeAlso || (this.#seeAlso = <DictionaryOf<VersionReference>>proxyDictionary(getOrCreateMap(this.node, 'see-also'), getVersionRef, setVersionRef));
  }

  #settings!: SettingsNode;
  get settings(): SettingsNode {
    return this.#settings || (this.#settings = <SettingsNode>proxyDictionary<any>(getOrCreateMap(this.node, 'settings'), getOrCreateMap, () => { fail('no.'); }, new SettingsNode(getOrCreateMap(this.node, 'settings'))));
  }

  #install!: Installer;
  get install(): Installer {
    return this.#install || (this.#install = createInstallerNode(this.node, 'install'));
  }
  get use(): DictionaryOf<StringOrStrings> | undefined {
    throw new Error('not implemented');
  }
}
