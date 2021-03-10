/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { i, intersect } from '@microsoft/cella.core';
import { tmpdir } from 'os';
import { join } from 'path';

export const cli = 'cella';

export type switches = {
  [key: string]: Array<string>;
}

function onlyOne(values: Array<string>, errorMessage: string) {
  switch (values?.length ?? 0) {
    case 0:
      return undefined;
    case 1:
      return values[0];
  }
  throw new Error(errorMessage);
}

export const blank = '\n';


export interface Help {
  readonly help: Array<string>;
  readonly title: string;
}

/** @internal */
export abstract class Command implements Help {
  readonly abstract command: string;
  readonly abstract argumentsHelp: Array<string>;


  readonly switches = new Array<Switch>();
  readonly arguments = new Array<Argument>();

  readonly abstract seeAlso: Array<Help>;

  abstract get summary(): string;
  abstract get description(): Array<string>;

  get synopsis(): Array<string> {
    return [
      i`## Synopsis`,
      ` \`${cli} ${this.command} ${this.arguments.map(each => `<${each.argument}>`).join(' ')}\` `,
    ];
  }

  get title() {
    return `${cli} ${this.command}`;
  }

  constructor(public commandLine: CommandLine) {
    commandLine.addCommand(this);
  }


  get help() {
    return [
      i`### \`${this.title}\``,
      this.summary,
      blank,
      ... this.synopsis,
      blank,
      i`## Description`,
      ... this.description,
      ... this.argumentsHelp,
      ... (this.switches.length ? [
        i`## Switches`,
        ...this.switches.flatMap(each => ` \`--${each.switch}\`: ${each.help.join(' ')}`)
      ] : []),
      ... (this.seeAlso.length ? [
        i`## See Also`,
        ...this.seeAlso.flatMap(each => each.title)
      ] : []),
    ];
  }

  async run() {
    // do something
    return true;
  }

}

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

export abstract class Argument implements Help {
  readonly abstract argument: string;
  readonly title = '';
  readonly abstract help: Array<string>;

  constructor(protected command: Command) {
    command.arguments.push(this);
  }


}

export class CommandLine {
  readonly commands = new Array<Command>();
  readonly inputs = new Array<string>();
  readonly switches: switches = {};

  switch(name: string, errorMessage: string) {
    return onlyOne(this.switches[name], errorMessage);
  }

  #home?: string;
  get home() {
    // home folder is determined by
    // command line (--cella-home, --cella_home)
    // environment (CELLA_HOME)
    // default 1 $HOME/.cella
    // default 2 <tmpdir>/.cella

    // note, this does not create the folder, that would happen when the session is initialized.

    return this.#home || (this.#home = this.switches['cella-home']?.[0] || this.switches['cella_home']?.[0] || process.env['CELLA_HOME'] || join(process.env['HOME'] || tmpdir(), '.cella'));
  }

  get force() {
    return !!this.switches['force'];
  }

  get debug() {
    return !!this.switches['debug'];
  }

  get lang() {
    return onlyOne(this.switches['language'], '--language specified multiple times!') || Intl.DateTimeFormat().resolvedOptions().locale;
  }

  #environment?: { [key: string]: string | undefined; };
  get environment(): { [key: string]: string | undefined; } {
    return this.#environment || (this.#environment = intersect(this, process.env, ['constructor', 'environment']));
  }

  addCommand(command: Command) {
    this.commands.push(command);
  }

  /** parses the command line and returns the command that has been requested */
  get command() {
    return this.commands.find(each => each.command === this.inputs[0]);
  }
}

export function parseArgs(args: Array<string>) {
  const cli = new CommandLine();

  for (const each of args) {
    // --name
    // --name:value
    // --name=value
    const [, name, value] = /^--([^=:]+)[=:]?(.+)?$/g.exec(each) || [];
    if (name) {
      cli.switches[name] = cli.switches[name] === undefined ? [] : cli.switches[name];
      cli.switches[name].push(value);
      continue;
    }

    cli.inputs.push(each);
  }
  return cli;
}