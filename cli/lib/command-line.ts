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


  get force() {
    return !!this.switches.force;
  }

  get debug() {
    return !!this.switches.debug;
  }

  get lang() {
    return onlyOne(this.switches.language, '--lang specified multiple times!') || Intl.DateTimeFormat().resolvedOptions().locale;
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