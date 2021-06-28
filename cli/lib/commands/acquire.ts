// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { installArtifacts, selectArtifacts, Selections, showArtifacts } from '../artifacts';
import { Command } from '../command';
import { blank } from '../constants';
import { cmdSwitch } from '../format';
import { debug, error, log, warning } from '../styling';
import { GithubAuthToken } from '../switches/auth';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';
import { WhatIf } from '../switches/whatIf';

export class AcquireCommand extends Command {
  readonly command = 'acquire';
  readonly aliases = ['install'];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  ghAuth = new GithubAuthToken(this);
  version = new Version(this);
  whatIf = new WhatIf(this);

  get summary() {
    return i`Acquire artifacts in the repository`;
  }

  get description() {
    return [
      i`This allows the consumer to acquire (download and unpack) artifacts. Artifacts must be activated to be used`,
    ];
  }

  async run() {
    if (this.inputs.length === 0) {
      error(i`No artifacts specified`);
      return false;
    }

    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple packages specified, but not an equal number of ${cmdSwitch('version')} switches.`);
      return false;
    }

    const artifacts = await selectArtifacts(<Selections>this.inputs.map((v, i) => [v, versions[i]]));

    if (!artifacts) {
      debug('No artifacts selected - stopping');
      return false;
    }

    if (!await showArtifacts(artifacts, this.commandLine)) {
      warning(i`No artifacts are acquired`);
      return false;
    }

    const numberOfArtifacts = await [...artifacts].count(async each => !(!this.commandLine.force && await each.isInstalled));

    if (!numberOfArtifacts) {
      log(blank);
      log(i`All artifacts are already installed`);
      return true;
    }

    debug(`Installing ${numberOfArtifacts} artifacts`);

    const [success] = await installArtifacts(artifacts, { force: this.commandLine.force, language: this.commandLine.language, allLanguages: this.commandLine.allLanguages });

    if (success) {
      log(blank);
      log(i`${numberOfArtifacts} artifacts installed successfuly`);
      return true;
    }

    log(blank);
    log(i`Installation failed -- stopping`);

    return false;
  }
}
