import { i } from '@microsoft/cella.core';
import { delimiter } from 'path';
import { session } from '../../main';
import { activateArtifacts as getArtifactActivation, getRepository, installArtifacts, selectArtifacts, showArtifacts } from '../artifacts';
import { Command } from '../command';
import { error, log, warning } from '../styling';
import { GithubAuthToken } from '../switches/auth';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class UseCommand extends Command {
  readonly command = 'use';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  ghAuth = new GithubAuthToken(this);
  version = new Version(this)

  get summary() {
    return i`Instantly activates an artifact outside of the project.`;
  }

  get description() {
    return [
      i`This will instantly activate an artifact .`,
    ];
  }

  async run() {
    if (this.inputs.length === 0) {
      error(i`No artifacts specified.`);
      return false;
    }

    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple packages specified, but not an equal number of '--verison=' switches. `);
      return false;
    }

    const repository = await getRepository();
    if (!repository) {
      // the repository isn't functional
      return false;
    }

    let failing = false;

    const artifacts = await selectArtifacts(this.inputs, this.version.values);

    if (!artifacts) {
      return false;
    }

    failing = await showArtifacts(artifacts);

    if (failing) {
      warning(i`No artifacts are being acquired.`);
      return false;
    }

    if (await installArtifacts(artifacts, { force: this.commandLine.force })) {
      log(i`Activating Artifacts...`);
      session.setActivationInPostscript(await getArtifactActivation(artifacts));
    } else {
      return false;
    }
    return true;
  }
}