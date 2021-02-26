
import { intersect } from '@microsoft/cella.core';
import { tmpdir } from 'os';
import { join } from 'path';

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

export class CommandLine {
  readonly inputs = new Array<string>();
  readonly switches: switches = {};

  switch(name: string, errorMessage: string) {
    return onlyOne(this.switches[name], errorMessage);
  }

  #root?: string;
  get cellaRoot() {
    // root folder is determined by
    // command line (--cella-root, --cella_root)
    // environment (CELLA_ROOT)
    // default 1 $HOME/.cella
    // default 2 <tmpdir>/.cella

    // note, this does not create the folder, that would happen when the session is initialized.

    return this.#root || (this.#root = this.switches['cella-root']?.[0] || this.switches['cella_root']?.[0] || process.env['CELLA_ROOT'] || join(process.env['HOME'] || tmpdir(), '.cella'));
  }

  get force() {
    return !!this.switches['force'];
  }

  get debug() {
    return !!this.switches['debug'];
  }

  get lang() {
    return onlyOne(this.switches['language'], '--lang specified multiple times!') || Intl.DateTimeFormat().resolvedOptions().locale;
  }

  #environment?: { [key: string]: string | undefined; };
  get environment(): { [key: string]: string | undefined; } {
    return this.#environment || (this.#environment = intersect(this, process.env, ['constructor', 'environment']));
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