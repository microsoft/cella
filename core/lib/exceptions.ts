import { Uri } from './uri';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Failed extends Error {
  fatal = true;
}

export class RemoteFileUnavailable extends Error {
  constructor(public uri: Array<Uri>) {
    super();
  }
}

export class TargetFileCollision extends Error {
  constructor(public uri: Uri, message: string) {
    super(message);
  }
}

