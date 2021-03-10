/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { Argument, blank, cli, Command } from './command-line';
import { error, indent, log } from './styling';

class CommandName extends Argument {
  argument = 'command';

  get help() {
    return [
      i`the name of the command for which you want help.`
    ];
  }

}

/**@internal */
export class HelpCommand extends Command {
  readonly command = 'help';
  seeAlso = [];
  commandName: CommandName = new CommandName(this);

  get argumentsHelp() {
    return [indent(i` <${this.commandName.argument}> : ${this.commandName.help.join(' ')}`)];
  }


  get summary() {
    return i`get help on ${cli} or one of the commands`;
  }

  get description() {
    return [
      i`Gets detailed help on ${cli}, or one of the commands`,
      blank,
      i`Arguments:`
    ];
  }

  async run() {
    // did they ask for help on a command?
    const cmd = this.commandLine.inputs[0] === this.command ? this.commandLine.inputs[1] : this.commandLine.inputs[0];
    if (cmd) {
      const target = this.commandLine.commands.find(each => each.command === cmd);
      if (target) {
        log(target.help.join('\n'));
        return true;
      }

      // I don't know the command
      error(i`Unrecognized command '${cmd}'.`);
      log(i`use \`${cli} ${this.command}\` to get the list of available commands.`);
      return false;
    }

    // general help. return the general help info

    log(i`## Usage`);
    log(blank);
    log(indent(i`${cli} COMMAND <arguments> [--switches]`));
    log(blank);

    log(i`## Available ${cli} commands:`);
    log(blank);
    const max = Math.max(...this.commandLine.commands.map(each => each.command.length));
    for (const command of this.commandLine.commands) {

      log(indent(i`\`${command.command.padEnd(max)}\` : ${command.summary}`));
    }

    log(blank);

    return true;
  }
}