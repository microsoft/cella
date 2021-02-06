import { strict } from 'assert';
import { FileStat, FileSystem, FileType } from './filesystem';
import { i } from './i18n';
import { Dictionary } from './linq';
import { EnhancedReadable, EnhancedWritable } from './streams';
import { Uri } from './uri';

/**
 * gets the scheme off the front of an uri.
 * @param uri the uri to get the scheme for.
 * @returns the scheme, undefined if the uri has no scheme (colon)
 */
function schemeOf(uri: string) {
  strict.ok(uri, i`Uri may not be empty`);
  return /^(\w*):/.exec(uri)?.[1];
}

export class UnifiedFileSystem extends FileSystem {
  private filesystems: Dictionary<FileSystem> = {};

  /** registers a scheme to a given filesystem
   *
   * @param scheme the Uri scheme to reserve
   * @param fileSystem the filesystem to associate with the scheme
   */
  register(scheme: string, fileSystem: FileSystem) {
    strict.ok(!this.filesystems[scheme], i`scheme '${scheme}' already registered.`);
    this.filesystems[scheme] = fileSystem;
  }

  /**
   * gets the filesystem for the given uri.
   *
   * @param uri the uri to check the filesystem for
   *
   * @returns the filesystem. Will throw if no filesystem is valid.
   */
  protected filesystem(uri: string) {
    const scheme = schemeOf(uri.toString());
    strict.ok(scheme, i`uri ${uri} has no scheme`);

    const filesystem = this.filesystems[scheme];
    strict.ok(filesystem, i`scheme ${scheme} has no filesystem associated with it`);

    return filesystem;
  }
  /**
  * Creates a new URI from a string, e.g. `http://www.msft.com/some/path`,
  * `file:///usr/home`, or `scheme:with/path`.
  *
  * @param uri A string which represents an URI (see `URI#toString`).
  */
  parse(uri: string, _strict?: boolean): Uri {
    return this.filesystem(uri).parse(uri);
  }

  stat(uri: Uri): Promise<FileStat> {
    return uri.fileSystem.stat(uri);
  }

  async readDirectory(uri: Uri): Promise<Array<[Uri, FileType]>> {
    return uri.fileSystem.readDirectory(uri);
  }

  createDirectory(uri: Uri): Promise<void> {
    return uri.fileSystem.createDirectory(uri);
  }

  readFile(uri: Uri): Promise<Uint8Array> {
    return uri.fileSystem.readFile(uri);
  }

  writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    return uri.fileSystem.writeFile(uri, content);
  }

  readStream(uri: Uri): Promise<AsyncIterable<Buffer> & EnhancedReadable> {
    return uri.fileSystem.readStream(uri);
  }

  writeStream(uri: Uri): Promise<EnhancedWritable> {
    return uri.fileSystem.writeStream(uri);
  }

  delete(uri: Uri, options?: { recursive?: boolean | undefined; useTrash?: boolean | undefined; }): Promise<void> {
    return uri.fileSystem.delete(uri, options);
  }

  rename(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    strict.ok(source.fileSystem === target.fileSystem, i`may not rename across filesystems`);
    return source.fileSystem.rename(source, target, options);
  }

  copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    return target.fileSystem.copy(source, target);
  }
}
