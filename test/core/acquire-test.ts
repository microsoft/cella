/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { http } from '@microsoft/cella.core';
import { strict } from 'assert';
import { SuiteLocal } from './SuiteLocal';

describe('Acquire', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(async () => local.after());

  it('try some downloads', async () => {

    const remoteFile = local.session.fileSystem.parse('https://raw.githubusercontent.com/microsoft/vscode/main/README.md');


    let acq = http(local.session, [remoteFile], 'readme.md');

    // let's make sure we get some progress back
    let pcount = 0;
    acq.on('progress', (p, b, m) => {
      pcount++;
    });

    const outputFile = await acq;

    strict.ok(pcount > 1, 'We should get at least two progress events');
    strict.ok(await outputFile.exists(), 'File should exist!');
    const size = await outputFile.size();


    // let's try some resume scenarios

    // chopped file, very small.
    // let's chop the file in half
    const fullFile = await outputFile.readFile();
    const halfFile = fullFile.slice(0, fullFile.length / 2);

    await outputFile.delete();
    await outputFile.writeFile(halfFile);

    acq = http(local.session, [remoteFile], 'readme.md');
    pcount = 0;
    acq.on('progress', (p, b, m) => {
      pcount++;
    });
    await acq;
    const newsize = await outputFile.size();
    strict.equal(newsize, size, 'the file should be the right size at the end.');

  });


  it('larger file', async () => {
    const remoteFile = local.session.fileSystem.parse('https://user-images.githubusercontent.com/1487073/58344409-70473b80-7e0a-11e9-8570-b2efc6f8fa44.png');


    let acq = http(local.session, [remoteFile], 'xyz.png');


    const outputFile = await acq;

    const fullSize = await outputFile.size();

    strict.ok(await outputFile.exists(), 'File should exist!');
    strict.ok(fullSize > 1 << 16, 'Should be at least 64k');

    const size = await outputFile.size();

    // chopped file, big.
    // let's chop the file in half
    const fullFile = await outputFile.readFile();
    const halfFile = fullFile.slice(0, fullFile.length / 2);

    await outputFile.delete();
    await outputFile.writeFile(halfFile);


    acq = http(local.session, [remoteFile], 'xyz.png');
    let pcount = 0;
    acq.on('progress', (p, b, m) => {
      pcount++;
    });
    await acq;
    const newsize = await outputFile.size();
    strict.equal(newsize, size, 'the file should be the right size at the end.');

    const newfull = <Buffer>(await outputFile.readFile());
    strict.equal(newfull.compare(fullFile), 0, 'files should be identical');
  });
});