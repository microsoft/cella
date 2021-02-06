import { EventEmitter } from 'ee-ts';
import { Uri } from './uri';


interface FileEntry {
  path: string;
}

interface FolderEntry {
  path: string;
}

interface UnpackEvents {
  file(entry: FileEntry): void;
  folder(entry: FolderEntry): void;
  progress(entry: Readonly<FileEntry>, percentage: number): void;
  unpacked(entry: Readonly<FileEntry>): void;
  error(entry: Readonly<FileEntry>, message: string): void;
}

export interface OutputOptions {
  /**
   * Strip # directories from the path
   *
   * Typically used to remove excessive nested folders off the front of the paths in an archive.
  */
  strip?: number;

  /**
   * A regular expression to transform filenames during unpack.
   */
  transform?: string;
}

export abstract class Unpacker extends EventEmitter<UnpackEvents> {
  constructor(protected archivePath: Uri) {
    super();
  }

  /* Event Emitters */

  /** EventEmitter: file  */
  protected file(entry: FileEntry): FileEntry {
    this.emit('file', entry);
    return entry;
  }

  /** EventEmitter: folder  */
  protected folder(entry: FolderEntry): FolderEntry {
    this.emit('folder', entry);
    return entry;
  }

  /** EventEmitter: progress  */
  protected progress(entry: FileEntry, percentage: number): void {
    this.emit('progress', entry, percentage);
  }


  /** EventEmitter: unpacked  */
  protected unpacked(entry: FileEntry) {
    this.emit('unpacked', entry);
  }

  abstract unpack(outputPath: Uri, options: OutputOptions): Promise<void>;
}
