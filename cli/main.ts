#!/usr/bin/env node

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i, Session, setLocale, Version } from '@microsoft/vcpkg-ce.core';
import { green, white } from 'chalk';
import { argv } from 'process';
import { Version as cliVersion } from './exports';
import { CommandLine } from './lib/command-line';
import { AcquireCommand } from './lib/commands/acquire';
import { ActivateCommand } from './lib/commands/activate';
import { AddCommand } from './lib/commands/add';
import { CacheCommand } from './lib/commands/cache';
import { CleanCommand } from './lib/commands/clean';
import { DeactivateCommand } from './lib/commands/deactivate';
import { DeleteCommand } from './lib/commands/delete';
import { FindCommand } from './lib/commands/find';
import { HelpCommand } from './lib/commands/help';
import { ListCommand } from './lib/commands/list';
import { NewCommand } from './lib/commands/new';
import { RegenerateCommand } from './lib/commands/regenerate-index';
import { RemoveCommand } from './lib/commands/remove';
import { UpdateCommand } from './lib/commands/update';
import { UseCommand } from './lib/commands/use';
import { VersionCommand } from './lib/commands/version';
import { blank, cli } from './lib/constants';
import { command as formatCommand, hint } from './lib/format';
import { debug, error, initStyling, log } from './lib/styling';

// parse the command line
const commandline = new CommandLine(argv.slice(2));

// try to set the locale based on the users's settings.
setLocale(commandline.language, `${__dirname}/i18n/`);

function header() {

  if (commandline.debug) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    console.log(`${green.bold('VCPkg-ce command line utility')} [cli: ${white.bold(cliVersion)}; core: ${white.bold(Version)}; node: ${white.bold(process.version)}; max-memory: ${white.bold(Math.round((require('v8').getHeapStatistics().heap_size_limit) / (1024 * 1024)) & 0xffffffff00)} gb]`);
  } else {
    console.log(`${green.bold('VCPkg-ce command line utility')}`);
  }
  console.log('');
}

export let session: Session;

async function main() {
  // create our session for this process.
  session = new Session(process.cwd(), commandline.context, <any>commandline, process.env);

  initStyling(commandline, session);

  // dump out the version information
  header();

  // start up the session and init the channel listeners.
  await session.init();

  debug(`Anonymous Telemetry Enabled: ${session.telemetryEnabled}`);
  // find a project profile.
  // console.log((await session.findProjectProfile())?.fsPath);

  const help = new HelpCommand(commandline);

  const find = new FindCommand(commandline);
  const list = new ListCommand(commandline);

  const add = new AddCommand(commandline);
  const acquire = new AcquireCommand(commandline);
  const use = new UseCommand(commandline);

  const remove = new RemoveCommand(commandline);
  const del = new DeleteCommand(commandline);

  const activate = new ActivateCommand(commandline);
  const deactivate = new DeactivateCommand(commandline);

  const newcmd = new NewCommand(commandline);

  const regenerate = new RegenerateCommand(commandline);
  const update = new UpdateCommand(commandline);

  const version = new VersionCommand(commandline);
  const cache = new CacheCommand(commandline);
  const clean = new CleanCommand(commandline);

  debug(`Postscript file ${session.postscriptFile}`);

  const needsHelp = !!(commandline.switches['help'] || commandline.switches['?'] || (['-h', '-help', '-?', '/?'].find(each => argv.includes(each))));
  // check if --help -h -? --? /? are asked for
  if (needsHelp) {
    // let's just run general help
    await help.run();
    return process.exit(0);
  }

  const command = commandline.command;
  if (!command) {
    // no command recognized.

    // did they specify inputs?
    if (commandline.inputs.length > 0) {
      // unrecognized command
      error(i`Unrecognized command '${commandline.inputs[0]}'`);
      log(blank);
      log(hint(i`Use ${formatCommand(`${cli} ${help.command}`)} to get help`));
      return process.exitCode = 1;
    }

    log(blank);
    log(hint(i`Use ${formatCommand(`${cli} ${help.command}`)} to get help`));

    return process.exitCode = 0;
  }

  const result = await command.run();
  log(blank);

  await session.writePostscript();

  return process.exitCode = (result ? 0 : 1);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

