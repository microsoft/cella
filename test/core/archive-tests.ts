/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TarBzUnpacker, TarGzUnpacker, TarUnpacker, Unpacker, Uri, ZipUnpacker } from '@microsoft/cella.core';
import { strict } from 'assert';
import { SuiteLocal } from './SuiteLocal';

const isWindows = process.platform === 'win32';

describe('Unpacker', () => {
  it('StripsPaths', () => {
    ['', '/'].forEach((prefix) => {
      ['', '/'].forEach((suffix) => {
        const d = prefix + 'delta' + suffix;
        const cd = prefix + 'charlie/delta' + suffix;
        const bcd = prefix + 'beta/charlie/delta' + suffix;
        const abcd = prefix + 'alpha/beta/charlie/delta' + suffix;
        strict.equal(Unpacker.stripPath(abcd, 0), abcd);
        strict.equal(Unpacker.stripPath(abcd, 1), bcd);
        strict.equal(Unpacker.stripPath(abcd, 2), cd);
        strict.equal(Unpacker.stripPath(abcd, 3), d);
        strict.equal(Unpacker.stripPath(abcd, 4), undefined);

        strict.equal(Unpacker.stripPath(prefix + 'some///slashes\\\\\\\\here' + suffix, 0), prefix + 'some/slashes/here' + suffix);
      });
    });
  });
});

