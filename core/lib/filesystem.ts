/**
 * a filesystem abstraction interface
 */
export interface FileSystem {
  cwd: string;

  readFile(pathOrRelativePath: string): Promise<string>;

  writeFile(relativePath: string, data: string): Promise<void>;
  isDirectory(relativePath: string): Promise<boolean>;
  isFile(relativePath: string): Promise<boolean>;

  readDirectory(relativePath: string): Promise<Array<string>>;
}