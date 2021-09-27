// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Document, isMap, isSeq, LineCounter, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { i } from '../i18n';
import { parseQuery } from '../mediaquery/media-query';
import { ArtifactSource, Contact, Demands, ErrorKind, ValidationError, VersionReference } from '../metadata-format';
import { isNullish } from '../util/checks';
import { ObjectDictionary } from '../yaml/ImplMapOf';
import { YamlDictionary } from '../yaml/MapOf';
import { ParentNode } from '../yaml/yaml-node';
import { createArtifactSourceNode } from './artifact-source';
import { ContactNode } from './contact';
import { DemandNode } from './demands';
import { InfoNode } from './info';
import { Installs } from './installer';
import { SettingsNode } from './settings';
import { VersionReferenceNode } from './version-reference';

export type KindofNode = YAMLMap | YAMLSeq | Scalar;
export type Primitive = string | number | boolean;

export class Requires extends YamlDictionary<VersionReference> {
  constructor(parent: ParentNode, kind: 'require' | 'seeAlso' = 'require') {
    super(parent, kind);
  }
  protected wrapMember(key: string, value: any): VersionReference {
    return new VersionReferenceNode(this, key);
  }

  set(key: string, value: string | VersionReference): void {
    if (typeof value === 'string') {
      const v = new VersionReferenceNode(this, key);
      v.raw = value;
    } else {
      const v = new VersionReferenceNode(this, key);
      if (value.resolved) {
        v.raw = `${value.range} ${value.resolved}`;
      } else {
        v.raw = `${value.range}`;
      }
    }
  }
}

export class Contacts extends YamlDictionary<Contact> {
  constructor(parent: ParentNode) {
    super(parent, 'contacts');
  }
  protected wrapMember(key: string, value: any): Contact {
    return new ContactNode(this, key);
  }
  add(name: string) {
    return this.getOrCreate(name);
  }
}

export class GlobalSettingsNode extends YamlDictionary<Primitive | Record<string, unknown>>  {
  constructor(parent: ParentNode) {
    super(parent, 'global');
  }

  wrapMember(key: string, value: any): Primitive | Record<string, unknown> {
    return isNullish(value?.value) ? value : value.value;
  }

  set(key: string, value: Primitive | Record<string, unknown>): void {
    if (value === undefined || value === null || value === '') {
      this.selfNode.delete(key);
      return;
    }
    this.selfNode.set(key, value);
  }
}

export class Catalogs extends YamlDictionary<ArtifactSource> {
  constructor(parent: ParentNode) {
    super(parent, 'catalogs');
  }

  wrapMember(key: string, value: any): ArtifactSource {
    return createArtifactSourceNode(this, key);
  }
}

export class ConditionalDemands extends ObjectDictionary<Demands> {
  constructor(parent: ParentNode, nodeName: string) {
    super(parent, nodeName, (k, v) => new DemandNode(this, k));
  }

  /** @internal */
  *validate(): Iterable<ValidationError> {
    for (const each of this.members) {
      const n = <YAMLSeq | YAMLMap | Scalar>each.key;
      if (!isMap(each.value) && !isSeq(each.value)) {

        yield {
          message: `Conditional Demand ${each.key} is not an object`,
          range: n.range || [0, 0, 0],
          category: ErrorKind.IncorrectType
        };
      }
    }

    for (const demand of this.values) {

      yield* demand.validate();
    }
  }

}


export class MetadataFile extends ConditionalDemands {

  static reservedWords = ['info', 'contacts', 'catalogs', 'registries', 'settings', 'requires', 'seeAlso', 'install']

  get isCreated(): boolean {
    return !!(<any>this.document.contents)?.items;
  }

  get members() {
    return super.members.filter(each => MetadataFile.reservedWords.indexOf((<any>(each.key)).value) === -1);
  }

  /* Demands */
  settings = new SettingsNode(this);
  requires = new Requires(this);
  seeAlso = new Requires(this, 'seeAlso');
  install = new Installs(this);

