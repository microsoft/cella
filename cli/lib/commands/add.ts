/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { project } from '../constants';
import { log } from '../styling';

export class AddCommand extends Command {
  readonly command = 'add';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];

  get summary() {
    return i`Adds an artifact to the project.`;
  }

  get description() {
    return [
      i`This allows the consumer to add an artifact to the project. This will activate the project as well.`,
    ];
  }

  async run() {
    if (! await session.currentDirectory.exists(project)) {
      log(i`The folder at ${session.currentDirectory.fsPath} does not contain a project file '${project}'`);
      return false;
    }

    // select the artifacts
    // add them to the project if they are not there
    // call project activate

    return true;
  }
}