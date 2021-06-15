/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { selectArtifacts, Selections, showArtifacts } from '../artifacts';
import { Command } from '../command';
import { activateProject } from '../project';
import { debug, error, log } from '../styling';
import { GithubAuthToken } from '../switches/auth';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';

export class AddCommand extends Command {
  readonly command = 'add';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  ghAuth = new GithubAuthToken(this);
  version = new Version(this)

  get summary() {
    return i`Adds an artifact to the project.`;
  }

  get description() {
    return [
      i`This allows the consumer to add an artifact to the project. This will activate the project as well.`,
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

    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple packages specified, but not an equal number of '--version=' switches. `);
      return false;
    }

    const selections = <Selections>this.inputs.map((v, i) => [v, versions[i]]);
    const artifacts = await selectArtifacts(selections);

    if (!artifacts) {
      return false;
    }

    const manifest = await session.openManifest(projectFile);

    if (!artifacts) {
      error(i`Unable to add artifacts`);
      return false;
    }

    for (const artifact of artifacts) {
      manifest.requires[artifact.id] = <any>artifact.info.version;
    }

    // write the file out.
    await projectFile.writeFile(Buffer.from(manifest.content));

    debug('Deactivating manifest...');
    await session.deactivate();

    log(i`Activating '${projectFile.fsPath}'`);
    const [success, results] = await activateProject(projectFile);

    await showArtifacts(new Set(results.keys()));

    return true;
  }
}