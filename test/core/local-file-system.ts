/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileType, hash } from '@microsoft/cella.core';
import { strict } from 'assert';
import { join } from 'path';
import { rootFolder, SuiteLocal } from './SuiteLocal';

describe('LocalFileSystemTests', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(async () => local.after());

  it('create/delete folder', async () => {

    const tmp = local.tempFolderUrl;

    // create a path to a folder
    const someFolder = tmp.join('someFolder');

    // create the directory
    await fs.createDirectory(someFolder);

    // is there a directory there?
    strict.ok(await fs.isDirectory(someFolder), `the directory ${someFolder.fsPath} should exist`);

    // delete it
    await fs.delete(someFolder, { recursive: true });

    // make sure it's gone!
    strict.ok(!(await fs.isDirectory(someFolder)), `the directory ${someFolder.fsPath} should not exist`);

  });

  it('create/read file', async () => {
    const tmp = local.tempFolderUrl;

    const file = tmp.join('hello.txt');
    const expectedText = 'hello world';
    const expectedBuffer = Buffer.from(expectedText, 'utf8');

    await fs.writeFile(file, expectedBuffer);

    // is there a file there?
    strict.ok(await fs.isFile(file), `the file ${file.fsPath} is not present.`);

    // read it back
    const actualBuffer = await fs.readFile(file);
    strict.deepEqual(expectedBuffer, actualBuffer, 'contents should be the same');
    const actualText = actualBuffer.toString();
    strict.equal(expectedText, actualText, 'text should be equal too.');

  });

  it('readDirectory', async () => {
    const tmp = local.tempFolderUrl;
    const thisFolder = fs.file(__dirname);

    // look in the current folder
    const files = await fs.readDirectory(thisFolder);

    // find this file
    const found = files.find(each => each[0].fsPath.indexOf('local-file-system') > -1);

    // should be a file, right?
    strict.ok(found?.[1] && FileType.File, `${__filename} should be a path`);

  });

  it('read/write stream', async () => {
    const tmp = local.tempFolderUrl;

    const thisFile = fs.file(__filename);
    const outputFile = tmp.join('output.txt');

    const outStream = await fs.writeStream(outputFile);

    let text = '';
    // you can iterate thru a stream with 'for await' without casting because I forced the return type to be AsnycIterable<Buffer>
    for await (const chunk of await fs.readStream(thisFile)) {
      text += chunk.toString('utf8');
      await outStream.writeAsync(chunk);
    }
    // close the stream once we're done.
    outStream.end();

    await outStream.is.done;

    strict.equal((await fs.stat(outputFile)).size, (await fs.stat(thisFile)).size, 'outputFile should be the same length as the input file');
    strict.equal((await fs.stat(thisFile)).size, text.length, 'buffer should be the same size as the input file');
  });

  it('calculate hashes', async () => {
    const tmp = local.tempFolderUrl;
    const path = fs.file(join(rootFolder(), 'resources', 'small-file.txt'));

    strict.equal(await hash(fs.readStream(path)), '9cfed8b9e45f47e735098c399fb523755e4e993ac64d81171c93efbb523a57e6', 'hash should match');
    strict.equal(await hash(fs.readStream(path), 'sha384'), '8168d029154548a4e1dd5212b722b03d6220f212f8974f6bd45e71715b13945e343c9d1097f8e393db22c8a07d8cf6f6', 'hash should match');
    strict.equal(await hash(fs.readStream(path), 'sha512'), '1bacd5dd190731b5c3d2a2ad61142b4054137d6adff5fb085543dcdede77e4a1446225ca31b2f4699b0cda4534e91ea372cf8d73816df3577e38700c299eab5e', 'hash should match');
    strict.equal(await hash(fs.readStream(path), 'md5'), 'c82b854702262508e9210c678282d5a4', 'hash should match');

  });

  it('reads blocks via open', async () => {
    const file = fs.file(join(rootFolder(), 'resources', 'small-file.txt'));
    const handle = await file.openFile();
    let bytesRead = 0;
    for await (const chunk of handle.readStream(0, 3)) {
      bytesRead += chunk.length;
      strict.equal(chunk.length, 4, 'chunk should be 4 bytes long');
      strict.equal(chunk.toString('utf-8'), 'this', 'chunk should be a word');
    }
    strict.equal(bytesRead, 4, 'Stream should read some bytes');

    bytesRead = 0;
    // should be able to read that same chunk again.
    for await (const chunk of handle.readStream(0, 3)) {
      bytesRead += chunk.length;
      strict.equal(chunk.length, 4, 'chunk should be 4 bytes long');
      strict.equal(chunk.toString('utf-8'), 'this', 'chunk should be a word');
    }
    strict.equal(bytesRead, 4, 'Stream should read some bytes');

    bytesRead = 0;
    for await (const chunk of handle.readStream()) {
      bytesRead += chunk.length;
      strict.equal(chunk.byteLength, 23, 'chunk should be 23 bytes long');
      strict.equal(chunk.toString('utf-8'), 'this is a small file.\n\n', 'File contents should equal known result');
    }
    strict.equal(bytesRead, 23, 'Stream should read some bytes');

    await handle.close();


  });
  it('reads blocks via open in a large file', async () => {
    const file = fs.file(join(rootFolder(), 'resources', 'large-file.txt'));
    const handle = await file.openFile();
    let bytesRead = 0;
    for await (const chunk of handle.readStream()) {
      if (bytesRead === 0) {
        strict.equal(chunk.length, 32768, 'first chunk should be 32768 bytes long');
      }
      else {
        strict.equal(chunk.length, 4134, 'second chunk should be 4134 bytes long');
      }
      bytesRead += chunk.length;
    }
    strict.equal(bytesRead, 36902, 'Stream should read some bytes');

    await handle.close();
  });

  it('read/write stream with pipe ', async () => {
    const tmp = local.tempFolderUrl;

    const thisFile = fs.file(__filename);
    const outputFile = tmp.join('output2.txt');

    const inputStream = await fs.readStream(thisFile);

    let pcount = 0;
    inputStream.on('progress', (p, t, m) => {
      pcount++;
    });


    const outStream = await fs.writeStream(outputFile);
    inputStream.pipe(outStream);


    // we can wait for the stream to finish, which will end the pipe.
    // if the pipe fails, this should throw
    await inputStream.is.done;

    // should always wait until the output stream is done too.
    // (this will ensure that the stream is destroyed. )
    await outStream.is.done;

    strict.ok(pcount > 1, 'We should get at least two progress events');
    strict.ok(fs.isFile(outputFile), `there should be a file at ${outputFile.fsPath}`);

    // this will throw if it fails.
    await fs.delete(outputFile);

    // make sure it's gone!
    strict.ok(!(await fs.isFile(outputFile)), `the file ${outputFile.fsPath} should not exist`);
  });

  it('copy ', async () => {
    // tbw
  });
});
