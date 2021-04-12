/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Channels } from '@microsoft/cella.core';
import { strictEqual } from 'assert';
import { SuiteLocal } from './SuiteLocal';

describe('StreamTests', () => {
  const local = new SuiteLocal();
  const fs = local.fs;

  after(local.after.bind(local));
  it('event emitter works', async () => {

    const expected = ['a', 'b', 'c', 'd'];
    let i = 0;

    const session = local.session;
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
  });
});
