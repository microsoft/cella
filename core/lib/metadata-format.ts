// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Range, SemVer } from 'semver';
import { LineCounter, parseDocument } from 'yaml';
import { Installs } from './amf/installer';
import { MetadataFile, Primitive, Requires } from './amf/metadata-file';
import { YamlDictionary } from './yaml/MapOf';
import { StringsSequence } from './yaml/strings';

export { Range, SemVer };

export function parseConfiguration(filename: string, content: string): MetadataFile {
  const lc = new LineCounter();
  const doc = parseDocument(content, { prettyErrors: false, lineCounter: lc, strict: true });
  const m = new MetadataFile(doc, filename, lc);
  return m;
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
  contacts: YamlDictionary<Contact>;   // optional

  /** artifact sources list the references necessary to install artifacts in this file */
  catalogs?: YamlDictionary<ArtifactSource>;

  /** mark an artifact as supporting insert (either allowed or only) */
  insert?: 'allowed' | 'only';

  /** global settings */
  globalSettings: YamlDictionary<Primitive | Record<string, unknown>>;

  /** is this document valid */
  readonly isValidYaml: boolean;

  /** YAML errors in this document */
  readonly yamlErrors: Array<string>;

  /** does the document pass validation checks? */
  readonly isValid: boolean;

  /** what are the valiation check errors? */
  readonly validationErrors: Array<string>;

  /** @internal */
  readonly lineCounter: LineCounter;
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

export interface VersionReference extends Validation {
  range: Range;
  resolved?: SemVer;
  readonly raw: string;
}

/**
 * These are the things that are necessary to install/set/depend-on/etc for a given 'artifact'
 */
export interface Demands extends Validation {
  /** set of required artifacts */
  requires: Requires;

  /** An error message that the user should get, and abort the installation */
  error: string | undefined; // markdown text with ${} replacements

  /** A warning message that the user should get, does not abort the installation */
  warning: string | undefined; // markdown text with ${} replacements

  /** A text message that the user should get, does not abort the installation */
  message: string | undefined; // markdown text with ${} replacements

  /** set of artifacts that the consumer should be aware of */
  seeAlso: Requires;

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
  install: Installs;
}

export interface ValidationError {
  message: string;
  range?: [number, number, number];
  rangeOffset?: { line: number, column: number };
  category: ErrorKind;
}

export enum ErrorKind {
  SectionNotFound = 'SectionMessing',
  FieldMissing = 'FieldMissing',
  IncorrectType = 'IncorrectType',
  ParseError = 'ParseError',
  DuplicateKey = 'DuplicateKey',
  NoInstallInDemand = 'NoInstallInDemand',
  HostOnly = 'HostOnly',
  MissingHash = 'MissingHashValue'
}

export interface Validation {
  /**
   * @internal
   *
   * actively validate this node.
  */
  validate(): Iterable<ValidationError>;
}

/** Canonical Information about this artifact */
export interface Info extends Validation {
  /** Artifact identity
   *
   * this should be the 'path' to the artifact (following the guidelines)
   *
   * ie, 'compilers/microsoft/msvc'
   *
   * FYI: artifacts install to $CE_HOME/<id>/<VER> or if from another artifact source: $CE_HOME/<source>/<id>/<VER>
   */
  id: string;

  /** the version of this artifact */
  version: string;

  /** a short 1 line descriptive text */
  summary?: string;

  /** if a longer description is required, the value should go here */
  description?: string;

  /** if true, intended to be used only as a dependency; for example, do not show in search results or lists */
  dependencyOnly: boolean;
}

/** A person/organization/etc who either has contributed or is connected to the artifact */
export interface Contact extends Validation {
  name: string;
  email?: string;

  readonly roles: StringsSequence;
}

export type ArtifactSource = NuGetArtifactSource | LocalArtifactSource | GitArtifactSource;

interface ArtifactSourceBase extends Validation {
  /** the uri to the artifact source location */
  readonly location: StringsSequence;
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
export type StringOrStrings = string | Array<string>;

/**
 * types of paths that we can handle when crafting the context
 *
 * Paths has a well-known list of path types that we handle, but we make it a dictionary anyway.
 */
export interface Paths extends YamlDictionary<StringsSequence> {
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
export interface Settings extends YamlDictionary<Primitive | Record<string, any>>, Validation {
  /** a map of path categories to one or more values */
  paths: YamlDictionary<StringsSequence>;

  /** a map of the known tools to actual tool executable name */
  tools: YamlDictionary<string>;

  /**
   * a map of (environment) variables that should be set in the context.
   *
   * arrays mean that the values should be joined with spaces
   */
  variables: YamlDictionary<StringsSequence>;
  // this is where we'd see things like
  // CFLAGS: [...] where you can have a bunch of things that would end up in the CFLAGS variable (or used to set values in a vcxproj/cmake settings file.)
  //
  /**
   * a map of #defines for the artifact.
   *
   * these would likely also be turned into 'variables', but
   * it's significant enough that we need them separately
   */
  defines: YamlDictionary<string>;
}

/** One of several choices for a HASH etc */
export interface Verifiable {
  /** SHA-256 hash */
  sha256?: string;
  sha512?: string;
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
export interface Installer extends Validation {
  readonly kind: string;
  readonly lang?: string; // note to only install this entry when the current locale is this language
  readonly nametag?: string; // note to include this tag in the file name of the cached artifact
}

export interface UnpackSettings {
  /** a number of levels of directories to strip off the front of the file names in the archive when restoring (think tar --strip 1) */
  strip?: number;

  /** one or more transform strings to apply to the filenames as they are restored (think tar --xform ... ) */
  transform: StringsSequence;
}

/**
 * a file that can be unzipp'd
 *
 * combined with Verifiable, the hash should be matched before proceeding
 */
export interface UnZip extends Verifiable, UnpackSettings, Installer {
  /** the source location of a file to unzip */
  location: StringsSequence;
}


/**
 * a file that can be untar'd
 *
 * combined with Verifiable, the hash should be matched before proceeding
 */
export interface UnTar extends Verifiable, UnpackSettings, Installer {
  /** the source location of a file to untar */
  location: StringsSequence;
}


/**
 * a special version of UnZip, this assumes the nuget.org package repository
 * the 'nupkg' value is the package id (ie, 'Microsoft.Windows.SDK.CPP.x64/10.0.19041.5')
 *
 * and that is appended to the known-url https://www.nuget.org/api/v2/package/ to get
 * the final url.
 *
 * post MVP we could add the ability to use artifact sources and grab the package that way.
 *
 * combined with Verifiable, the hash should be matched before proceeding
 */
export interface Nupkg extends Verifiable, UnpackSettings, Installer {
  /** the source location of a file to unzip/untar/unrar/etc */
  location: string;
}

/**
 * a file that can be untar/unzip/unrar/etc
 *
 * combined with Verifiable, the hash should be matched before proceeding
 */
export interface Git extends Installer {
  /** the git repository location to be cloned */
  location: StringsSequence;

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

export function isNupkg(installer: Installer): installer is Nupkg {
  return installer.kind === 'nupkg';
}
export function isUnZip(installer: Installer): installer is UnZip {
  return installer.kind === 'unzip';
}
export function isUnTar(installer: Installer): installer is UnTar {
  return installer.kind === 'untar';
}
export function isGit(installer: Installer): installer is Git {
  return installer.kind === 'git';
}
