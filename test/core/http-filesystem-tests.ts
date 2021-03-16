/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileType, HttpFileSystem, LocalFileSystem, Session, Uri } from '@microsoft/cella.core';
import { suite, test } from '@testdeck/mocha';
import { fail, strict } from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function uniqueTempFolder(): string {
  return mkdtempSync(`${tmpdir()}/cella-temp$`);
}

@suite class HttpFileSystemTests {
  static tempFolder: string;
  static tempFolderUrl: Uri;
  static fs: LocalFileSystem;

  static before() {
    this.tempFolder = uniqueTempFolder();
    const session = new Session(HttpFileSystemTests.tempFolder, {
      cella_home: join(HttpFileSystemTests.tempFolder, 'cella_home')
    });


    this.fs = new HttpFileSystem(session);
    this.tempFolderUrl = this.fs.file(HttpFileSystemTests.tempFolder);
  }

  @test async 'stat a file'() {
    const uri = HttpFileSystemTests.fs.parse('https://aka.ms/cella.version');
    const s = await HttpFileSystemTests.fs.stat(uri);
    strict.equal(s.type, FileType.File, 'Should be a file');
    strict.ok(s.size < 40, 'should be less than 40 bytes');
    strict.ok(s.size > 20, 'should be more than 20 bytes');
  }

  @test async 'stat a non existant file'() {
    try {
      const uri = HttpFileSystemTests.fs.parse('https://file.not.found/blabla');
      const s = await HttpFileSystemTests.fs.stat(uri);
    } catch {
      return;
    }
    fail('Should have thrown');
  }

  @test async 'read a stream'() {
    const fs = HttpFileSystemTests.fs;
    const uri = HttpFileSystemTests.fs.parse('https://aka.ms/cella.version');

    let text = '';

    for await (const chunk of await fs.readStream(uri)) {
      text += chunk.toString('utf8');
    }
    strict.ok(text.length > 5, 'should have some text');
    strict.ok(text.length < 20, 'shouldnt have too much text');
  }

  public static after() {
    // drop the whole temp folder
    rmSync(HttpFileSystemTests.tempFolder, { recursive: true });
  }
}