/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LocalFileSystem, Session, Uri } from '@microsoft/cella.core';
import { strict } from 'assert';
import { statSync } from 'fs';
import { rm } from 'fs/promises';
import { join, resolve } from 'path';
import { uniqueTempFolder } from './uniqueTempFolder';

export function rootFolder(from = __dirname): string {
  try {
    const resources = join(from, 'resources');
    const s = statSync(resources);
    s.isDirectory();
    return from;
  }
  catch {
    // shh!
  }
  const up = resolve(from, '..');
  strict.notEqual(up, from, 'O_o unable to find root folder');
  return rootFolder(up);
}

export class SuiteLocal {
  tempFolder: string;
  tempFolderUrl: Uri;
  session: Session;
  fs: LocalFileSystem;

  constructor() {
    this.tempFolder = uniqueTempFolder();
    this.session = new Session(this.tempFolder, {
      cella_home: join(this.tempFolder, 'cella_home'),
    });

    this.fs = new LocalFileSystem(this.session);
    this.tempFolderUrl = this.fs.file(this.tempFolder);
    // you can uncomment this section to have the debug messages dumped during testing
    // this.session.channels.on('debug', (text, context, msec) => {
    //   console.log(`[${msec}msec] ${text}`);
    // });
  }

  async after() {
    await rm(this.tempFolder, { recursive: true });
  }
}
