/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fail } from 'assert';
import { Document, isMap, LineCounter, YAMLMap } from 'yaml';
import { i } from '../i18n';
import { parseQuery } from '../mediaquery/media-query';
import { ArtifactSource, Contact, Demands, DictionaryOf, ErrorKind, Info, Installer, MetadataFile, ProfileBase, Settings, StringOrStrings, ValidationError, VersionReference } from '../metadata-format';
import { getOrCreateMap, getPair } from '../util/yaml';
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
  constructor(protected readonly document: Document.Parsed, public readonly filename: string, public lineCounter: LineCounter) {
    super(<YAMLMap>document.contents);
  }
  setProxy(proxy: MetadataFile) {
    this.#proxy = proxy;
  }

  #proxy!: MetadataFile;

  toString(): string {
    return this.document.toString();
  }

  get content() {
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
    return <string>this.document.get('error');
  }

  set error(errorMessage: string | undefined) {
    this.document.set('error', errorMessage);
  }

  get warning(): string | undefined {
    return <string>this.document.get('warning');
  }
  set warning(warningMessage: string | undefined) {
    this.document.set('warning', warningMessage);
  }

  get message(): string | undefined {
    return <string>this.document.get('message');
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

  #install?: Array<Installer>;
  get install(): Array<Installer> {
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


  #globalSettings!: DictionaryOf<string>;
  get globalSettings(): DictionaryOf<string> {
    return this.#globalSettings || (this.#globalSettings = <DictionaryOf<string>>proxyDictionary(getOrCreateMap(this.node, 'global'), (m, p) => m.get(p), (m, p, v) => m.set(p, v)));
  }

  #errors!: Array<string>;
  get yamlErrors(): Array<string> {
    return this.#errors || (this.#errors = this.document.errors.map(each => {
      const message = each.message;
      const line = each.linePos?.[0] || 1;
      const column = each.linePos?.[1] || 1;
      return `\`${this.filename}:${line}:${column}\` ${each.name}, ${message}`;
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
    for (const { message, range, rangeOffset, category } of this.validate()) {
      const { line, column } = this.positionAt(range, rangeOffset);
      if (line) {
        this.#validationErrors.push(`\`${this.filename}:${line}:${column}\` ${category}, ${message}`);
      } else {
        this.#validationErrors.push(`${this.filename}: ${category}, ${message}`);
      }
    }
    return this.#validationErrors;
  }

  private positionAt(range?: [number, number, number?], offset?: { line: number, column: number }) {
    const { line, col } = this.lineCounter.linePos(range?.[0] || 0);
    return {
      // adds the offset values (which can come from the mediaquery parser) to the line & column. If MQ doesn't have a position, it's zero.
      line: line + (offset?.line || 0),
      column: col + (offset?.column || 0),
    };
  }

  *validate(): Iterable<ValidationError> {
    // verify that we have info
    if (!this.document.has('info')) {
      yield { message: i`Missing section '${'info'}'`, range: [0, 0, 0], category: ErrorKind.SectionNotFound };
    } else {
      yield* this.info.validate();
    }

    if (this.document.has('install')) {
      for (const ins of this.install) {
        yield* ins.validate();
      }
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

    const set = new Set<string>();
    for (const each of this.demands) {
      // first, validate that the query is a valid query
      const pair = getPair(this.node, each);
      if (pair) {
        const { key, value } = pair;
        if (set.has(each)) {
          yield { message: i`Duplicate Keys detected in manifest: '${each}'`, range: key.range!, category: ErrorKind.DuplicateKey };
        }
        set.add(each);

        if (!isMap(value)) {
          yield { message: i`Conditional demand '${each}' is not an object`, range: key.range!, category: ErrorKind.IncorrectType };
          continue;
        }

        const query = parseQuery(each);
        if (!query.isValid) {
          yield { message: i`Error parsing conditional demand '${each}'--${query.error?.message}`, range: key.range!, rangeOffset: query.error, category: ErrorKind.ParseError };
          continue;
        }

        yield* this.#proxy[each].validate();
      }
    }
  }
}
