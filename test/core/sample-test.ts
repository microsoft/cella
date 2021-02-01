import { suite, test } from '@testdeck/mocha';
import { notStrictEqual } from 'assert';
import { describe, it } from 'mocha';

@suite class SomeTests {
  @test 'Try This Sample Test'() {
    notStrictEqual(5, 4, 'numbers should not be equal');
  }
}


describe('something', () => {
  it('does', () => {
    console.log('hi');
  });
});
