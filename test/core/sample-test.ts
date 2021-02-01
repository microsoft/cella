import { suite, test } from '@testdeck/mocha';
import { notStrictEqual } from 'assert';
import { describe, it } from 'mocha';

// sample test using decorators.
@suite class SomeTests {
  @test 'Try This Sample Test'() {
    notStrictEqual(5, 4, 'numbers should not be equal');
  }
}


// sample test that uses describe/it
describe('something', () => {
  it('does', () => {
    console.log('hi');
  });
});
