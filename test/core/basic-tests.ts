import { suite, test } from '@testdeck/mocha';
import { createReadStream, ReadStream } from 'fs';

type StreamBuffer = AsyncIterable<Buffer> & ReadStream;

// sample test using decorators.
@suite class ScratchTesting {
  @test async 'streamreading'() {

    const rs = createReadStream(__filename, { highWaterMark: 8 });

    // ReadStream is iterable, but it doesn't know that it's an iterable of Buffer
    // so I cast it to an AsyncIterable<Buffer>
    for await (const chunk of <StreamBuffer>rs) {
      // console.log(chunk.toString());
    }


  }
}
