// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.


import { extname } from 'path';
import { Document, LineCounter, parseDocument, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { i } from '../i18n';
import { ErrorKind } from '../interfaces/error-kind';
import { Profile } from '../interfaces/metadata/metadata-format';
import { ValidationError } from '../interfaces/validation-error';
import { parseQuery } from '../mediaquery/media-query';
import { Uri } from '../util/uri';
import { BaseMap } from '../yaml/BaseMap';
import { Coerce } from '../yaml/Coerce';
import { toYAML } from '../yaml/yaml';
import { Contacts } from './contact';
import { Demands } from './demands';
import { GlobalSettings } from './global-settings';
import { Info } from './info';
import { Installs } from './installer';
import { Registries } from './registries';
import { Requires } from './Requires';
import { Settings } from './settings';


export type KindofNode = YAMLMap | YAMLSeq | Scalar;
export type Primitive = string | number | boolean;

export class MetadataFile extends BaseMap implements Profile {
  /** @internal */
  constructor(protected readonly document: Document.Parsed, public readonly filename: string, public lineCounter: LineCounter) {
    super(<YAMLMap<string, any>><any>document.contents);
  }

  info = new Info(undefined, this, 'info');

  contacts = new Contacts(undefined, this, 'contacts');
  registries = new Registries(undefined, this, 'registries');
  globalSettings = new GlobalSettings(undefined, this, 'global');

  get error(): string | undefined { return Coerce.String(this.getMember('error')); }
  set error(value: string | undefined) { this.setMember('error', value); }

  get warning(): string | undefined { return Coerce.String(this.getMember('warning')); }
  set warning(value: string | undefined) { this.setMember('warning', value); }

  get message(): string | undefined { return Coerce.String(this.getMember('message')); }
  set message(value: string | undefined) { this.setMember('message', value); }

  seeAlso = new Requires(undefined, this, 'seeAlso');
  requires = new Requires(undefined, this, 'requires');
  settings = new Settings(undefined, this, 'settings');
  install = new Installs(undefined, this, 'install');

  conditionalDemands = new Demands(this.node);

  get isFormatValid(): boolean {
    return this.document.errors.length === 0;
  }

  async save(uri: Uri) {
    // check the filename, and select the format.
    let content = '';

    switch (extname(uri.path).toLowerCase()) {
      case '.yaml':
      case '.yml':
        // format as yaml
        content = toYAML(this.document.toString());
        break;
      case '':
      case '.json':
        content = JSON.stringify(this.document.toJSON(), null, 2);
        break;
      default:
        throw new Error(`Unsupported file type ${extname(uri.path)}`);
    }
    await uri.writeUTF8(content);
  }
  #errors!: Array<string>;
  get formatErrors(): Array<string> {
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
      const r = Array.isArray(range) ? range : range?.sourcePosition();

      const { line, column } = this.positionAt(r, rangeOffset);
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
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();

    // verify that we have info
    if (!this.document.has('info')) {
      yield { message: i`Missing section '${'info'}'`, range: this, category: ErrorKind.SectionNotFound };
    } else {
      yield* this.info.validate();
    }

    this.install.validate();

    if (this.document.has('registries')) {
      for (const [key, registry] of this.registries) {
        yield* registry.validate();
      }
    }

    if (this.document.has('contacts')) {
      for (const each of this.contacts.values) {
        yield* each.validate();
      }
    }


    const set = new Set<string>();

    for (const [mediaQuery, demandBlock] of this.conditionalDemands) {

      if (set.has(mediaQuery)) {
        yield { message: i`Duplicate Keys detected in manifest: '${mediaQuery}'`, range: demandBlock, category: ErrorKind.DuplicateKey };
      }
      set.add(mediaQuery);
      const query = parseQuery(mediaQuery);
      if (!query.isValid) {
        yield { message: i`Error parsing conditional demand '${mediaQuery}'- ${query.error?.message}`, range: this.sourcePosition(mediaQuery)/* mediaQuery.range! */, rangeOffset: query.error, category: ErrorKind.ParseError };
        continue;
      }
      //if (!isMap(demandBlock)) {
      //  yield { message: i`Conditional demand '${mediaQuery}' is not an object`, range: [0, 0, 0] /* mediaQuery.range! * /, category: ErrorKind.IncorrectType };
      //  continue;
      // }


      yield* demandBlock.validate();
    }
  }
}

export function parseConfiguration(filename: string, content: string): MetadataFile {
  const lc = new LineCounter();
  const doc = parseDocument(content, { prettyErrors: false, lineCounter: lc, strict: true });
  const m = new MetadataFile(doc, filename, lc);
  return m;
}


/*
export class _MetadataFile extends ConditionalDemands implements Profile {

  static reservedWords = ['info', 'contacts', 'registries', 'settings', 'requires', 'seeAlso', 'install']

  override get isCreated(): boolean {
    return !!(<any>this.document.contents)?.items;
  }

  override get members() {
    return super.members.filter(each => MetadataFile.reservedWords.indexOf((<any>(each.key)).value) === -1);
  }

  /* Demands * /
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

  /** @internal * /
  constructor(protected readonly document: Document.Parsed, public readonly filename: string, public lineCounter: LineCounter) {
    super({ selfNode: <YAMLMap>document.contents }, '');
  }

  override get selfNode(): YAMLMap {
    return <YAMLMap<string, any>>(<any>this.document.contents);
  }

  override toString(): string {
    return this.content;
  }

  get content() {
    return this.document.toString();
  }

  async save(uri: Uri) {
    // check the filename, and select the format.
    let content = '';

    switch (extname(uri.path).toLowerCase()) {
      case '.yaml':
      case '.yml':
        // format as yaml
        content = toYAML(this.document.toString());
        break;
      case '':
      case '.json':
        content = JSON.stringify(this.document.toJSON(), null, 2);
        break;
      default:
        throw new Error(`Unsupported file type ${extname(uri.path)}`);
    }
    await uri.writeUTF8(content);
  }

  /* Profile * /
  info = new InfoNode(this);
  contacts = new Contacts(this)
  registries = new Registries(this);

  globalSettings = new GlobalSettingsNode(this);

  get isFormatValid(): boolean {
    return this.document.errors.length === 0;
  }

  #errors!: Array<string>;
  get formatErrors(): Array<string> {
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

  /** @internal * /
  override  *validate(): Iterable<ValidationError> {
    yield* super.validate();

    // verify that we have info
    if (!this.document.has('info')) {
      yield { message: i`Missing section '${'info'}'`, range: this._range, category: ErrorKind.SectionNotFound };
    } else {
      yield* this.info.validate();
    }

    this.install.validate();

    if (this.document.has('registries')) {
      for (const each of this.registries.values) {
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
        yield { message: i`Error parsing conditional demand '${mediaQuery}'- ${query.error?.message}`, range: this.positionOf(mediaQuery)/* mediaQuery.range! * /, rangeOffset: query.error, category: ErrorKind.ParseError };
        continue;
      }
      //if (!isMap(demandBlock)) {
      //  yield { message: i`Conditional demand '${mediaQuery}' is not an object`, range: [0, 0, 0] /* mediaQuery.range! * /, category: ErrorKind.IncorrectType };
      //  continue;
      // }


      yield* demandBlock.validate();
    }
  }
}

*/