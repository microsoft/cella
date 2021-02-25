import { fail } from 'assert';
import { Document } from 'yaml';
import { YAMLMap } from 'yaml/types';
import { i } from '../i18n';
import { parseQuery } from '../mediaquery/media-query';
import { ArtifactSource, Contact, Demands, DictionaryOf, ErrorKind, Info, Installer, MetadataFile, ProfileBase, Settings, StringOrStrings, ValidationError, VersionReference } from '../metadata-format';
import { column, getOrCreateMap, getPair, isMap, line } from '../util/yaml';
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
  setProxy(proxy: MetadataFile) {
    this.#proxy = proxy;
  }

  #proxy!: MetadataFile;

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
  get sources(): DictionaryOf<ArtifactSource> {
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
  get demands(): Array<string> {
    return this.keys;
  }
  get isValidYaml(): boolean {
    return this.document.errors.length === 0;
  }

  #errors!: Array<string>;
  get yamlErrors(): Array<string> {
    return this.#errors || (this.#errors = this.document.errors.map(each => {
      const message = each.message;
      each.makePretty();
      const line = each.linePos?.start.line || 1;
      const column = each.linePos?.start.col || 1;
      return `${this.filename}:${line}:${column} ${each.name}, ${message}`;
    }));
  }

  get isValid(): boolean {
    return this.validationErrors.length === 0;
  }

  #validationErrors!: Array<string>;
  get validationErrors(): Array<string> {
    if (this.#validationErrors) {
      return this.#validationErrors;
    }
    this.#validationErrors = new Array<string>();
    for (const { message, line, column, category } of this.validate()) {
      if (line) {
        this.#validationErrors.push(`${this.filename}:${line}:${column} ${category}, ${message}`);
      } else {
        this.#validationErrors.push(`${this.filename}: ${category}, ${message}`);
      }
    }
    return this.#validationErrors;
  }

  *validate(): Iterable<ValidationError> {
    // verify that we have info
    if (!this.document.has('info')) {
      yield { message: i`Missing section '${'info'}'`, line: 0, column: 0, category: ErrorKind.SectionNotFound };
    } else {
      yield* this.info.validate();
    }

    if (this.document.has('install')) {
      yield* this.install.validate();
    }

    if (this.document.has('settings')) {
      yield* this.settings.validate();
    }

    if (this.document.has('requires')) {
      for (const each of this.requires.keys) {
        yield* this.requires[each].validate();
      }
    }
    if (this.document.has('sources')) {
      for (const each of this.sources.keys) {
        yield* this.sources[each].validate();
      }
    }

    if (this.document.has('contacts')) {
      for (const each of this.contacts.keys) {
        yield* this.contacts[each].validate();
      }
    }
    if (this.document.has('see-also')) {
      for (const each of this.#seeAlso.keys) {
        yield* this.#seeAlso[each].validate();
      }
    }

    for (const each of this.demands) {
      // first, validate that the query is a valid query
      const { key, value } = getPair(this.node, each)!;

      if (!isMap(value)) {
        yield { message: i`Conditional demand '${each}' is not an object`, line: line(key), column: column(key), category: ErrorKind.IncorrectType };
        continue;
      }

      const query = parseQuery(each);
      if (!query.isValid) {
        yield { message: i`Error parsing conditional demand '${each}'--${query.error?.message}`, line: line(key, query.error), column: column(key, query.error), category: ErrorKind.ParseError };
        continue;
      }

      yield* this.#proxy[each].validate();
    }
  }
}

