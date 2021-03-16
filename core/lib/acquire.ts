/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';
import { Checksum } from './checksum';
import { Credentials } from './credentials';
import { get, MirroredContent } from './https';
import { Session } from './session';
import { Uri } from './uri';

/* Downloading URLs
 progress
 uses fs virtualization (no direct writes)
 checksum verification
 supports mirrors
 checks local cache
 Nuget Package Download (via HTTP)
 Write to local cache*/


export type Progress = (kind: string, context: string, value: number) => boolean;

export interface AcquireOptions extends Checksum {
  /** force a redownload even if it's in cache */
  force?: boolean;


  credentials: Credentials;
}

/** @internal */
export async function http(session: Session, uris: Array<Uri>, outputFilename: string, progress: Progress, options?: AcquireOptions): Promise<boolean> {
  let resumeAtOffset = 0;

  const cachefolder = session.cellaHome.join('cache');

  if (options?.force) {
    // is force specified; delete the current file
    await session.cache.delete(outputFilename);
  }

  // start this peeking at the target uris.
  const locations = new MirroredContent(uris);

  // is there a file in the cache
  if (session.cache.exists(outputFilename)) {

    if (options?.algorithm) {
      // does it match a checksum that we have?
      if (session.cache.match(outputFilename, options)) {
        // yes it does. let's just return done.
        return true;
      }

      // it doesn't match.
      // at best, this might be a resume.
      // well, *maybe*. Does the remote support resume?

      // first, make sure that there is a remote that is accesible.
      strict.ok(await locations.available, `Requested file ${outputFilename} has no accessible locations ${uris.map(each => each.toString()).join(',')}.`);

      // ok, does it support resume?
      if (await locations.resumable) {

        // yes, let's check what the size is expected to be.
        const onDiskSize = await session.cache.size(outputFilename);
        if (onDiskSize > 1 << 16) {
          // it's bigger than 64k. Good. otherwise, we're just wasting time.

          // so, how big is the remote
          const contentLength = await locations.contentLength;
          if (contentLength >= onDiskSize) {
            // looks like there could be more remotely than we have.
            // lets compare the first 32k and the last 32k of what we have
            // against what they have and see if they match.
            const top = (await get((await locations.resumableLocation)!, { start: 0, end: 1 << 15 })).rawBody;
            const bottom = (await get((await locations.resumableLocation)!, { start: onDiskSize - (1 << 15), end: onDiskSize })).rawBody;

            const onDiskTop = await session.cache.readBlock(outputFilename, 0, 1 << 15);
            const onDiskBottom = await session.cache.readBlock(outputFilename, onDiskSize - (1 << 15), onDiskSize);

            if (top.compare(onDiskTop) === 0 && bottom.compare(onDiskBottom) === 0) {
              // looks like we can continue from here.
              resumeAtOffset = onDiskSize + 1;
            }
          }
        }
      }
    }
  }

  if (resumeAtOffset === 0) {
    // clearly we mean to not resume. clean any existing file.
    await session.cache.delete(outputFilename);
  }


  // is the file the correct one?
  // do we have a checksum to match it?
  // yes, does the checksum match?
  // yes; return

  // get the expected file length;
  // is the file smaller than the expected length?
  // yes. do the first 16K and the last 16K of what we have match what is remote?
  // yes, let's try to resume the download
  // no, wipe it and start the download fresh

  // no checksum. is it resumable?


  // download one of the uris

  // save it to the cache


  return false;
}

/** @internal */
export async function nuget(session: Session, pkg: string, outputFilename: string, progress: Progress, options?: AcquireOptions): Promise<void> {
  // download one of the packages
  // save it to the cache
}

/** @internal */
export async function git(session: Session, repo: Uri, progress: Progress, options?: AcquireOptions): Promise<void> {
  // clone the uri
  // save it to the cache
}