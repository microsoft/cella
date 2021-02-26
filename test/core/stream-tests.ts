/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Channels, Session } from '@microsoft/cella.core';
import { suite, test } from '@testdeck/mocha';
import { strictEqual } from 'assert';

@suite class StreamTests {
  @test 'event emitter works'() {
    const expected = ['a', 'b', 'c', 'd'];
    let i = 0;

    const session = new Session('', {});
    const m = new Channels(session);
    m.on('message', (message, context, msec) => {
      // check that each message comes in order
      strictEqual(message, expected[i], 'messages should be in order');
      i++;
    });

    for (const each of expected) {
      m.message(each);
    }

    strictEqual(expected.length, i, 'should have got the right number of messages');
  }
}
