/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fail, strict } from 'assert';
import { Checksum, ChecksumAlgorithm } from './checksum';
import { Credentials } from './credentials';
import { Emitter, EventForwarder } from './events';
import { get, getStream, RemoteFile, resolveRedirect } from './https';
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
const size64K = 1 << 16;

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

  session.channels.debug(`Attempting to download file '${outputFilename}' from [${uris.map(each => each.toString()).join(',')}]`);

  const fn = async () => {
    let resumeAtOffset = 0;
    await session.cache.createDirectory();
    const outputFile = session.cache.join(outputFilename);

    if (options?.force) {
      session.channels.debug(`Acquire '${outputFilename}': force specified, forcing download.`);
      // is force specified; delete the current file
      await outputFile.delete();
    }

    // start this peeking at the target uris.
    session.channels.debug(`Acquire '${outputFilename}': checking remote connections.`);
    const locations = new RemoteFile(uris);
    let url: Uri | undefined;

    // is there a file in the cache
    if (await outputFile.exists()) {
      session.channels.debug(`Acquire '${outputFilename}': local file exists.`);
      if (options?.algorithm) {
        // does it match a checksum that we have?
        if (await outputFile.checksumValid(options)) {
          session.channels.debug(`Acquire '${outputFilename}': local file checksum matches metdata.`);
          // yes it does. let's just return done.
          return outputFile;
        }
      }
      // it doesn't match a known checksum.

      const contentLength = await locations.contentLength;
      session.channels.debug(`Acquire '${outputFilename}': remote connection info is back.`);
      const onDiskSize = await outputFile.size();

      // first, make sure that there is a remote that is accesible.
      strict.ok(!!await locations.availableLocation, `Requested file ${outputFilename} has no accessible locations ${uris.map(each => each.toString()).join(',')}.`);

      url = await locations.resumableLocation;
      // ok, does it support resume?
      if (url) {
        // yes, let's check what the size is expected to be.

        if (!options?.algorithm) {

          if (contentLength === onDiskSize) {
            session.channels.debug(`Acquire '${outputFilename}': on disk file matches length of remote file`);
            const algorithm = <ChecksumAlgorithm>(await locations.algorithm);
            const checksum = await locations.checksum;
            session.channels.debug(`Acquire '${outputFilename}': remote alg/chk: '${algorithm}'/'${checksum}.`);
            if (algorithm && checksum && outputFile.checksumValid({ algorithm, checksum })) {
              session.channels.debug(`Acquire '${outputFilename}': on disk file checksum matches the server checksum.`);
              // so *we* don't have the checksum, but ... if the server has a checksum, we could see if what we have is what they have?
              // it does match what the server has.
              // I call this an win.
              return outputFile;
            }

            // we don't have a checksum, or what we have doesn't match.
            // maybe we will get a match below (or resume)
          }
        }

        if (onDiskSize > size64K) {
          // it's bigger than 64k. Good. otherwise, we're just wasting time.

          // so, how big is the remote
          if (contentLength >= onDiskSize) {
            session.channels.debug(`Acquire '${outputFilename}': local file length is less than or equal to remote file length.`);
            // looks like there could be more remotely than we have.
            // lets compare the first 32k and the last 32k of what we have
            // against what they have and see if they match.
            const top = (await get(url, { start: 0, end: size32K - 1 })).rawBody;
            const bottom = (await get(url, { start: onDiskSize - size32K, end: onDiskSize - 1 })).rawBody;

            const onDiskTop = await outputFile.readBlock(0, size32K - 1);
            const onDiskBottom = await outputFile.readBlock(onDiskSize - size32K, onDiskSize - 1);

            if (top.compare(onDiskTop) === 0 && bottom.compare(onDiskBottom) === 0) {
              session.channels.debug(`Acquire '${outputFilename}': first/last blocks are equal.`);
              // the start and end of what we have does match what they have.
              // is this file the same size?
              if (contentLength === onDiskSize) {
                // same file size, front and back match, let's accept this. begrudgingly
                session.channels.debug(`Acquire '${outputFilename}': file size is identical. keeping this one.`);
                return outputFile;
              }
              // looks like we can continue from here.
              session.channels.debug(`Acquire '${outputFilename}': ok to resume.`);
              resumeAtOffset = onDiskSize;
            }
          }
        }
      }
    }

    if (resumeAtOffset === 0) {
      // clearly we mean to not resume. clean any existing file.
      session.channels.debug(`Acquire '${outputFilename}': not resuming file, full download.`);
      await outputFile.delete();
    }

    url = url || await locations.availableLocation;
    strict.ok(!!url, `Requested file ${outputFilename} has no accessible locations ${uris.map(each => each.toString()).join(',')}.`);
    session.channels.debug(`Acquire '${outputFilename}': initiating download.`);
    const length = await locations.contentLength;

    const inputStream = getStream(url, { start: resumeAtOffset, end: length > 0 ? length : undefined });
    // bubble up access to the events to the consumer if they want them
    fwd.register(inputStream);

    const outputStream = await outputFile.appendStream();

    // whoooosh. write out the file
    inputStream.pipe(outputStream);

    // this is when we know we're done.
    await outputStream.is.done;

    // we've downloaded the file, let's see if it matches the checksum we have.
    if (options?.algorithm) {
      session.channels.debug(`Acquire '${outputFilename}': checking downloaded file checksum.`);
      // does it match the checksum that we have?
      if (!await outputFile.checksumValid(options)) {
        await outputFile.delete();
        fail(i`Downloaded file '${outputFile.fsPath}' did not have the correct checksum (${options.algorithm}:${options.checksum}) `);
      }
      session.channels.debug(`Acquire '${outputFilename}': downloaded file checksum matches specified checksum.`);
    }

    session.channels.debug(`Acquire '${outputFilename}': downloading file successful.`);
    return outputFile;
  };

  return intersect(<Emitter<EnhancedReadable>>fwd, fn());
}

export async function resolveNugetUrl(session: Session, pkg: string) {
  const [, name, version] = pkg.match(/^(.*)\/(.*)$/) ?? [];
  strict.ok(version, i`package reference '${pkg}' is not a valid nuget package reference ({name}/{version}).`);

  // let's resolve the redirect first, since nuget servers don't like us getting HEAD data on the targets via a redirect.
  // even if this wasn't the case, this is lower cost now rather than later.
  const url = await resolveRedirect(session.fileSystem.parse(`https://www.nuget.org/api/v2/package/${name}/${version}`));

  session.channels.debug(`Resolving nuget package for '${pkg}' to '${url}'`);
  return url;
}

export async function nuget(session: Session, pkg: string, outputFilename: string, options?: AcquireOptions): Promise<Uri> {
  return http(session, [await resolveNugetUrl(session, pkg)], outputFilename, options);
}

/** @internal */
export async function git(session: Session, repo: Uri, progress: Progress, options?: AcquireOptions): Promise<void> {
  // clone the uri
  // save it to the cache
}