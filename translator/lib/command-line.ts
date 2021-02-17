import { fail } from 'assert';
import { resolve } from 'path';

export type switches = {
  [key: string]: Array<string>;
}

function onlyOne(values: Array<string>, errorMessage: string) {
  switch (values.length) {
    case 0:
      return undefined;
    case 1:
      return values[0];
  }
  throw new Error(errorMessage);
}

export class CommandLine {
  readonly inputs = new Array<string>();
  readonly switches: switches = {};

  switch(name: string, errorMessage: string) {
    return onlyOne(this.switches[name], errorMessage);
  }

  get noTranslate() {
    return !!this.switches['no-translate'];
  }

  #output!: string;
  get output() {
    return this.#output || (this.#output = onlyOne(this.switches['output'], 'multiple output folders specified.') ?? '');
  }

  get force() {
    return !!this.switches.force;
  }

  #folder!: string;
  get folder() {
    return this.#folder || (this.#folder = resolve(onlyOne(this.inputs, 'multiple locations specified.') || fail('Must specify a project folder to work on.')));
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