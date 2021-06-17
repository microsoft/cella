/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { cli } from '../constants';
import { log } from '../styling';
import { Repo } from '../switches/repo';
import { WhatIf } from '../switches/whatIf';

export class RegenerateCommand extends Command {
  readonly command = 'regenerate';
  readonly aliases = ['regen'];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  whatIf = new WhatIf(this);
  get summary() {
    return i`regenerate the index for a repository`;
  }

  get description() {
    return [
      i`This allows the user to regenerate the index.yaml files for a ${cli} repository.`,
    ];
  }

  async run() {
    const repository = session.getRepository('default');

    log(i`Regenerating index.yaml file for the repository at ${repository.baseFolder.fsPath}`);
    await repository.regenerate();
    await repository.save();
    log(i`Regeneration complete. Index contains ${repository.count} metadata files`);

    return true;
  }
}