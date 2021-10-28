// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { YamlDictionary } from '../../yaml/MapOf';
import { StringsSequence } from '../../yaml/strings';
import { StringOrStrings } from '../metadata-format';

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
