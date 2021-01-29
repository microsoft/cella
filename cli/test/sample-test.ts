import { Version as CoreVersion } from '@microsoft/twisp.core';
import { suite, test } from '@testdeck/mocha';
import { strictEqual } from 'assert';
import { Version } from '../exports';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

@suite class BasicTests {
  @test 'Ensure that the core version is greaterthan or equal to the cli version'() {
    strictEqual(Version <= CoreVersion, true, `Core version (${CoreVersion}) should be greater than or equal to version (${Version})`);
  }
}