/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fail } from 'assert';
import { createHash } from 'crypto';
import { EnhancedReadable } from './streams';
import { Uri } from './uri';

// md5, sha1, sha256, sha512, sha384
export type ChecksumAlgorithm = 'sha256' | 'sha384' | 'sha512' | 'md5'

export async function hash(stream: AsyncIterable<Buffer> & EnhancedReadable | Promise<AsyncIterable<Buffer> & EnhancedReadable>, algorithm: 'sha256' | 'sha1' | 'sha384' | 'sha512' | 'md5' = 'sha256') {
  stream = await stream;

  try {
    for await (const chunk of stream.pipe(createHash(algorithm)).setEncoding('hex')) {
      // it should be done reading here
      return chunk;
    }
  } finally {
    stream.destroy();
  }
  fail('Should have returned a chunk from the pipe.');
}

export async function match(file: Uri, matchOptions?: Checksum) {

  if (await file.exists()) {
    return matchOptions?.algorithm && matchOptions?.checksum?.toLowerCase() === await hash(await file.readStream());
  }
  return false;
}


export interface Checksum {
  checksum?: string;
  algorithm?: 'sha256' | 'sha384' | 'sha512' | 'md5'
}

