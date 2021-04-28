/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ZipFile } from '@microsoft/cella.core';
import { Queue } from '@microsoft/cella.core/dist/lib/promise';
import { notStrictEqual } from 'assert';
import { describe, it } from 'mocha';
import { pipeline as origPipeline } from 'stream';
import { promisify } from 'util';
import { SuiteLocal } from './SuiteLocal';

const pipeline = promisify(origPipeline);

// sample test using decorators.
describe('SomeTests', () => {
  it('Try This Sample Test', () => {
    notStrictEqual(5, 4, 'numbers should not be equal');
  });
});

// sample test that uses describe/it
describe('sample test', () => {
  it('does not make mistakes', () => {
    notStrictEqual('A', 'B', 'letters should not be equal');
  });
});

describe('new unzipper?', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(local.after.bind(local));

  it('might work', async () => {
    const zipUri = local.session.fileSystem.file('c:/users/garre/.cella/cache/tools.kitware.cmake-3.20.1.zip');
    const targetUri = local.fs.file('c:/tmp/cmake-unpack');
    const zipFile = await ZipFile.read(await zipUri.openFile());

    const q = new Queue();
    for (const [name, entry] of zipFile.files.entries()) {
      void q.enqueue(async () => {
        const file = targetUri.join(name);
        await file.parent().createDirectory();
        await pipeline(await entry.read(), await file.writeStream());
      });
    }
    await q.done;

  });
});