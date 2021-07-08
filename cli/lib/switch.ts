// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/vcpkg-ce.core';
import { strict } from 'assert';
import { Command } from './command';
import { Help } from './command-line';
import { cmdSwitch } from './format';

export abstract class Switch implements Help {
  readonly abstract switch: string;
  readonly title = '';
  readonly abstract help: Array<string>;

  constructor(protected command: Command) {
    command.switches.push(this);
  }

  #values?: Array<string>;
  get values() {
    return this.#values || (this.#values = this.command.commandLine.claim(this.switch) || []);
  }

  get value(): any | undefined {
    const v = this.values;
    strict.ok(v.length < 2, i`Expected a single value for ${cmdSwitch(this.switch)} - found multiple`);
    return v[0];
  }

  get active(): boolean {
    const v = this.values;
    return !!v && v.length > 0 && v[0] !== 'false';
  }
}
