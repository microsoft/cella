// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Demands } from './metadata/demands';
import { ProfileBase } from './metadata/profile-base';
import { GitRegistry } from './metadata/registries/git-registry';
import { LocalRegistry } from './metadata/registries/local-registry';
import { NugetRegistry } from './metadata/registries/nuget-registry';


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

export type KnownArtifactRegistryTypes = NugetRegistry | LocalRegistry | GitRegistry;

/** values that can be either a single string, or an array of strings */
export type StringOrStrings = string | Array<string>;
