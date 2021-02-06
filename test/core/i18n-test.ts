import { i } from '@microsoft/twisp.core';
import { suite, test } from '@testdeck/mocha';
import { strict } from 'assert';

// sample test using decorators.
@suite class i18n {
  @test 'make sure tagged templates work like templates'() {
    strict.equal(`this is ${100} a test `, i`this is ${100} a test `, 'strings should be the same');
    strict.equal(`${true}${false}this is ${100} a test ${undefined}`, i`${true}${false}this is ${100} a test ${undefined}`, 'strings should be the same');

  }
}

