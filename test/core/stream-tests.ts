/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Channels, LocalFileSystem, Session, Uri } from '@microsoft/cella.core';
import { suite, test } from '@testdeck/mocha';
import { strictEqual } from 'assert';
import { rmSync } from 'fs';
import { join } from 'path';
import { uniqueTempFolder } from './uniqueTempFolder';

@suite class StreamTests {

  static tempFolder: string;
  static tempFolderUrl: Uri;
  static fs: LocalFileSystem;
  static session: Session;

  static before() {
    this.tempFolder = uniqueTempFolder();
    this.session = new Session(StreamTests.tempFolder, {
      cella_home: join(StreamTests.tempFolder, 'cella_home')
    });

    this.fs = new LocalFileSystem(this.session);
    this.tempFolderUrl = this.fs.file(StreamTests.tempFolder);
  }

  @test 'event emitter works'() {
    const expected = ['a', 'b', 'c', 'd'];
    let i = 0;

    const session = StreamTests.session;
    const m = new Channels(session);
    m.on('message', (message, context, msec) => {
      // check that each message comes in order
      strictEqual(message, expected[i], 'messages should be in order');
      i++;
    });

    for (const each of expected) {
      m.message(each);
    }

    strictEqual(expected.length, i, 'should have got the right number of messages');
  }

  public static after() {
    // drop the whole temp folder
    rmSync(StreamTests.tempFolder, { recursive: true });
  }
}
