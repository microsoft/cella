import { fail } from 'assert';
import { Document } from 'yaml';
import { YAMLMap } from 'yaml/types';
import { ArtifactSource, Contact, Demands, DictionaryOf, Info, Installer, ProfileBase, Settings, StringOrStrings, VersionReference } from '../metadata-format';
import { getOrCreateMap } from '../util/yaml';
import { createArtifactSourceNode } from './artifact-source';
import { ContactNode } from './contact';
import { DictionaryImpl, proxyDictionary } from './dictionary';
import { InfoNode } from './info';
import { createInstallerNode } from './installer';
import { SettingsNode } from './settings';
import { getVersionRef, setVersionRef } from './version-reference';

/** @internal */
export class Amf extends DictionaryImpl<Demands> implements ProfileBase, DictionaryOf<Demands> {
  /** @internal */
  constructor(protected readonly document: Document.Parsed, public readonly filename: string) {
    super(<YAMLMap>document.contents);
  }

  toString(): string {
    return this.document.toString();
  }

  /* Profile */
  #info!: Info;
  get info(): Info {
    return this.#info || (this.#info = new InfoNode(getOrCreateMap(this.document, 'info')));
  }

  #contacts!: DictionaryOf<Contact>
  get contacts(): DictionaryOf<Contact> {
    return this.#contacts || (this.#contacts = proxyDictionary(getOrCreateMap(this.document, 'contacts'), (m, p) => new ContactNode(getOrCreateMap(m, p), p), () => { fail('Can not set entries directly.'); }));
  }

  #sources!: DictionaryOf<ArtifactSource>;
  get sources(): DictionaryOf<ArtifactSource> | undefined {
    return this.#sources || (this.#sources = proxyDictionary(getOrCreateMap(this.document, 'sources'), createArtifactSourceNode, () => { fail('Can not set entries directly.'); }));
  }

  get insert(): 'allowed' | 'only' | undefined {
    throw new Error('not implemented');
  }

  /* Demands */

  #requires!: DictionaryOf<VersionReference>
  get requires(): DictionaryOf<VersionReference> {
    return this.#requires || (this.#requires = proxyDictionary(getOrCreateMap(<YAMLMap>this.document.contents, 'requires'), getVersionRef, setVersionRef));
  }

  get error(): string | undefined {
    return this.document.get('error');
  }

  set error(errorMessage: string | undefined) {
    this.document.set('error', errorMessage);
  }

  get warning(): string | undefined {
    return this.document.get('warning');
  }
  set warning(warningMessage: string | undefined) {
    this.document.set('warning', warningMessage);
  }

  get message(): string | undefined {
    return this.document.get('message');
  }
  set message(message: string | undefined) {
    this.document.set('message', message);
  }

  #seeAlso!: DictionaryOf<VersionReference>
  get seeAlso(): DictionaryOf<VersionReference> {
    return this.#seeAlso || (this.#seeAlso = proxyDictionary(getOrCreateMap(<YAMLMap>this.document.contents, 'see-also'), getVersionRef, setVersionRef));
  }

  #settings!: Settings;
  get settings(): Settings {
    return this.#settings || (this.#settings = <Settings>proxyDictionary<any>(getOrCreateMap(<YAMLMap>this.document.contents, 'settings'), getOrCreateMap, () => { fail('no.'); }, new SettingsNode(getOrCreateMap(this.document, 'settings'))));
  }

  #install!: Installer;
  get install(): Installer {
    return this.#install || (this.#install = createInstallerNode(<YAMLMap>this.document.contents, 'install'));
  }
  get use(): DictionaryOf<StringOrStrings> | undefined {
    throw new Error('not implemented');
  }
}
