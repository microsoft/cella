/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fail } from 'assert';
import { default as got, Headers, HTTPError, Response } from 'got';
import { anyWhere } from './promise';
import { enhanceReadable } from './streams';
import { Uri } from './uri';

export function _head(location: Uri, headers: Headers = {}) {
  return got.head(location.toUrl(), { followRedirect: true, maxRedirects: 10, timeout: 15000, headers });
}

export async function resolveRedirect(location: Uri) {
  let finalUrl = location;

  const stream = got.get(location.toUrl(), { followRedirect: true, maxRedirects: 10, timeout: 15000, isStream: true });

  // when the response comes thru, we can grab the headers & stuff from it
  stream.on('response', (response: Response) => {
    finalUrl = location.fileSystem.parse(response.redirectUrls.last || finalUrl.toString());
  });

  // we have to get at least some data for the response event to trigger.
  for await (const chunk of stream) {
    // but we don't need any of it :D
    break;
  }
  stream.destroy();
  return finalUrl;
}

export async function head(location: Uri, headers: Headers = {}): Promise<Response<string>> {
  try {
    // on a successful HEAD request, do nothing different
    return await got.head(location.toUrl(), { followRedirect: true, maxRedirects: 10, timeout: 15000, headers });
  } catch (E) {
    // O_o
    //
    // So, it turns out that nuget servers (maybe others too?) don't do redirects on HEAD requests,
    // and instead issue a 404.
    // let's retry the request as a GET, and dump it after the first chunk.
    // typically, a HEAD request should see a 300-400msec response time
    // and yes, this does stretch that out to 500-700msec, but whatcha gonna do?
    if (E instanceof HTTPError && E.response.statusCode === 404) {
      try {
        const syntheticResponse = <Response<string>>{};
        const stream = got.get(location.toUrl(), { followRedirect: true, maxRedirects: 10, timeout: 15000, headers, isStream: true });

        // when the response comes thru, we can grab the headers & stuff from it
        stream.on('response', (response: Response) => {
          syntheticResponse.headers = response.headers;
          syntheticResponse.statusCode = response.statusCode;
          syntheticResponse.redirectUrls = response.redirectUrls;
        });

        // we have to get at least some data for the response event to trigger.
        for await (const chunk of stream) {
          // but we don't need any of it :D
          break;
        }
        stream.destroy();
        return syntheticResponse;
      }
      catch {
        // whatever, it didn't work. let the rethrow happen.
      }
    }
    throw E;
  }
}

export function get(location: Uri, options?: { start?: number, end?: number }) {
  let headers: Headers | undefined = undefined;
  headers = setRange(headers, options?.start, options?.end);

  return got.get(location.toUrl(), { headers });
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

  return enhanceReadable(got.get(location.toUrl(), { isStream: true, retry: 3, headers }), options?.start, options?.end);
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

  // any of the sha* checksums..
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

  // an md5 (either in digest or content-md5)
  checksum = md5(headers['digest'], headers['content-md5']);
  if (checksum) {
    return { checksum, algorithm: 'md5' };
  }

  // ok, last ditch effort.
  //
  // maybe if they had an etag, it'd be an md5 checksum perchance? (V) (°,,,,°) (V)
  let etag = headers['etag'];
  etag = (etag ? Array.isArray(etag) ? etag : [etag] : [])[0];
  if (etag) {
    etag = etag.replace(/\W/g, '').toLowerCase();
    if (etag.length === 32) {
      // woop woop woop woop
      return { checksum: etag, algorithm: 'md5' };
    }
  }

  return { checksum: undefined, algorithm: undefined };
}

export class RemoteFile {
  info: Array<Promise<Info>>;
  constructor(protected locations: Array<Uri>) {
    this.info = locations.map(location => {
      return head(location, {
        'want-digest': 'sha-256;q=1, sha-512;q=0.9 ,MD5; q=0.3',
        'accept-encoding': 'identity;q=0', // we need to know the content length without gzip encoding,
        'user-agent': 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5'
      }).then(data => {
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
    this.availableLocation = Promise.any(this.info).then(success => success.location, f => {
      fail(`unsuccessful ${f}`);
    });
    this.resumable = anyWhere(this.info, each => each.resumeable).then(success => true, fail => false);
    this.resumableLocation = anyWhere(this.info, each => each.resumeable).then(success => success.location, fail => undefined);
    this.contentLength = anyWhere(this.info, each => !!each.contentLength).then(success => success.contentLength, fail => -2);
    this.checksum = anyWhere(this.info, each => !!each.checksum).then(success => success.checksum, fail => undefined);
    this.algorithm = anyWhere(this.info, each => !!each.algorithm).then(success => success.algorithm, fail => undefined);

  }

  resumable: Promise<boolean>;
  contentLength: Promise<number>;
  checksum: Promise<string | undefined>;
  algorithm: Promise<string | undefined>;
  availableLocation: Promise<Uri | undefined>;
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
