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
import { initStyling, log } from './lib/styling';


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

// create our session for this process.
const session = new Session(process.cwd(), commandline.environment);

initStyling(commandline, session);

// dump out the version information
header();
console.log('---------');
log(JSON.stringify(commandline.environment, null, 2));

