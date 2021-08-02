// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/vcpkg-ce.core';
import { session } from '../../main';
import { Command } from '../command';
import { projectFile } from '../format';
import { activateProject } from '../project';
import { debug } from '../styling';
import { Project } from '../switches/project';
import { WhatIf } from '../switches/whatIf';

export class ActivateCommand extends Command {
  readonly command = 'activate';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  whatIf = new WhatIf(this)
  project: Project = new Project(this);

  get summary() {
    return i`Activates the tools required for a project`;
  }

  get description() {
    return [
      i`This allows the consumer to Activate the tools required for a project. If the tools are not already installed, this will force them to be downloaded and installed before activation.`,
    ];
  }

  async run() {
    const project = await this.project.value;
    if (!project) {
      return false;
    }

    debug(i`Deactivating project ${projectFile(project)}`);
    await session.deactivate();

    return await activateProject(project, this.commandLine);
  }
}