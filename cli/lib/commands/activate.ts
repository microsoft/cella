/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { findProject } from '../project';
import { error } from '../styling';

export class ActivateCommand extends Command {
  readonly command = 'activate';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];

  get summary() {
    return i`Activates the tools required for a project.`;
  }

  get description() {
    return [
      i`This allows the consumer to Activate the tools required for a project. If the tools are not already installed, this will force them to be downloaded and installed before activation.`,
    ];
  }

  async run() {
    // find the project file
    const projectFile = await findProject(session.currentDirectory);
    if (!projectFile) {
      error(i`Unable to find project in folder (or parent folders) for ${session.currentDirectory.fsPath}`);
      return false;
    }
    // load the project
    const manifest = await session.openManifest(projectFile);
    // install the items in the project


    // activate all the tools in the project
    return true;
  }
}