import { fail } from 'assert';
import { Range, SemVer } from 'semver';
import { parseDocument } from 'yaml';
import { YAMLMap } from 'yaml/types';
import { DemandNode } from './amf/DemandNode';
import { Dictionary, proxyDictionary } from './amf/KeyedNode';
import { Amf } from './amf/metadata-file';
import { Strings } from './util/strings';
import { getOrCreateMap } from './util/yaml';

export { Range, SemVer };

export function parse(filename: string, content: string) {
  const doc = parseDocument(content, { prettyErrors: true });

  return <ProfileBase & DictionaryOf<Demands>><Amf>proxyDictionary(<YAMLMap>doc.contents, (m, p) => new DemandNode(getOrCreateMap(m, p), p), () => fail('nope'), new Amf(doc, filename));
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
  contacts: DictionaryOf<Contact>;   // optional

  /** artifact sources list the references necessary to install artifacts in this file */
  sources?: DictionaryOf<ArtifactSource>;

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

/**
 * These are the things that are necessary to install/set/depend-on/etc for a given 'artifact'
 */
export interface Demands {
  /** set of required artifacts */
  requires: DictionaryOf<VersionReference>;

  /** An error message that the user should get, and abort the installation */
  error?: string; // markdown text with ${} replacements

  /** A warning message that the user should get, does not abort the installation */
  warning?: string; // markdown text with ${} replacements

  /** A text message that the user should get, does not abort the installation */
  message?: string; // markdown text with ${} replacements

  /** set of artifacts that the consumer should be aware of */
  seeAlso: DictionaryOf<VersionReference>;

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
  use?: DictionaryOf<StringOrStrings>;

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

export type ArtifactSource = NuGetArtifactSource | LocalArtifactSource | GitArtifactSource;

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
export type StringOrStrings = string | Array<string>;

/** refers to a location of a resource. If an array is specified, they are considered mirrors */
type ResourceLocation = string | ReadonlyArray<string> | Strings;

/**
 * a mapped dictionary of string:T
 *
 * */
export type DictionaryOf<T> = {
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
export interface Paths extends Dictionary<StringOrStrings> {
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
export interface Settings extends DictionaryOf<any> {
  /** a map of path categories to one or more values */
  paths: Paths;

  /** a map of the known tools to actual tool executable name */
  tools: DictionaryOf<string>;

  /**
   * a map of (environment) variables that should be set in the context.
   *
   * arrays mean that the values should be joined with spaces
   */
  variables: DictionaryOf<StringOrStrings>;
  // this is where we'd see things like
  // CFLAGS: [...] where you can have a bunch of things that would end up in the CFLAGS variable (or used to set values in a vcxproj/cmake settings file.)
  //
  /**
   * a map of #defines for the artifact.
   *
   * these would likely also be turned into 'variables', but
   * it's significant enough that we need them separately
   */
  defines: DictionaryOf<string>;
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

