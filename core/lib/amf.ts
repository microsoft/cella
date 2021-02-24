import { fail, strict } from 'assert';
import { parse as parseSemver, Range, SemVer } from 'semver';
import { Document, parseDocument } from 'yaml';
import { Collection, Scalar, YAMLMap, YAMLSeq } from 'yaml/types';
import { i } from './i18n';
import { Strings } from './util/strings';


export { Range, SemVer };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const parseRange: any = require('@snyk/nuget-semver/lib/range-parser');

export const createNode = (v: any, b = true) => parseDocument('', { prettyErrors: true }).createNode(v, { wrapScalars: b });

export function parse(filename: string, content: string) {
  const doc = parseDocument(content, { prettyErrors: true });

  return <ProfileBase & Dictionary<Demands>><Amf>proxyDictionary(<YAMLMap>doc.contents, (m, p) => new DemandNode(getOrCreateMap(m, p), p), () => fail('nope'), new Amf(doc, filename));
}

/**
 * a profile defines the requirements and/or artifact that should be installed
 *
 * Any other keys are considered HostQueries and a matching set of Demands
 * A HostQuery is a query string that can be used to qualify
 * 'requires'/'see-also'/'settings'/'install'/'use' objects
 *
 * @see the section below in this document entitled 'Host/Environment Queries"
 */
export interface ProfileBase extends Demands {
  /** this profile/package information/metadata */
  info: Info;

  /** any contact information related to this profile/package */
  contacts: Dictionary<Contact>;   // optional

  /** artifact sources list the references necessary to install artifacts in this file */
  sources?: Dictionary<ArtifactSource>;

  /** mark an artifact as supporting insert (either allowed or only) */
  insert?: 'allowed' | 'only';
}

/**
 * a profile defines the requirements and/or artifact that should be installed
 *
 * Any other keys are considered HostQueries and a matching set of Demands
 * A HostQuery is a query string that can be used to qualify
 * 'requires'/'see-also'/'settings'/'install'/'use' objects
 *
 * @see the section below in this document entitled 'Host/Environment Queries"
 */
export type Profile = ProfileBase & {
  [key: string]: Demands;
}

export interface VersionReference {
  range: Range;
  resolved?: SemVer;
  readonly raw: string;
}

class VRef implements VersionReference {
  /** @internal */
  constructor(private node: Document.Parsed | Collection, private prop: string) {

  }
  private split(): [Range, SemVer | undefined] {

    const v = <string>this.node.get(this.prop)?.toString().trim();
    if (v) {

      const [, a, b] = /(.+)\s+([\d\\.]+)/.exec(v) || [];

      if (/\[|\]|\(|\)/.exec(v)) {
        // looks like a nuget version range.
        try {
          const range = parseRange(a || v);
          let str = '';
          if (range._components[0].minOperator) {
            str = `${range._components[0].minOperator} ${range._components[0].minOperand}`;
          }
          if (range._components[0].maxOperator) {
            str = `${str} ${range._components[0].maxOperator} ${range._components[0].maxOperand}`;
          }
          const newRange = new Range(str);
          newRange.raw = a || v;

          if (b) {
            const ver = new SemVer(b, true);
            return [newRange, ver];
          }

          return [newRange, undefined];

        } catch (E) {
          //
        }
      }


      if (a) {
        // we have at least a range going on here.
        try {
          const range = new Range(a, true);
          const ver = new SemVer(b, true);
          return [range, ver];
        } catch (E) {
          //
        }
      }
      // the range or version didn't resolve correctly.
      // must be a range alone.
      return [new Range(v, true), undefined];
    }
    return [new Range('*', true), undefined];
  }
  get range() {
    return this.split()[0];
  }
  set range(ver: Range) {
    this.node.set(this.prop, createNode(`${ver.raw} ${this.resolved?.raw || ''}`.trim()));
  }

  get resolved() {
    return this.split()[1];
  }
  set resolved(ver: SemVer | undefined) {
    this.node.set(this.prop, createNode(`${this.range.raw} ${ver?.raw || ''}`.trim()));
  }

