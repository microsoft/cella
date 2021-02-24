import { length, linq } from '@microsoft/cella.core';
import { suite, test } from '@testdeck/mocha';
import * as assert from 'assert';

@suite class LinqTests {

  private anArray = ['A', 'B', 'C', 'D', 'E'];

  @test async 'distinct'() {

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
  }

  @test async 'iterating thru collections'() {
    // items are items.
    assert.strictEqual([...linq.values(this.anArray)].join(','), this.anArray.join(','));
    assert.strictEqual(linq.values(this.anArray).count(), 5);
  }
}

