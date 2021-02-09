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

  constructor() {
    this.fileSystem = new UnifiedFileSystem(this);
    this.channels = new Channels(this);

    this.setupLogging();
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