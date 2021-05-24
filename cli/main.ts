#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { i, Session, setLocale, Version } from '@microsoft/cella.core';
import { green, white } from 'chalk';
import { argv } from 'process';
import { Version as cliVersion } from './exports';
import { parseArgs } from './lib/command-line';
import { AcquireCommand } from './lib/commands/acquire';
import { CacheCommand } from './lib/commands/cache';
import { CleanCommand } from './lib/commands/clean';
import { DeleteCommand } from './lib/commands/delete';
import { FindCommand } from './lib/commands/find';
import { HelpCommand } from './lib/commands/help';
import { ListCommand } from './lib/commands/list';
import { RegenerateCommand } from './lib/commands/regenerate-index';
import { UpdateCommand } from './lib/commands/update';
import { UseCommand } from './lib/commands/use';
import { VersionCommand } from './lib/commands/version';
import { blank, cli } from './lib/constants';
import { debug, error, initStyling, log } from './lib/styling';

// parse the command line
const commandline = parseArgs(argv.slice(2));

// try to set the locale based on the users's settings.
setLocale(commandline.language, `${__dirname}/i18n/`);

function header() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  console.log(`${green.bold(`${cli} command line utility`)} [cli: ${white.bold(cliVersion)}; core: ${white.bold(Version)}; node: ${white.bold(process.version)}; max-memory: ${white.bold(Math.round((require('v8').getHeapStatistics().heap_size_limit) / (1024 * 1024)) & 0xffffffff00)} gb]`);
  console.log(i`(C) Copyright Microsoft Corporation`);
  console.log('https://github.com/microsoft/cella');
  console.log('');
}

export let session: Session;

async function main() {
  // create our session for this process.
  session = new Session(process.cwd(), commandline.environment);

  initStyling(commandline, session);

  // dump out the version information
  header();

  // start up the session and init the channel listeners.
  await session.init();

  debug(`Anonymous Telemetry Enabled: ${session.telemetryEnabled}`);
  // find a project profile.
  // console.log((await session.findProjectProfile())?.fsPath);

  const help = new HelpCommand(commandline);
  const version = new VersionCommand(commandline);
  const regenerate = new RegenerateCommand(commandline);
  const update = new UpdateCommand(commandline);
  const find = new FindCommand(commandline);
  const acquire = new AcquireCommand(commandline);
  const del = new DeleteCommand(commandline);
  const list = new ListCommand(commandline);
  const cache = new CacheCommand(commandline);
  const clean = new CleanCommand(commandline);
  const use = new UseCommand(commandline);

  debug(`Postscript file ${session.postscriptFile}`);

  const command = commandline.command;
  if (!command) {
    // no command recognized.
    // check if --help -h -? --? /? are asked for
    if (commandline.switches['help'] || commandline.switches['?'] || (['-h', '-help', '-?', '/?'].indexOf(commandline.inputs[0]) > -1)) {
      // let's just run general help
      await help.run();
      return process.exit(0);
    }

    // did they specify inputs?
    if (commandline.inputs.length > 0) {
      // unrecognized command
      error(i`Unrecognized command '${commandline.inputs[0]}'.`);
      log(blank);
      log(green.dim(i`Use \`${cli} ${help.command}\` ${green.dim(i`to get help`)}`));
      return process.exit(1);
    }
    return;
  }

  // if they added --help, we treat it just like help <command>
  if (commandline.switches['help'] || commandline.switches['?'] || (['-h', '-help', '-?', '/?'].indexOf(commandline.inputs[0]) > -1)) {
    // let's just run general help
    await help.run();
    return process.exit(0);
  }

  const result = await command.run();

  await session.writePostscript();

  return process.exitCode = (result ? 0 : 1);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

