/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Session } from '@microsoft/cella.core';
import { blue, gray, green, white } from 'chalk';
import * as md from 'marked';
import * as renderer from 'marked-terminal';
import { CommandLine } from './command-line';

// setup markdown renderer
md.setOptions({
  renderer: new renderer({
    tab: 2,
    emoji: true,
    showSectionPrefix: false,
    firstHeading: green.underline.bold,
    heading: green.underline,
    codespan: white,
    link: blue.bold,
    href: blue.bold.underline,
    code: gray
  }),
  gfm: true,
});

export let log: (message?: any, ...optionalParams: Array<any>) => void = console.log;
export let error: (message?: any, ...optionalParams: Array<any>) => void = console.error;
export let debug: (message?: any, ...optionalParams: Array<any>) => void = () => { /* */ };

export function initStyling(commandline: CommandLine, session: Session) {
  log = (text) => console.log((md(text)));
  error = (text) => console.error((md(text)));
  debug = (text) => { if (commandline.debug) { console.log((md(text))); } };

  session.channels.on('message', (text: string, context: any, msec: number) => {
    log(text);
  });

  session.channels.on('error', (text: string, context: any, msec: number) => {
    error(text);
  });

  session.channels.on('debug', (text: string, context: any, msec: number) => {
    debug(text);
  });

}