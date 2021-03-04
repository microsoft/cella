#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { i, Session, setLocale, Version } from '@microsoft/cella.core';
import { green, white } from 'chalk';
import { argv } from 'process';
import { Version as cliVersion } from './exports';
import { parseArgs } from './lib/command-line';
import { debug, initStyling } from './lib/styling';

// parse the command line
const commandline = parseArgs(argv.slice(2));

// try to set the locale based on the users's settings.
setLocale(commandline.lang, `${__dirname}/i18n/`);

function header() {
  console.log('');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  console.log(`${green.bold('Cella Command line utility')} [cli: ${white.bold(cliVersion)}; core: ${white.bold(Version)}; node: ${white.bold(process.version)}; max-memory: ${white.bold(Math.round((require('v8').getHeapStatistics().heap_size_limit) / (1024 * 1024)) & 0xffffffff00)} gb]`);
  console.log(i`(C) Copyright 2021 Microsoft Corporation`);
  console.log('https://github.com/microsoft/cella');
  console.log('');
}

async function main() {
  // create our session for this process.
  const session = new Session(process.cwd(), commandline.environment);

  initStyling(commandline, session);

  // dump out the version information
  header();

  // start up the session and init the channel listeners.
  await session.init();

  debug(`Anonymous Telemetry Enabled: ${session.telemetryEnabled}`);
  // find a project profile.
  // console.log((await session.findProjectProfile())?.fsPath);

  debug(`Postscript file ${session.postscriptFile}`);

  await session.addPostscript('cella_time', new Date().toString());

  await session.writePostscript();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

