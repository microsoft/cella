/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Help } from './command-line';
import { Command } from './command';

export abstract class Switch implements Help {
  readonly abstract switch: string;
  readonly title = '';
  readonly abstract help: Array<string>;

  constructor(protected command: Command) {
    command.switches.push(this);
  }

  get active(): boolean {
    return !!this.command.commandLine.switches[this.switch];
  }
}