import { FileStat, FileSystem, FileType } from './filesystem';
import { EnhancedReadable, EnhancedWritable } from './streams';
import { Uri } from './uri';


export class HttpFileSystem extends FileSystem {
  stat(uri: Uri): Promise<FileStat> {
    throw new Error('Method not implemented.');
  }
  readDirectory(uri: Uri): Promise<Array<[Uri, FileType]>> {
    throw new Error('Method not implemented.');
  }
  createDirectory(uri: Uri): Promise<void> {
    throw new Error('Method not implemented.');
  }
  readFile(uri: Uri): Promise<Uint8Array> {
    throw new Error('Method not implemented.');
  }
  writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.');
  }
  delete(uri: Uri, options?: { recursive?: boolean | undefined; useTrash?: boolean | undefined; }): Promise<void> {
    throw new Error('Method not implemented.');
  }
  rename(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    throw new Error('Method not implemented.');
  }
  copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; }): Promise<void> {
    throw new Error('Method not implemented.');
  }
  readStream(uri: Uri): Promise<AsyncIterable<Buffer> & EnhancedReadable> {
    throw new Error('Method not implemented.');
  }
  writeStream(uri: Uri): Promise<EnhancedWritable> {
    throw new Error('Method not implemented.');
  }
}