  get error(): string | undefined {
    return <string>this.selfNode.get('error');
  }

  set error(errorMessage: string | undefined) {
    this.selfNode.set('error', errorMessage);
  }

  get warning(): string | undefined {
    return <string>this.selfNode.get('warning');
  }
  set warning(warningMessage: string | undefined) {
    this.selfNode.set('warning', warningMessage);
  }

  get message(): string | undefined {
    return <string>this.selfNode.get('message');
  }
  set message(message: string | undefined) {
    this.selfNode.set('message', message);
  }


  /** @internal */
  constructor(protected readonly document: Document.Parsed, public readonly filename: string, public lineCounter: LineCounter) {
    super({ selfNode: <YAMLMap>document.contents }, '');
  }

  get selfNode(): YAMLMap {
    return <YAMLMap<string, any>>(<any>this.document.contents);
  }

  toString(): string {
    return this.content;
  }

  get content() {
    return this.document.toString();
  }

  /* Profile */
  info = new InfoNode(this);
  contacts = new Contacts(this)
  sources = new Catalogs(this);

  globalSettings = new GlobalSettingsNode(this);


  get isValidYaml(): boolean {
    return this.document.errors.length === 0;
  }

  #errors!: Array<string>;
  get yamlErrors(): Array<string> {
    return this.#errors || (this.#errors = this.document.errors.map(each => {
      const message = each.message;
      const line = each.linePos?.[0] || 1;
      const column = each.linePos?.[1] || 1;
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

    const errs = new Set<string>();
    for (const { message, range, rangeOffset, category } of this.validate()) {
      const { line, column } = this.positionAt(range, rangeOffset);
      if (line) {
        errs.add(`${this.filename}:${line}:${column} ${category}, ${message}`);
      } else {
        errs.add(`${this.filename}: ${category}, ${message}`);
      }
    }
    this.#validationErrors = [...errs];
    return this.#validationErrors;
  }

  private positionAt(range?: [number, number, number?], offset?: { line: number, column: number }) {
    const { line, col } = this.lineCounter.linePos(range?.[0] || 0);

    return offset ? {
      // adds the offset values (which can come from the mediaquery parser) to the line & column. If MQ doesn't have a position, it's zero.
      line: line + (offset.line - 1),
      column: col + (offset.column - 1),
    } :
      {
        line, column: col
      };
  }

  /** @internal */
  *validate(): Iterable<ValidationError> {
    yield* super.validate();

    // verify that we have info
    if (!this.document.has('info')) {
      yield { message: i`Missing section '${'info'}'`, range: this._range, category: ErrorKind.SectionNotFound };
    } else {
      yield* this.info.validate();
    }

    this.install.validate();

    if (this.document.has('sources')) {
      for (const each of this.sources.values) {
        yield* each.validate();
      }
    }

    if (this.document.has('contacts')) {
      for (const each of this.contacts.values) {
        yield* each.validate();
      }
    }


    const set = new Set<string>();

    for (const [mediaQuery, demandBlock] of this.entries) {

      if (set.has(mediaQuery)) {
        yield { message: i`Duplicate Keys detected in manifest: '${mediaQuery}'`, range: (<DemandNode>demandBlock)._range, category: ErrorKind.DuplicateKey };
      }
      set.add(mediaQuery);
      const query = parseQuery(mediaQuery);
      if (!query.isValid) {
        yield { message: i`Error parsing conditional demand '${mediaQuery}'- ${query.error?.message}`, range: this.positionOf(mediaQuery)/* mediaQuery.range! */, rangeOffset: query.error, category: ErrorKind.ParseError };
        continue;
      }
      //if (!isMap(demandBlock)) {
      //  yield { message: i`Conditional demand '${mediaQuery}' is not an object`, range: [0, 0, 0] /* mediaQuery.range! */, category: ErrorKind.IncorrectType };
      //  continue;
      // }


      yield* demandBlock.validate();
    }
  }
}