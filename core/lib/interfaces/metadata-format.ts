// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { LineCounter, parseDocument } from 'yaml';
import { MetadataFile } from '../amf/metadata-file';
import { GitInstaller } from './git-installer';
import { GitRegistry } from './git-registry';
import { Installer } from './Installer';
import { LocalRegistry } from './local-registry';
import { Demands } from './metadata/demands';
import { NugetRegistry } from './nuget-registry';
import { NupkgInstaller } from './nupkg-installer';
import { ProfileBase } from './profile-base';
import { UnTarInstaller } from './untar-installer';
import { UnZipInstaller } from './unzip-installer';


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
export type Profile = ProfileBase & {
  [key: string]: Demands;
}

export type ArtifactSource = NugetRegistry | LocalRegistry | GitRegistry;

/** values that can be either a single string, or an array of strings */
export type StringOrStrings = string | Array<string>;

export function isNupkg(installer: Installer): installer is NupkgInstaller {
  return installer.kind === 'nupkg';
}
export function isUnZip(installer: Installer): installer is UnZipInstaller {
  return installer.kind === 'unzip';
}
export function isUnTar(installer: Installer): installer is UnTarInstaller {
  return installer.kind === 'untar';
}
export function isGit(installer: Installer): installer is GitInstaller {
  return installer.kind === 'git';
}