  get raw(): string {
    return this.node.get(this.prop);
  }

  toString() {
    return this.node.get(this.prop);
  }
}

/**
 * These are the things that are necessary to install/set/depend-on/etc for a given 'artifact'
 */
export interface Demands {
  /** set of required artifacts */
  requires: Dictionary<VersionReference>;

  /** An error message that the user should get, and abort the installation */
  error?: string; // markdown text with ${} replacements

  /** A warning message that the user should get, does not abort the installation */
  warning?: string; // markdown text with ${} replacements

  /** A text message that the user should get, does not abort the installation */
  message?: string; // markdown text with ${} replacements

  /** set of artifacts that the consumer should be aware of */
  seeAlso: Dictionary<VersionReference>;

  /** settings that should be applied to the context when activated */
  settings: Settings;

  /**
   * defines what should be physically laid out on disk for this artifact
   *
   * Note: once the host/environment queries have been completed, there should
   *       only be one single package/file/repo/etc that gets downloaded and
   *       installed for this artifact.  If there needs to be more than one,
   *       then there would need to be a 'requires' that refers to the additional
   *       package.
   */
  install?: Installer;

  /**
   * manually specified settings to use when activating the context
   *
   * format/usage TBA.
  */
  use?: Dictionary<StringOrStrings>;

}

/** Canonical Information about this artifact */
export interface Info {
  /** Artifact identity
   *
   * this should be the 'path' to the artifact (following the guidelines)
   *
   * ie, 'compilers/microsoft/msvc'
   *
   * FYI: artifacts install to $CELLA_HOME/<id>/<VER> or if from another artifact source: $CELLA_HOME/<source>/<id>/<VER>
   */
  id: string;

  /** the version of this artifact */
  version: string;

  /** a short 1 line descriptive text */
  summary?: string;

  /** if a longer description is required, the value should go here */
  description?: string;
}

/** A person/organization/etc who either has contributed or is connected to the artifact */
export interface Contact {
  name: string;
  email?: string;

  readonly roles: Strings;
}

type ArtifactSource = NuGetArtifactSource | LocalArtifactSource | GitArtifactSource;

interface ArtifactSourceBase {
  /** the uri to the artifact source location */
  readonly location: Strings;
}

export interface NuGetArtifactSource extends ArtifactSourceBase {
  /** A NuGet artifact source lists one or more URIs as the source */

  /* additional details? creds? etc */
}

export interface LocalArtifactSource extends ArtifactSourceBase {
  /** A local artifact source lists one or more file paths where the artifacts are */

  /* additional details? creds? etc */
}

export interface GitArtifactSource extends ArtifactSourceBase {
  /** A git artifact source lists one or more repository paths where the artifacts are. */

  /* additional details? creds? etc */
}


/** values that can be either a single string, or an array of strings */
type StringOrStrings = string | Array<string>;

/** refers to a location of a resource. If an array is specified, they are considered mirrors */
type ResourceLocation = string | ReadonlyArray<string> | Strings;

/** a mapped dictionary of string:T */
type Dictionary<T> = {
  readonly keys: Array<string>;
  remove(key: string): void;
  // come back to this if we need an iterator
  // [Symbol.iterator](): Iterator<{ key: string, value: T }>;
} & {
  [key: string]: T;
};

/**
 * types of paths that we can handle when crafting the context
 *
 * Paths has a well-known list of path types that we handle, but we make it a dictionary anyway.
 */
export interface Paths extends DictionaryNode<StringOrStrings> {
  /** entries that should be added to the PATH environment variable */
  bin: StringOrStrings;

  /** entries that should be in the INCLUDE environment variable  */
  include: StringOrStrings;

  /** entries that should be in the LIB environment variable  */
  lib: StringOrStrings;

  /** entries that should be used for GCC's LDSCRIPT */
  ldscript: StringOrStrings;

  /** object files that should be linked */
  object: StringOrStrings;
}

/** settings that should be applied to the context */
export interface Settings extends Dictionary<any> {
  /** a map of path categories to one or more values */
  paths: Paths;

