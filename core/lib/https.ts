/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { default as got, Headers } from 'got';
import { Uri } from './uri';

async function anyWhere<T>(from: Iterable<Promise<T>>, predicate: (value: T) => boolean) {
  const waiting = Promise.reject(0xDEFACED);

  let unfulfilled = new Array<Promise<T>>();
  const failed = new Array<Promise<T>>();
  const completed = new Array<T>();

  // wait for something to succeed. if nothing suceeds, then this will throw.
  const first = await Promise.any(from);
  let success: T | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {

    //
    for (const each of from) {
      // if we had a winner, return now.
      await Promise.any([each, waiting]).then(antecedent => {
        if (predicate(antecedent)) {
          success = antecedent;
          return antecedent;
        }
        completed.push(antecedent);
        return undefined;
      }).catch(r => {
        if (r === 0xDEFACED) {
          // it's not done yet.
          unfulfilled.push(each);
        } else {
          // oh, it returned and it was a failure.
          failed.push(each);
        }
        return undefined;
      });
    }
    // we found one that passes muster!
    if (success) {
      return success;
    }

    if (unfulfilled.length) {
      // something completed successfully, but nothing passed the predicate yet.
      // so hope remains eternal, lets rerun whats left with the unfulfilled.
      from = unfulfilled;
      unfulfilled = [];
      continue;
    }

    // they all finished
    // but nothing hit the happy path.
    break;
  }

  // if we get here, then we're
  // everything completed, but nothing passed the predicate
  // give them the first to suceed
  return first;
}

export function head(location: Uri, headers: Headers = {}) {
  return got.head(location.toUrl(), { followRedirect: true, maxRedirects: 10, timeout: 15000, headers });
}

export function get(location: Uri, options?: { start?: number, end?: number }) {
  let headers: Headers | undefined = undefined;
  headers = setRange(headers, options?.start, undefined);

  return got.get(location.toUrl());
}

function setRange(headers: Headers | undefined, start?: number, end?: number) {
  if (start !== undefined || end !== undefined) {
    headers = headers || {};
    headers['range'] = `bytes=${start !== undefined ? start : ''}-${end !== undefined ? end : ''}`;
  }
  return headers;
}

export function getStream(location: Uri, options?: { start?: number, end?: number }) {
  let headers: Headers | undefined = undefined;
  headers = setRange(headers, options?.start, undefined);

  return got.get(location.toUrl(), { isStream: true, retry: 3, headers });
}

export interface Info {
  failed?: boolean;
  location: Uri;
  resumeable: boolean;
  contentLength: number;
  checksum?: string;
  algorithm?: string;
}

function digest(headers: Headers) {
  let checksum = hashAlgorithm(headers['digest'], 'sha-256');
  if (checksum) {
    return { checksum, algorithm: 'sha256' };
  }
  checksum = hashAlgorithm(headers['digest'], 'sha-384');
  if (checksum) {
    return { checksum, algorithm: 'sha384' };
  }
  checksum = hashAlgorithm(headers['digest'], 'sha-512');
  if (checksum) {
    return { checksum, algorithm: 'sha512' };
  }
  checksum = md5(headers['digest'], headers['content-md5']);
  if (checksum) {
    return { checksum, algorithm: 'sha384' };
  }
  return { checksum: undefined, algorithm: undefined };
}

export class MirroredContent {
  info: Array<Promise<Info>>;
  constructor(protected locations: Array<Uri>) {
    this.info = locations.map(location => {
      return head(location, { 'want-digest': 'sha-256;q=1, sha-512;q=0.9 ,MD5; q=0.3' }).then(data => {
        if (data.statusCode === 200) {
          const { checksum, algorithm } = digest(data.headers);
          return {
            location,
            resumeable: data.headers['accept-ranges'] === 'bytes',
            contentLength: Number.parseInt(data.headers['content-length']!) || -1, // -1 means we were not told.
            checksum,
            algorithm,
          };
        }
        return {
          location,
          resumeable: false,
          contentLength: -1,
          failed: true
        };
      });
    });

    // lazy properties
    const resumelocations = new Array<Uri>();

    this.available = Promise.any(this.info).then(success => true, fail => false);
    this.resumable = anyWhere(this.info, each => each.resumeable).then(success => true, fail => false);
    this.resumableLocation = anyWhere(this.info, each => each.resumeable).then(success => success.location, fail => undefined);
    this.contentLength = anyWhere(this.info, each => !!each.contentLength).then(success => success.contentLength, fail => -2);
    this.checksum = anyWhere(this.info, each => !!each.checksum).then(success => success.checksum, fail => undefined);
    this.algorithm = anyWhere(this.info, each => !!each.algorithm).then(success => success.algorithm, fail => undefined);

  }

  available: Promise<boolean>;
  resumable: Promise<boolean>;
  contentLength: Promise<number>;
  checksum: Promise<string | undefined>;
  algorithm: Promise<string | undefined>;

  resumableLocation: Promise<Uri | undefined>;
}

function decode(data?: string): string | undefined {
  return data ? Buffer.from(data, 'base64').toString('hex').toLowerCase() : undefined;
}

function md5(digest: string | Array<string> | undefined, contentMd5: string | Array<string> | undefined): string | undefined {
  for (const each of (digest ? Array.isArray(digest) ? digest : [digest] : [])) {
    if (each.startsWith('md5=')) {
      return decode(each.substr(4));
    }
  }
  return decode(contentMd5 ? Array.isArray(contentMd5) ? contentMd5[0] : contentMd5 : undefined);
}

function hashAlgorithm(digest: string | Array<string> | undefined, algorithm: 'sha-256' | 'sha-384' | 'sha-512'): string | undefined {
  for (const each of (digest ? Array.isArray(digest) ? digest : [digest] : [])) {
    if (each.startsWith(algorithm)) {
      return decode(each.substr(8));
    }
  }
  return undefined;
}

