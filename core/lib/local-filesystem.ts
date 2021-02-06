import { strict } from 'assert';
import { createReadStream, createWriteStream, Stats } from 'fs';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { FileStat, FileSystem, FileType } from './filesystem';
import { i } from './i18n';
import { EnhancedReadable, EnhancedWritable, enhanceReadable, enhanceWritable } from './streams';
import { Uri } from './uri';

function getFileType(stats: Stats) {
  return FileType.Unknown |
    (stats.isDirectory() ? FileType.Directory : 0) |
    (stats.isFile() ? FileType.File : 0) |
    (stats.isSymbolicLink() ? FileType.SymbolicLink : 0);
}

class LocalFileStats implements FileStat {
  constructor(private stats: Stats) {
    strict.ok(stats, i`stats may not be undefined`);
  }
  get type() {
    return getFileType(this.stats);
  }
  get ctime() {
    return this.stats.ctimeMs;
  }
  get mtime() {
    return this.stats.mtimeMs;
  }
  get size() {
    return this.stats.size;
  }
}


export class LocalFileSystem extends FileSystem {
  async stat(uri: Uri): Promise<FileStat> {
    const path = uri.fsPath;
    return new LocalFileStats(await stat(path));
  }

  async readDirectory(uri: Uri): Promise<Array<[Uri, FileType]>> {
    const folder = uri.fsPath;
    const results = (await readdir(folder)).map(async each => {
      const path = uri.fileSystem.file(join(folder, each));
      return <[Uri, FileType]>[uri.fileSystem.file(join(folder, each)), getFileType(await stat(path.fsPath))];
    });
    return Promise.all(results);
  }

  async createDirectory(uri: Uri): Promise<void> {
    await mkdir(uri.fsPath, { recursive: true });
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    return await readFile(uri.fsPath);
  }

  async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    await writeFile(uri.fsPath, content);
  }

  async delete(uri: Uri, options?: { recursive?: boolean | undefined; useTrash?: boolean | undefined; }): Promise<void> {
    options = options || { recursive: false };
    await rm(uri.fsPath, { recursive: options.recursive, force: true, maxRetries: 3 });
  }

  async rename(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    strict.equal(source.fileSystem, target.fileSystem, i`Cannot rename files across filesystems`);
    await rename(source.fsPath, target.fsPath);
  }

  async copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    // if (source.fileSystem === target.fileSystem) {
    //  options = options || {};
    //  return await copyFile(source.fsPath, target.fsPath, options.overwrite ? 0 : constants.COPYFILE_EXCL);
    // }

    throw new Error('cross filesystem copynot implemented yet.');
  }

  async readStream(uri: Uri): Promise<AsyncIterable<Buffer> & EnhancedReadable> {
    return enhanceReadable(createReadStream(uri.fsPath));
  }

  async writeStream(uri: Uri): Promise<EnhancedWritable> {
    return enhanceWritable(createWriteStream(uri.fsPath));
  }
}
