/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LocalFileSystem, Session } from '@microsoft/cella.core';
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
  readonly tempFolder = uniqueTempFolder();
  readonly session = new Session(this.tempFolder, {
    cella_home: join(this.tempFolder, 'cella_home'),
    context: <any>{
    }
  });
  readonly fs = new LocalFileSystem(this.session);
  readonly rootFolder : string = rootFolder();
  readonly resourcesFolder = this.rootFolder + '/resources';
  readonly rootFolderUri = this.fs.file(this.rootFolder);
  readonly tempFolderUri = this.fs.file(this.tempFolder);
  readonly resourcesFolderUri = this.fs.file(this.resourcesFolder);

  constructor() {
    // set the debug=1 in the environment to have the debug messages dumped during testing
    if (process.env['DEBUG'] || process.env['debug']) {
      this.session.channels.on('debug', (text, context, msec) => {
        console.log(`[${msec}msec] ${text}`);
      });
    }
  }

  async after() {
    await rm(this.tempFolder, { recursive: true });
  }
}