  /** a map of the known tools to actual tool executable name */
  tools: Dictionary<string>;

  /**
   * a map of (environment) variables that should be set in the context.
   *
   * arrays mean that the values should be joined with spaces
   */
  variables: Dictionary<StringOrStrings>;
  // this is where we'd see things like
  // CFLAGS: [...] where you can have a bunch of things that would end up in the CFLAGS variable (or used to set values in a vcxproj/cmake settings file.)
  //
  /**
   * a map of #defines for the artifact.
   *
   * these would likely also be turned into 'variables', but
   * it's significant enough that we need them separately
   */
  defines: Dictionary<string>;
}

/** One of several choices for a CRC/HASH/etc */
export interface Verifiable {
  /** SHA-256 hash */
  sha256?: string;
  /** MD5 hash */
  md5?: string; // example, MD5 might not be a good idea
}

export interface UnpackSettings {
  /** a number of levels of directories to strip off the front of the file names in the archive when restoring (think tar --strip 1) */
  strip?: number;

  /** one or more transform strings to apply to the filenames as they are restored (think tar --xform ... ) */
  transform?: Strings;
}

/**
 * a file that can be unzipp'd
 *
 * combined with Verifyable, the checksum should be matched before proceeding
 */
export interface UnZip extends Verifiable, UnpackSettings {
  /** the source location of a file to unzip */
  unzip: ResourceLocation;
}


/**
 * a file that can be unzipp'd
 *
 * combined with Verifyable, the checksum should be matched before proceeding
 */
export interface UnTar extends Verifiable, UnpackSettings {
  /** the source location of a file to untar */
  untar: ResourceLocation;
}


/**
 * a special version of UnZip, this assumes the nuget.org package repository
 * the 'nuget' value is the package id (ie, 'Microsoft.Windows.SDK.CPP.x64/10.0.19041.5')
 *
 * and that is appended to the known-url https://www.nuget.org/api/v2/package/ to get
 * the final url.
 *
 * post MVP we could add the ability to use artifact sources and grab the package that way.
 *
 * combined with Verifyable, the checksum should be matched before proceeding
 */
export interface NuGet extends Verifiable, UnpackSettings {
  /** the source location of a file to unzip/untar/unrar/etc */
  nuget: string;
}

/**
 * a file that can be untar/unzip/unrar/etc
 *
 * combined with Verifyable, the checksum should be matched before proceeding
 */
export interface Git {
  /** the git repository location to be cloned */
  git: ResourceLocation;

  /** optionally, a tag/branch to be checked out */
  tag?: string;

  /**
   * determines if the whole repo is cloned.
   *
   * Note:
   *  - when false (default), indicates that the repo should be cloned with --depth 1
   *  - when true, indicates that the full repo should be cloned
   * */
  full?: boolean;

  /**
   * determines if the repo should be cloned recursively.
   *
   * Note:
   *  - when false (default), indicates that the repo should clone recursive submodules
   *  - when true, indicates that the repo should be cloned recursively.
   */
  recurse?: boolean;
}

/** a package would be referenced as a source, plus any source-specific settings */
export interface Package {
  [key: string]: any;
}

/**
   * defines what should be physically laid out on disk for this artifact
   *
   * Note: once the host/environment queries have been completed, there should
   *       only be one single package/file/repo/etc that gets downloaded and
   *       installed for this artifact.  If there needs to be more than one,
   *       then there would need to be a 'requires' that refers to the additional
   *       package.
   *
   * More types to follow.
   */
export type Installer = UnZip | UnTar | NuGet | Git;

class InfoNode implements Info {
  /** @internal */
  constructor(protected node: YAMLMap) {

  }
  get id(): string {
    return this.node.get('id');
  }
  set id(value: string) {
    this.node.set('id', createNode(value));
  }

  get version(): string {
    return this.node.get('version');
  }
  set version(value: string) {
    const v = parseSemver(value);
    this.node.set('version', v?.format() || fail(i`Version '${value}' is not a legal semver version`));
  }

  get summary(): string | undefined {
    return this.node.get('summary') || undefined;
  }
  set summary(value: string | undefined) {
    this.node.set('summary', value);
  }

