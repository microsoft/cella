/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileType, hash } from '@microsoft/cella.core';
import { skip, suite, test } from '@testdeck/mocha';
import { strict } from 'assert';
import { join } from 'path';
import { SuiteLocal } from './SuiteLocal';

@suite class LocalFileSystemTests {


  @test async 'create/delete folder'() {
    const local = new SuiteLocal();
    const fs = local.fs;
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
    await local.after();
  }

  @test async 'create/read file'() {
    const local = new SuiteLocal();
    const fs = local.fs;
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
    await local.after();
  }

  @test async 'readDirectory'() {
    const local = new SuiteLocal();
    const fs = local.fs;
    const tmp = local.tempFolderUrl;
    const thisFolder = fs.file(__dirname);

    // look in the current folder
    const files = await fs.readDirectory(thisFolder);

    // find this file
    const found = files.find(each => each[0].fsPath.indexOf('local-file-system') > -1);

    // should be a file, right?
    strict.ok(found?.[1] && FileType.File, `${__filename} should be a path`);
    await local.after();
  }

  @test async 'read/write stream'() {
    const local = new SuiteLocal();
    const fs = local.fs;
    const tmp = local.tempFolderUrl;

    const thisFile = fs.file(__filename);
    const outputFile = tmp.join('output.txt');

    const outStream = await fs.writeStream(outputFile);

    let text = '';
    // you can iterate thru a stream with 'for await' without casting because I forced the return type to be AsnycIterable<Buffer>
    for await (const chunk of await fs.readStream(thisFile)) {
      text += chunk.toString('utf8');
      await outStream.writeTo(chunk);
    }

    outStream.end();
    await outStream.is.closed;

    strict.equal((await fs.stat(outputFile)).size, (await fs.stat(thisFile)).size, 'outputFile should be the same length as the input file');
    strict.equal((await fs.stat(thisFile)).size, text.length, 'buffer should be the same size as the input file');
    await local.after();
  }

  @test async 'calculate checksums'() {
    const local = new SuiteLocal();
    const fs = local.fs;
    const tmp = local.tempFolderUrl;
    const path = fs.file(join(__dirname, 'resources', 'small-file.txt'));

    strict.equal(await hash(fs.readStream(path)), '9cfed8b9e45f47e735098c399fb523755e4e993ac64d81171c93efbb523a57e6', 'Checksum should match');
    strict.equal(await hash(fs.readStream(path), 'sha384'), '8168d029154548a4e1dd5212b722b03d6220f212f8974f6bd45e71715b13945e343c9d1097f8e393db22c8a07d8cf6f6', 'Checksum should match');
    strict.equal(await hash(fs.readStream(path), 'sha512'), '1bacd5dd190731b5c3d2a2ad61142b4054137d6adff5fb085543dcdede77e4a1446225ca31b2f4699b0cda4534e91ea372cf8d73816df3577e38700c299eab5e', 'Checksum should match');
    strict.equal(await hash(fs.readStream(path), 'md5'), 'c82b854702262508e9210c678282d5a4', 'Checksum should match');

    await local.after();
  }

  @test async 'read/write stream with pipe '() {
    const local = new SuiteLocal();
    const fs = local.fs;
    const tmp = local.tempFolderUrl;

    const thisFile = fs.file(__filename);
    const outputFile = tmp.join('output2.txt');

    const inputStream = await fs.readStream(thisFile);
    const outStream = await fs.writeStream(outputFile);
    inputStream.pipe(outStream);

    // we can wait for the stream to finish, which will end the pipe.
    // if the pipe fails, this should throw
    await inputStream.is.ended;

    strict.ok(fs.isFile(outputFile), `there should be a file at ${outputFile.fsPath}`);

    // this will throw if it fails.
    await fs.delete(outputFile);

    // make sure it's gone!
    strict.ok(!(await fs.isFile(outputFile)), `the file ${outputFile.fsPath} should not exist`);

    await local.after();
    console.log('gone!');
  }
  @test @skip async 'copy '() {
    // tbw
  }
}