/** Checks that progress delivers 0, 100, and constantly increasing percentages. */
class PercentageChecker {
  seenZero = false;
  lastSeen: number | undefined = undefined;
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
    strict.equal(this.lastSeen, 100);
  }

  testRequireZero() {
    strict.ok(this.seenZero);
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

  constructor(public entryPath: string, public entryIdentity: any) { }

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
    this.filePercentage.testRequireZero();
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

  test(entryCount: number) {
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
  it('UnpacksLegitimateSmallZips', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example');
    await unpacker.unpack(zipUri, targetUri, {});
    strict.equal((await targetUri.readFile('a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.stat('a.txt')).mtime, Date.parse('2021-03-23T09:31:14.000Z'));
    strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('only-not-directory.txt')).toString(),
      'This content is only not in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/only-directory.txt')).toString(),
      'This content is only in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/inner/only-directory-directory.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });

  it('Truncates', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-truncates');
    await unpacker.unpack(zipUri, targetUri, {});
    progressChecker.reset();
    await unpacker.unpack(zipUri, targetUri, {}); // intentionally doubled
    strict.equal((await targetUri.readFile('a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('only-not-directory.txt')).toString(),
      'This content is only not in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/only-directory.txt')).toString(),
      'This content is only in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/inner/only-directory-directory.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });

  it('UnpacksZipsWithCompression', async () => {
    // big-compression.zip is an example input from yauzl:
    // https://github.com/thejoshwolfe/yauzl/blob/96f0eb552c560632a754ae0e1701a7edacbda389/test/big-compression.zip
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'big-compression.zip');
    const targetUri = local.tempFolderUri.join('big-compression');
    await unpacker.unpack(zipUri, targetUri, {});
    const contents = await targetUri.readFile('0x100000');
    strict.equal(contents.length, 0x100000);
    strict.ok(contents.every((value: number) => value === 0x0));
    progressChecker.test(1);
  });

  // This test is currently disabled due to a bug in yauzl which causes it to not propagate errors correctly, leading
  // to hangs. See https://github.com/thejoshwolfe/yauzl/pull/123 for a potential fix; the test will pass once yauzl
  // merges that PR.
  /*
  it('FailsToUnpackMalformed', async () => {
    // wrong-entry-sizes.zip is an example input from yauzl:
    // https://github.com/thejoshwolfe/yauzl/blob/96f0eb552c560632a754ae0e1701a7edacbda389/test/wrong-entry-sizes/wrong-entry-sizes.zip
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'wrong-entry-sizes.zip');
    const targetUri = local.tempFolderUri.join('wrong-entry-sizes');
    await rejects(unpacker.unpack(zipUri, targetUri, {}));
  });
  */

  it('Strips1', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-strip-1');
    await unpacker.unpack(zipUri, targetUri, { strip: 1 });
    strict.equal((await targetUri.readFile('a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('only-directory.txt')).toString(),
      'This content is only in the directory.\n');
    strict.equal((await targetUri.readFile('inner/only-directory-directory.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });

  it('Strips2', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-strip-2');
    await unpacker.unpack(zipUri, targetUri, { strip: 2 });
    strict.equal((await targetUri.readFile('only-directory-directory.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });

  it('StripsAll', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-strip-all');
    await unpacker.unpack(zipUri, targetUri, { strip: 3 });
    strict.ok(!await targetUri.exists());
    progressChecker.test(11);
  });

  it('TransformsOne', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-transform-one');
    await unpacker.unpack(zipUri, targetUri, { transform: ['s/a\\.txt/ehh.txt/'] });
    strict.equal((await targetUri.readFile('ehh.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('only-not-directory.txt')).toString(),
      'This content is only not in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/ehh.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/only-directory.txt')).toString(),
      'This content is only in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/inner/only-directory-directory.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });

  it('TransformsArray', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-transform-array');
    await unpacker.unpack(zipUri, targetUri, {
      transform: [
        's/a\\.txt/ehh.txt/',
        's/c\\.txt/see.txt/',
        's/see\\.txt/seeee.txt/',
        's/directory//g',
      ]
    });
    strict.equal((await targetUri.readFile('ehh.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('seeee.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('only-not-.txt')).toString(),
      'This content is only not in the directory.\n');
    strict.equal((await targetUri.readFile('a-/ehh.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('a-/b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('a-/seeee.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('a-/only-.txt')).toString(),
      'This content is only in the directory.\n');
    strict.equal((await targetUri.readFile('a-/inner/only--.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });

  it('StripsThenTransforms', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-strip-then-transform');
    await unpacker.unpack(zipUri, targetUri, { strip: 1, transform: ['s/b/beeee/'] });
    strict.equal((await targetUri.readFile('a.txt')).toString(), 'The contents of a.txt.\n');
    strict.equal((await targetUri.readFile('beeee.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('only-directory.txt')).toString(),
      'This content is only in the directory.\n');
    strict.equal((await targetUri.readFile('inner/only-directory-directory.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });

  it('AllowsTransformToNotExtract', async () => {
    progressChecker.reset();
    const zipUri = local.rootFolderUri.join('resources', 'example-zip.zip');
    const targetUri = local.tempFolderUri.join('example-transform-no-extract');
    await unpacker.unpack(zipUri, targetUri, { transform: ['s/.+a.txt$//'] });
    strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('only-not-directory.txt')).toString(),
      'This content is only not in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/b.txt')).toString(), 'The contents of b.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/c.txt')).toString(), 'The contents of c.txt.\n');
    strict.equal((await targetUri.readFile('a-directory/only-directory.txt')).toString(),
      'This content is only in the directory.\n');
    strict.equal((await targetUri.readFile('a-directory/inner/only-directory-directory.txt')).toString(),
      'This content is only doubly nested.\n');
    progressChecker.test(11);
  });
});

async function checkExtractedTar(targetUri: Uri): Promise<void> {
  strict.equal((await targetUri.readFile('a.txt')).toString(), 'The contents of a.txt.\n');
  strict.equal((await targetUri.stat('a.txt')).mtime, Date.parse('2021-03-23T09:31:14.000Z'));
  strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
  strict.equal((await targetUri.readFile('executable.sh')).toString(), '#/bin/sh\necho "Hello world!"\n\n');
  if (!isWindows) {
    // executable must be executable
    const execStat = await targetUri.stat('executable.sh');
    strict.ok((execStat.mode & 0o111) !== 0);
  }
  strict.equal((await targetUri.readFile('only-not-directory.txt')).toString(),
    'This content is only not in the directory.\n');
  strict.equal((await targetUri.readFile('a-directory/a.txt')).toString(), 'The contents of a.txt.\n');
  strict.equal((await targetUri.readFile('a-directory/b.txt')).toString(), 'The contents of b.txt.\n');
  strict.equal((await targetUri.readFile('a-directory/only-directory.txt')).toString(),
    'This content is only in the directory.\n');
  strict.equal((await targetUri.readFile('a-directory/inner/only-directory-directory.txt')).toString(),
    'This content is only doubly nested.\n');
}

const transformedTarUnpackOptions = {
  strip: 1,
  transform: ['s/a\\.txt/ehh\\.txt/']
};

async function checkExtractedTransformedTar(targetUri: Uri): Promise<void> {
  strict.equal((await targetUri.readFile('ehh.txt')).toString(), 'The contents of a.txt.\n');
  strict.equal((await targetUri.readFile('b.txt')).toString(), 'The contents of b.txt.\n');
  strict.equal((await targetUri.readFile('only-directory.txt')).toString(),
    'This content is only in the directory.\n');
  strict.equal((await targetUri.readFile('inner/only-directory-directory.txt')).toString(),
    'This content is only doubly nested.\n');
}

describe('TarUnpacker', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(local.after.bind(local));
  const unpacker = new TarUnpacker(local.session);
  const progressChecker = new ProgressChecker();
  unpacker.on('progress', progressChecker.onProgress.bind(progressChecker));
  unpacker.on('unpacked', progressChecker.onUnpacked.bind(progressChecker));
  const archiveUri = local.rootFolderUri.join('resources', 'example-tar.tar');
  it('UnpacksLegitimateSmallTar', async () => {
    progressChecker.reset();
    const targetUri = local.tempFolderUri.join('example-tar');
    await unpacker.unpack(archiveUri, targetUri, {});
    await checkExtractedTar(targetUri);
    progressChecker.test(8);
  });
  it('ImplementsUnpackOptions', async () => {
    progressChecker.reset();
    const targetUri = local.tempFolderUri.join('example-tar-transformed');
    await unpacker.unpack(archiveUri, targetUri, transformedTarUnpackOptions);
    await checkExtractedTransformedTar(targetUri);
    progressChecker.test(8);
  });
});

describe('TarBzUnpacker', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(local.after.bind(local));
  const unpacker = new TarBzUnpacker(local.session);
  const progressChecker = new ProgressChecker();
  unpacker.on('progress', progressChecker.onProgress.bind(progressChecker));
  unpacker.on('unpacked', progressChecker.onUnpacked.bind(progressChecker));
  const archiveUri = local.rootFolderUri.join('resources', 'example-tar.tar.bz2');
  it('UnpacksLegitimateSmallTarBz', async () => {
    progressChecker.reset();
    const targetUri = local.tempFolderUri.join('example-tar-bz');
    await unpacker.unpack(archiveUri, targetUri, {});
    await checkExtractedTar(targetUri);
    progressChecker.test(8);
  });
  it('ImplementsUnpackOptions', async () => {
    progressChecker.reset();
    const targetUri = local.tempFolderUri.join('example-tar-bz2-transformed');
    await unpacker.unpack(archiveUri, targetUri, transformedTarUnpackOptions);
    await checkExtractedTransformedTar(targetUri);
    progressChecker.test(8);
  });
});

describe('TarGzUnpacker', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(local.after.bind(local));
  const unpacker = new TarGzUnpacker(local.session);
  const progressChecker = new ProgressChecker();
  unpacker.on('progress', progressChecker.onProgress.bind(progressChecker));
  unpacker.on('unpacked', progressChecker.onUnpacked.bind(progressChecker));
  const archiveUri = local.rootFolderUri.join('resources', 'example-tar.tar.gz');
  it('UnpacksLegitimateSmallTarGz', async () => {
    progressChecker.reset();
    const targetUri = local.tempFolderUri.join('example-tar-gz');
    await unpacker.unpack(archiveUri, targetUri, {});
    await checkExtractedTar(targetUri);
    progressChecker.test(8);
  });
  it('ImplementsUnpackOptions', async () => {
    progressChecker.reset();
    const targetUri = local.tempFolderUri.join('example-tar-gz-transformed');
    await unpacker.unpack(archiveUri, targetUri, transformedTarUnpackOptions);
    await checkExtractedTransformedTar(targetUri);
    progressChecker.test(8);
  });
});