  get description(): string | undefined {
    return this.node.get('description') || undefined;
  }
  set description(value: string | undefined) {
    this.node.set('description', value);
  }
}

function getOrCreateMap(node: Document.Parsed | Collection, name: string): YAMLMap {
  let m = node.get(name);
  if (m instanceof YAMLMap) {
    return m;
  }
  strict.ok(!m, 'node is not a map');
  node.set(name, m = new YAMLMap());
  return m;
}

function proxyDictionary<T = string>(thisNode: YAMLMap, onGet: (thisNode: YAMLMap, prop: string) => T, onSet: (thisNode: YAMLMap, prop: string, value: T) => void, instance: any = new DictionaryNode(thisNode)): Dictionary<T> {
  const prototype = Object.getPrototypeOf(instance);
  return new Proxy<Dictionary<T>>(instance, {

    // allows you to delete a property
    deleteProperty: (dummy: Dictionary<T>, property: string | symbol) => {

      const i = thisNode.items.findIndex((each: any) => each == property || each.key == property); {
        if (i > -1) {
          // remove that item
          thisNode.items.splice(i, 1);
          return true;
        }
      }
      return true;
    },

    // allows usage of 'Object.getOwnPropertyNames`
    ownKeys: (dummy: Dictionary<T>) => {
      return thisNode.items.map(each => {
        const k = each.key;
        return (k instanceof Scalar) ? k.value : k;
      });
    },

    get: (dummy: Dictionary<T>, property: string, unused: any) => {
      // if the object has a property for this, don't proxy.
      // eslint-disable-next-line no-prototype-builtins
      if (prototype.hasOwnProperty(property) || instance[property]) {
        const r = instance[property];
        return typeof r === 'function' ?
          r.bind(instance) : // rebind the function back to the actual instance (so we don't have to deref it with valueof.)
          r; // just the property then.
      }

      return onGet(thisNode, property) || undefined;
      // return thisNode.get(property) || undefined;
    },

    set: (dummy: Dictionary<T>, property: string, value: any, unused: any) => {
      onSet(thisNode, property, value);
      // thisNode.set(property, value);
      return true;
    }
  });
}


function getStrings(node: Document.Parsed | Collection, name: string): Array<string> {
  const r = node.get(name);
  if (r) {
    if (r instanceof YAMLSeq) {
      return r.items.map(each => each.value);
    }
    if (typeof r === 'string') {
      return [r];
    }
  }
  return [];
}

function setStrings(node: Document.Parsed | Collection, name: string, value: StringOrStrings) {
  if (Array.isArray(value)) {
    switch (value.length) {
      case 0:
        return node.set(name, undefined);
      case 1:
        return node.set(name, value[0]);
    }
    return node.set(name, createNode(value, true));
  }
  node.set(name, value);
}

export function isPrimitive(value: any): value is string | number | boolean {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
  }
  return false;
}

class NodeBase {
  #name: string;
  #props = <{ [key: string]: Strings }>{};

  protected strings(property: string) {
    return this.#props[property] || (this.#props[property] = new Strings(this.node, property));
  }

  constructor(protected readonly node: YAMLMap, name: string) {
    this.#name = name;
  }

  get name() {
    return this.#name;
  }

  set name(name: string) {
    // have to use the parent node and move this whole node.

  }

  protected getString(property: string): string | undefined {
    const v = this.node.get(property);
    return typeof v === 'string' ? v : undefined;
  }
  protected setString(property: string, value: string | undefined) {
    if (!value) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }
    this.node.set(property, value);
  }

  protected getNumber(property: string): number | undefined {
    const v = this.node.get(property);
    return typeof v === 'number' ? v : undefined;
  }
  protected setNumber(property: string, value: number | undefined) {
    if (value === undefined) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }
    this.node.set(property, value);
  }

  protected getBoolean(property: string): boolean | undefined {
    const v = this.node.get(property);
    return typeof v === 'boolean' ? v : undefined;
  }

  protected setBoolean(property: string, value: boolean | undefined) {
    if (value === undefined) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }
    this.node.set(property, value);
  }

  protected getStrings(property: string): StringOrStrings | undefined {
    return getStrings(this.node, property);
  }
  protected setStrings(property: string, value: StringOrStrings | undefined) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      if (this.node.has(property)) {
        this.node.delete(property);
      }
      return;
    }

    // force it to copy the values
    if (value instanceof Strings) {
      value = [...value];
    }

    if (Array.isArray(value)) {
      switch (value.length) {
        case 0:
          return this.node.set(property, undefined);
        case 1:
          return this.node.set(property, value[0]);
      }
      return this.node.set(property, createNode(value, true));
    }
    this.node.set(property, value);
  }


}

