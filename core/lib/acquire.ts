/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fail, strict } from 'assert';
import { Checksum } from './checksum';
import { Credentials } from './credentials';
import { Emitter, EventForwarder } from './events';
import { get, getStream, RemoteFile } from './https';
import { i } from './i18n';
import { intersect } from './intersect';
import { Session } from './session';
import { EnhancedReadable, Progress } from './streams';
import { Uri } from './uri';

/* Downloading URLs
 progress
 uses fs virtualization (no direct writes)
 checksum verification
 supports mirrors
 checks local cache
 Nuget Package Download (via HTTP)
 Write to local cache*/

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

const size32K = 1 << 15;

export interface AcquireOptions extends Checksum {
  /** force a redownload even if it's in cache */
  force?: boolean;
  credentials: Credentials;
}

export interface AcquireEvents extends Progress {
  complete(): void;
}

/** */
export function http(session: Session, uris: Array<Uri>, outputFilename: string, options?: AcquireOptions) {
  const fwd = new EventForwarder<EnhancedReadable>();

  const fn = async () => {
    let resumeAtOffset = 0;
    await session.cache.createDirectory();
    const outputFile = session.cache.join(outputFilename);

    if (options?.force) {
      // is force specified; delete the current file
      await outputFile.delete();
    }

    // start this peeking at the target uris.
    const locations = new RemoteFile(uris);
    let url: Uri | undefined;

    // is there a file in the cache
    if (await outputFile.exists()) {

      if (options?.algorithm) {
        // does it match a checksum that we have?
        if (await outputFile.checksumValid(options)) {
          // yes it does. let's just return done.
          return outputFile;
        }
      }
      // it doesn't match.
      // at best, this might be a resume.
      // well, *maybe*. Does the remote support resume?

      // first, make sure that there is a remote that is accesible.
      strict.ok(!!await locations.availableLocation, `Requested file ${outputFilename} has no accessible locations ${uris.map(each => each.toString()).join(',')}.`);

      url = await locations.resumableLocation;
      // ok, does it support resume?
      if (url) {
        // yes, let's check what the size is expected to be.

        const onDiskSize = await outputFile.size();
        if (onDiskSize > 1 << 16) {
          // it's bigger than 64k. Good. otherwise, we're just wasting time.

          // so, how big is the remote
          const contentLength = await locations.contentLength;
          if (contentLength >= onDiskSize) {
            // looks like there could be more remotely than we have.
            // lets compare the first 32k and the last 32k of what we have
            // against what they have and see if they match.
            const top = (await get(url, { start: 0, end: size32K - 1 })).rawBody;
            const bottom = (await get(url, { start: onDiskSize - size32K, end: onDiskSize - 1 })).rawBody;

            const onDiskTop = await outputFile.readBlock(0, size32K - 1);
            const onDiskBottom = await outputFile.readBlock(onDiskSize - size32K, onDiskSize - 1);

            if (top.compare(onDiskTop) === 0 && bottom.compare(onDiskBottom) === 0) {
              // looks like we can continue from here.
              resumeAtOffset = onDiskSize;
            }
          }
        }
      }
    }

    if (resumeAtOffset === 0) {
      // clearly we mean to not resume. clean any existing file.
      await outputFile.delete();
    }
    url = url || await locations.availableLocation;
    strict.ok(!!url, `Requested file ${outputFilename} has no accessible locations ${uris.map(each => each.toString()).join(',')}.`);

    const length = await locations.contentLength;

    const inputStream = getStream(url, { start: resumeAtOffset, end: length > 0 ? length : undefined });
    const outputStream = await outputFile.appendStream();

    // bubble up access to the events to the consumer if they want them
    fwd.register(inputStream);

    // whoooosh. write out the file
    inputStream.pipe(outputStream);

    // this is when we know we're done.
    await outputStream.is.done;

    // we've downloaded the file, let's see if it matches the checksum we have.
    if (options?.algorithm) {

      // does it match the checksum that we have?
      if (!await outputFile.checksumValid(options)) {
        await outputFile.delete();
        fail(i`Downloaded file '${outputFile.fsPath}' did not have the correct checksum (${options.algorithm}:${options.checksum}) `);
      }
    }

    return outputFile;
  };

  return intersect(<Emitter<EnhancedReadable>>fwd, fn());
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