/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Channels, Stopwatch } from './channels';
import { FileSystem } from './filesystem';
import { UnifiedFileSystem } from './unified-filesystem';

/**
 * The Session class is used to hold a reference to the
 * message channels,
 * the filesystems,
 * and any other 'global' data that should be kept.
 *
 */
export class Session {
  /** @internal */
  readonly stopwatch = new Stopwatch();
  readonly fileSystem: FileSystem;
  readonly channels: Channels;

  constructor(protected currentDirectory: string, protected environment: { [key: string]: string | undefined; }) {
    this.fileSystem = new UnifiedFileSystem(this);
    this.channels = new Channels(this);

    this.setupLogging();

    // load global configuration

  }

  setupLogging() {
    // at this point, we can subscribe to the events in the export * from './lib/version';FileSystem and Channels
    // and do what we need to do (record, store, etc.)
    //
    // (We'll defer actually this until we get to #23: Create Bug Report)
    //
    // this.FileSystem.on('deleted', (uri) => { console.log(uri) })
  }
}