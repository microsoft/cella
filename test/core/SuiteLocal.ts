/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LocalFileSystem, Session, Uri } from '@microsoft/cella.core';
import { rm } from 'fs/promises';
import { join } from 'path';
import { uniqueTempFolder } from './uniqueTempFolder';

export class SuiteLocal {
  tempFolder: string;
  tempFolderUrl: Uri;
  fs: LocalFileSystem;

  constructor() {
    this.tempFolder = uniqueTempFolder();
    const session = new Session(this.tempFolder, {
      cella_home: join(this.tempFolder, 'cella_home')
    });

    this.fs = new LocalFileSystem(session);
    this.tempFolderUrl = this.fs.file(this.tempFolder);
  }

  async after() {
    await rm(this.tempFolder, { recursive: true });
  }
}
