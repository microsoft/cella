#!/usr/bin/env node

import { i, setLocale, Version } from '@microsoft/cella.core';
import { green, white } from 'chalk';
import { argv } from 'process';
import { Version as cliVersion } from './exports';
import { parseArgs } from './lib/command-line';
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

// dump out the version information
header();