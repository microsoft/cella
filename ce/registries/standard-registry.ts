// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { parseMetadata } from '../amf/metadata-file';
import { Uri } from '../util/uri';

export const THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING = '# MANIFEST-INDEX';

export async function isIndexFile(uri: Uri): Promise<boolean> {
  return await uri.isFile() && (await uri.readUTF8()).startsWith(THIS_IS_NOT_A_MANIFEST_ITS_AN_INDEX_STRING);
}
export async function isMetadataFile(uri: Uri): Promise<boolean> {
  if (await uri.isFile()) {
    try {
      return (await parseMetadata(uri, <any>undefined)).info.exists;
    } catch {
      // nope. no worries.
    }
  }
  return false;
}

