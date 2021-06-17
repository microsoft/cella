/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { project } from '../constants';
import { log } from '../styling';
import { WhatIf } from '../switches/whatIf';

export class NewCommand extends Command {
  readonly command = 'new';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  whatIf = new WhatIf(this);

  get summary() {
    return i`Creates a new project file`;
  }

  get description() {
    return [
      i`This allows the consumer create a new project file ('${project}').`,
    ];
  }

  async run() {
    if (await session.currentDirectory.exists(project)) {
      log(i`The folder at ${session.currentDirectory.fsPath} already contains a project file '${project}'`);
      return false;
    }

    await session.currentDirectory.join(project).writeFile(Buffer.from(`# Environment configuration
info:
  name: NAME
  version: 1.0.0
  summary: My Project

`));
    return true;
  }
}