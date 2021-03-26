/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ZipUnpacker } from '@microsoft/cella.core';
import { rejects, strict } from 'assert';
import { SuiteLocal } from './SuiteLocal';

/** Checks that progress delivers 0, 100, and constantly increasing percentages. */
class PercentageChecker {
  seenZero = false;
  lastSeen : number | undefined = undefined;
  recordPercent(percentage: number) {
    if (percentage === 0) {
      this.seenZero = true;
    }

    if (this.lastSeen !== undefined) {
      strict.ok(percentage >= this.lastSeen);
    }

    this.lastSeen = percentage;
  }

  test() {
    strict.ok(this.seenZero);
    strict.equal(this.lastSeen, 100);
  }

  reset() {
    this.seenZero = false;
    this.lastSeen = undefined;
  }
}

class ProgressCheckerEntry {
  seenZero = false;
  seenUnpacked = false;
  filePercentage = new PercentageChecker();

  constructor(public entryPath: string, public entryIdentity: any) {}

  onProgress(entry: any, filePercentage: number) {
    strict.equal(this.entryIdentity, entry);
    if (filePercentage === 0) {
      this.seenZero = true;
    }

    this.filePercentage.recordPercent(filePercentage);
  }

  onUnpacked(entry: any) {
    strict.equal(this.entryIdentity, entry);
    this.seenUnpacked = true;
  }

  test() {
    strict.ok(this.seenUnpacked);
    strict.ok(this.seenZero);
    this.filePercentage.test();
  }
}

class ProgressChecker {
  seenEntries = new Map<string, ProgressCheckerEntry>();
  archivePercentage = new PercentageChecker();

  onProgress(entry: any, filePercentage: number, archivePercentage: number) {
    let checkerEntry = this.seenEntries.get(entry.path);
    if (!checkerEntry) {
      checkerEntry = new ProgressCheckerEntry(entry.path, entry);
      this.seenEntries.set(entry.path, checkerEntry);
    }

    checkerEntry.onProgress(entry, filePercentage);
    this.archivePercentage.recordPercent(archivePercentage);
  }

  onUnpacked(entry: any) {
    const checkerEntry = this.seenEntries.get(entry.path);
    strict.ok(checkerEntry);
    checkerEntry.onUnpacked(entry);
  }

  reset() {
    this.seenEntries.clear();
    this.archivePercentage.reset();
  }

  test(entryCount : number) {
    strict.equal(entryCount, this.seenEntries.size);
    this.seenEntries.forEach((value) => value.test());
    this.archivePercentage.test();
  }
}

describe('ZipUnpacker', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(local.after.bind(local));
  const unpacker = new ZipUnpacker(local.session);
  const progressChecker = new ProgressChecker();
  unpacker.on('progress', progressChecker.onProgress.bind(progressChecker));
  unpacker.on('unpacked', progressChecker.onUnpacked.bind(progressChecker));
  before(() => progressChecker.reset());
  it('UnpacksLegitimateSmallZips', async () => {
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example');
    await unpacker.unpack(zipUri, targetUri, {});
    strict.equal((await targetUri.readFile('a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/c.txt')).toString(), 'The contents of c.txt.\n');
    progressChecker.test(7);
  });

  it('UnpacksZipsWithCompression', async () => {
    // big-compression.zip is an example input from yauzl:
    // https://github.com/thejoshwolfe/yauzl/blob/96f0eb552c560632a754ae0e1701a7edacbda389/test/big-compression.zip
    const zipUri = local.rootFolderUri.join('resources', 'big-compression.zip');
    const targetUri = local.tempFolderUri.join('big-compression');
    await unpacker.unpack(zipUri, targetUri, {});
    const contents = await targetUri.readFile('0x100000');
    strict.equal(contents.length, 0x100000);
    strict.ok(contents.every((value: number) => value === 0x0));
    progressChecker.test(1);
  });

  it('FailsToUnpackMalformed', async () => {
    // wrong-entry-sizes.zip is an example input from yauzl:
    // https://github.com/thejoshwolfe/yauzl/blob/96f0eb552c560632a754ae0e1701a7edacbda389/test/wrong-entry-sizes/wrong-entry-sizes.zip
    const zipUri = local.rootFolderUri.join('resources', 'wrong-entry-sizes.zip');
    const targetUri = local.tempFolderUri.join('wrong-entry-sizes');
    await rejects(unpacker.unpack(zipUri, targetUri, {}));
  });
});
