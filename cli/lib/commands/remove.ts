/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { activateProject } from '../project';
import { debug, error, log } from '../styling';

export class RemoveCommand extends Command {
  readonly command = 'remove';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];

  get summary() {
    return i`Removes an artifact from a project.`;
  }

  get description() {
    return [
      i`This allows the consumer to remove an artifact from the project. Forces reactivation in this window.`,
    ];
  }

  async run() {
    const projectFile = await session.findProjectProfile(session.currentDirectory);
    if (!projectFile) {
      error(i`Unable to find project in folder (or parent folders) for ${session.currentDirectory.fsPath}`);
      return false;
    }

    if (this.inputs.length === 0) {
      error(i`No artifacts specified.`);
      return false;
    }

    const manifest = await session.openManifest(projectFile);

    const req = manifest.requires.keys;
    for (const input of this.inputs) {
      if (req.indexOf(input) !== -1) {
        delete manifest.requires[input];
        log(i`Removing ${input} from project manifest.`);
      } else {
        error(i`unable to find artifact ${input} in the project manifest.`);
        return false;
      }
    }

    // write the file out.
    await projectFile.writeFile(Buffer.from(manifest.content));

    debug('Deactivating manifest...');
    await session.deactivate();

    log(i`Activating ${projectFile.fsPath}`);
    await activateProject(projectFile);

    // find the project file
    // load the project

    // identify the artifacts that the user asked to remove

    // remove them from the project
    // save the project file
    // re-activate the project
    return true;
  }
}