// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { SemVer } from 'semver';
import { MetadataFile } from '../amf/metadata-file';
import { IdentityKey, Index, SemverKey, StringKey } from './catalog';


export class RegistryIndex extends Index<MetadataFile, RegistryIndex> {
  id = new IdentityKey(this, (i) => i.info.id);
  version = new SemverKey(this, (i) => new SemVer(i.info.version));
  summary = new StringKey(this, (i) => i.info.summary);
}