class DictionaryNode<T> implements Dictionary<T> {

  constructor(protected readonly node: YAMLMap | Document.Parsed) {

  }

  [key: string]: any;

  get keys(): Array<string> {
    const filter = Object.getOwnPropertyNames(Object.getPrototypeOf(this));

    return this.node.items.map((each: any) => {

      const k = each.key;
      return (k instanceof Scalar) ? k.value : k;
    }).filter(each => filter.indexOf(each) === -1); // filter out actual known property names from the dictionary.
  }

  remove(key: string): void {
    const i = this.node.items.findIndex((each: any) => each == key || each.key == key); {
      if (i > -1) {
        // remove that item
        this.node.items.splice(i, 1);
        return;
      }
    }
  }

  /* Come back to this if we really need an iterator
  [Symbol.iterator](): Iterator<any, any, undefined> {

    const i = this.node.items.map(each => ({ key: each.key.value || each.key, value: ((<any>this).__px__)[each.key.value || each.key] }));
    return i[Symbol.iterator]();
  }
   */

}

class SettingsNode extends DictionaryNode<any> implements Settings {
  /** @internal */
  constructor(node: YAMLMap) {
    super(node);
  }

  #paths!: Paths;
  get paths(): Paths {
    return this.#paths || (this.#paths = <Paths>proxyDictionary(getOrCreateMap(this.node, 'paths'), (m, p) => getStrings(m, p), setStrings));
  }

  #tools!: Dictionary<string>;
  get tools(): Dictionary<string> {
    return this.#tools || (this.#tools = proxyDictionary(getOrCreateMap(this.node, 'tools'), (m, p) => m.get(p), (m, p, v) => m.set(p, v)));
  }

  #variables!: Dictionary<StringOrStrings>;
  get variables(): Dictionary<StringOrStrings> {
    return this.#variables || (this.#variables = proxyDictionary<StringOrStrings>(getOrCreateMap(this.node, 'variables'), getStrings, setStrings));
  }

  #defines!: Dictionary<string>;
  get defines(): Dictionary<string> {
    return this.#defines || (this.#defines = proxyDictionary(getOrCreateMap(this.node, 'defines'), (m, p) => m.get(p), (m, p, v) => m.set(p, v)));
  }
}

class SourceNode extends NodeBase {
  // ArtifactSource nodes are shape-polymorphic.
  protected constructor(protected readonly node: YAMLMap, name: string, protected readonly kind: string) {
    super(node, name);
  }

  get location(): Strings {
    return this.strings('location');
  }

}

class NugetSourceNode extends SourceNode implements NuGetArtifactSource {
  constructor(node: YAMLMap, name: string) {
    super(node, name, 'nuget');
  }
}

class LocalSourceNode extends SourceNode implements LocalArtifactSource {
  constructor(node: YAMLMap, name: string) {
    super(node, name, 'path');
  }
}

class GitSourceNode extends SourceNode implements GitArtifactSource {
  constructor(node: YAMLMap, name: string) {
    super(node, name, 'git');
  }
}

function createArtifactSourceNode(node: YAMLMap, name: string) {
  // detect type by presence of fields
  if (node.has('path')) {
    return new LocalSourceNode(getOrCreateMap(node, name), name);
  }
  if (node.has('nuget')) {
    return new NugetSourceNode(getOrCreateMap(node, name), name);
  }
  if (node.has('git')) {
    return new GitSourceNode(getOrCreateMap(node, name), name);
  }
  fail(i`unknown source node type`);
}

