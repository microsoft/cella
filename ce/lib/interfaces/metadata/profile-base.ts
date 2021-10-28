// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { LineCounter } from 'yaml';
import { YamlDictionary } from '../../yaml/MapOf';
import { KnownArtifactRegistryTypes } from '../metadata-format';
import { Contact } from './contact';
import { Demands } from './demands';
import { Info } from './info';


type Primitive = string | number | boolean;

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
  contacts: YamlDictionary<Contact>; // optional


  /** artifact sources list the references necessary to install artifacts in this file */
  registries?: YamlDictionary<KnownArtifactRegistryTypes>;

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
