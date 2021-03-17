/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { length, linq } from '@microsoft/cella.core';
import * as assert from 'assert';

const anArray = ['A', 'B', 'C', 'D', 'E'];

describe('LinqTests', () => {


  it('distinct', async () => {

    const items = ['one', 'two', 'two', 'three'];
    const distinct = linq.values(items).distinct().toArray();
    assert.strictEqual(length(distinct), 3);

    const dic = {
      happy: 'hello',
      sad: 'hello',
      more: 'name',
      maybe: 'foo',
    };

    const result = linq.values(dic).distinct().toArray();
    assert.strictEqual(length(distinct), 3);
  });

  it('iterating thru collections', async () => {
    // items are items.
    assert.strictEqual([...linq.values(anArray)].join(','), anArray.join(','));
    assert.strictEqual(linq.values(anArray).count(), 5);
  });
});

