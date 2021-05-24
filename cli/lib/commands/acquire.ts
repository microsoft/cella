/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { getRepository, installArtifacts, selectArtifacts, showArtifacts } from '../artifacts';
import { Command } from '../command';
import { error, log, warning } from '../styling';
import { GithubAuthToken } from '../switches/auth';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';

export class AcquireCommand extends Command {
  readonly command = 'acquire';
  readonly aliases = ['install'];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  ghAuth = new GithubAuthToken(this);
  version = new Version(this)

  get summary() {
    return i`Acquire artifacts in the repository.`;
  }

  get description() {
    return [
      i`This allows the consumer to acquire (download and unpack) artifacts. Artifacts must be activated to be used.`,
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
      log(i`Installation completed successfuly`);
    } else {
      return false;
    }
    return true;
  }
}