/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createReadStream, ReadStream } from 'fs';

type StreamBuffer = AsyncIterable<Buffer> & ReadStream;

// sample test using decorators.
describe('ScratchTesting', () => {
  it('streamreading', async () => {

    const rs = createReadStream(__filename, { highWaterMark: 8 });

    // ReadStream is iterable, but it doesn't know that it's an iterable of Buffer
    // so I cast it to an AsyncIterable<Buffer>
    for await (const chunk of <StreamBuffer>rs) {
      // console.log(chunk.toString());
    }
  });
});