function createInstallerNode(node: YAMLMap, name: string): Installer {
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


class ContactNode extends NodeBase implements Contact {
  get email(): string | undefined {
    return this.getString('email');
  }

  set email(address: string | undefined) {
    this.setString('email', address);
  }

  get roles(): Strings {
    return this.strings('role');
  }
}

function setVersionRef(map: YAMLMap, property: string, value: string | VRef) {
  if (!value) {
    map.set(property, undefined);
  }
  if (typeof value === 'string') {
    return map.set(property, value);
  }
  if (value.range) {
    map.set(property, createNode(`${value.range.raw || value.range?.toString()} ${value.resolved?.raw || value.resolved?.toString() || ''}`.trim()));
  }
}

function getVersionRef(map: YAMLMap, property: string) {
  return (map.has(property)) ? new VRef(map, property) : <VRef><unknown>undefined;
}

class DemandNode extends NodeBase {

  #requires!: Dictionary<VersionReference>
  get requires(): Dictionary<VersionReference> {
    return this.#requires || (this.#requires = proxyDictionary(getOrCreateMap(this.node, 'requires'), getVersionRef, setVersionRef));
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

  #seeAlso!: Dictionary<VersionReference>
  get seeAlso(): Dictionary<VersionReference> {
    return this.#seeAlso || (this.#seeAlso = proxyDictionary(getOrCreateMap(this.node, 'see-also'), getVersionRef, setVersionRef));
  }

  #settings!: SettingsNode;
  get settings(): SettingsNode {
    return this.#settings || (this.#settings = <SettingsNode>proxyDictionary<any>(getOrCreateMap(this.node, 'settings'), getOrCreateMap, () => { fail('no.'); }, new SettingsNode(getOrCreateMap(this.node, 'settings'))));
  }

  #install!: Installer;
  get install(): Installer {
    return this.#install || (this.#install = createInstallerNode(this.node, 'install'));
  }
  get use(): Dictionary<StringOrStrings> | undefined {
    throw new Error('not implemented');
  }
}

class Amf extends DictionaryNode<Demands> implements ProfileBase, Dictionary<Demands> {
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

  #contacts!: Dictionary<Contact>
  get contacts(): Dictionary<Contact> {
    return this.#contacts || (this.#contacts = proxyDictionary(getOrCreateMap(this.document, 'contacts'), (m, p) => new ContactNode(getOrCreateMap(m, p), p), () => { fail('Can not set entries directly.'); }));
  }

  #sources!: Dictionary<ArtifactSource>;
  get sources(): Dictionary<ArtifactSource> | undefined {
    return this.#sources || (this.#sources = proxyDictionary(getOrCreateMap(this.document, 'sources'), createArtifactSourceNode, () => { fail('Can not set entries directly.'); }));
  }

  get insert(): 'allowed' | 'only' | undefined {
    throw new Error('not implemented');
  }

  /* Demands */

  #requires!: Dictionary<VersionReference>
  get requires(): Dictionary<VersionReference> {
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

  #seeAlso!: Dictionary<VersionReference>
  get seeAlso(): Dictionary<VersionReference> {
    return this.#seeAlso || (this.#seeAlso = proxyDictionary(getOrCreateMap(<YAMLMap>this.document.contents, 'see-also'), getVersionRef, setVersionRef));
  }

  #settings!: SettingsNode;
  get settings(): SettingsNode {
    return this.#settings || (this.#settings = <SettingsNode>proxyDictionary<any>(getOrCreateMap(<YAMLMap>this.document.contents, 'settings'), getOrCreateMap, () => { fail('no.'); }, new SettingsNode(getOrCreateMap(this.document, 'settings'))));
  }

  #install!: Installer;
  get install(): Installer {
    return this.#install || (this.#install = createInstallerNode(<YAMLMap>this.document.contents, 'install'));
  }
  get use(): Dictionary<StringOrStrings> | undefined {
    throw new Error('not implemented');
  }
}
