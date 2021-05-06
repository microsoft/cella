/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { strict } from 'assert';
import { Command } from './command';
import { Help } from './command-line';

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

  get value(): string | undefined {
    const v = this.values;
    strict.ok(v.length < 2, i`Expected a single value for '--${this.switch}' -- found multiple.`);
    return v[0];
  }

  get active(): boolean {
    const v = this.values;
    return !!v && v.length > 0 && v[0] !== 'false';
  }
}
