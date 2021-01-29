import { suite, test } from '@testdeck/mocha';
import { notStrictEqual } from 'assert';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

@suite class SomeTests {
  @test 'Try This Sample Test'() {
    notStrictEqual(5, 4, 'numbers should not be equal');
  }
}