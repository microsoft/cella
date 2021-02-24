import { FileType, LocalFileSystem, Session, Uri } from '@microsoft/cella.core';
import { skip, suite, test } from '@testdeck/mocha';
import { strict } from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

function uniqueTempFolder(): string {
  return mkdtempSync(`${tmpdir()}/cella-temp$`);
}

@suite class LocalFileSystemTests {
  static tempFolder: string;
  static tempFolderUrl: Uri;
  static fs: LocalFileSystem;

  static before() {
    const session = new Session();
    this.tempFolder = uniqueTempFolder();
    this.fs = new LocalFileSystem(session);
    this.tempFolderUrl = this.fs.file(LocalFileSystemTests.tempFolder);
  }


  before() {
    //
  }

  @test async 'create/delete folder'() {
    const fs = LocalFileSystemTests.fs;
    const tmp = LocalFileSystemTests.tempFolderUrl;

    // create a path to a folder
    const someFolder = tmp.join('someFolder');

    // create the directory
    await fs.createDirectory(someFolder);

    // is there a directory there?
    strict.ok(await fs.isDirectory(someFolder), `the directory ${someFolder.fsPath} should exist`);

    // delete it
    await fs.delete(someFolder, { recursive: true });

    // make sure it's gone!
    strict.ok(!(await fs.isDirectory(someFolder)), `the directory ${someFolder.fsPath} should not exist`);
  }

  @test async 'create/read file'() {
    const fs = LocalFileSystemTests.fs;
    const tmp = LocalFileSystemTests.tempFolderUrl;

    const file = tmp.join('hello.txt');
    const expectedText = 'hello world';
    const expectedBuffer = Buffer.from(expectedText, 'utf8');

    await fs.writeFile(file, expectedBuffer);

    // is there a file there?
    strict.ok(await fs.isFile(file), `the file ${file.fsPath} is not present.`);

    // read it back
    const actualBuffer = await fs.readFile(file);
    strict.deepEqual(expectedBuffer, actualBuffer, 'contents should be the same');
    const actualText = actualBuffer.toString();
    strict.equal(expectedText, actualText, 'text should be equal too.');
  }

  @test async 'readDirectory'() {
    const fs = LocalFileSystemTests.fs;
    const tmp = LocalFileSystemTests.tempFolderUrl;
    const thisFolder = fs.file(__dirname);

    // look in the current folder
    const files = await fs.readDirectory(thisFolder);

    // find this file
    const found = files.find(each => each[0].fsPath === __filename);

    // should be a file, right?
    strict.ok(found?.[1] && FileType.File, `${__filename} should be a path`);
  }

  @test async 'read/write stream'() {
    const fs = LocalFileSystemTests.fs;
    const tmp = LocalFileSystemTests.tempFolderUrl;

    const thisFile = fs.file(__filename);
    const outputFile = tmp.join('output.txt');

    const outStream = await fs.writeStream(outputFile);

    let text = '';
    // you can iterate thru a stream with 'for await' without casting because I forced the return type to be AsnycIterable<Buffer>
    for await (const chunk of await fs.readStream(thisFile)) {
      text += chunk.toString('utf8');
      await outStream.writeTo(chunk);
    }

    outStream.end();
    await outStream.is.closed;

    strict.equal((await fs.stat(outputFile)).size, (await fs.stat(thisFile)).size, 'outputFile should be the same length as the input file');
    strict.equal((await fs.stat(thisFile)).size, text.length, 'buffer should be the same size as the input file');
  }

  @test async 'read/write stream with pipe '() {
    const fs = LocalFileSystemTests.fs;
    const tmp = LocalFileSystemTests.tempFolderUrl;

    const thisFile = fs.file(__filename);
    const outputFile = tmp.join('output2.txt');

    const inputStream = await fs.readStream(thisFile);
    const outStream = await fs.writeStream(outputFile);
    inputStream.pipe(outStream);

    // we can wait for the stream to finish, which will end the pipe.
    // if the pipe fails, this should throw
    await inputStream.is.ended;

    strict.ok(fs.isFile(outputFile), `there should be a file at ${outputFile.fsPath}`);

    // this will throw if it fails.
    await fs.delete(outputFile);

    // make sure it's gone!
    strict.ok(!(await fs.isFile(outputFile)), `the file ${outputFile.fsPath} should not exist`);
  }
  @test @skip async 'copy '() {
    // tbw
  }

  public after() {
    //
  }

  public static after() {
    // drop the whole temp folder
    rmSync(LocalFileSystemTests.tempFolder, { recursive: true });
  }
}

