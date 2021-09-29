// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/vcpkg-ce.core';
import { session } from '../../main';
import { activateArtifacts as getArtifactActivation, getRepository, installArtifacts, selectArtifacts, Selections, showArtifacts } from '../artifacts';
import { Command } from '../command';
import { cmdSwitch } from '../format';
import { error, log, warning } from '../styling';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';
import { WhatIf } from '../switches/whatIf';

export class UseCommand extends Command {
  readonly command = 'use';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  version = new Version(this);
  whatIf = new WhatIf(this);

  get summary() {
    return i`Instantly activates an artifact outside of the project`;
  }

  get description() {
    return [
      i`This will instantly activate an artifact .`,
    ];
  }

  override async run() {
    if (this.inputs.length === 0) {
      error(i`No artifacts specified`);
      return false;
    }

    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple packages specified, but not an equal number of ${cmdSwitch('version')} switches`);
      return false;
    }

    const repository = await getRepository();
    if (!repository) {
      // the repository isn't functional
      return false;
    }

    const selections = <Selections>this.inputs.map((v, i) => [v, versions[i]]);
    const artifacts = await selectArtifacts(selections);

    if (!artifacts) {
      return false;
    }

    if (!await showArtifacts(artifacts, this.commandLine)) {
      warning(i`No artifacts are being acquired`);
      return false;
    }

    const [success, artifactStatus] = await installArtifacts(artifacts, { force: this.commandLine.force, language: this.commandLine.language, allLanguages: this.commandLine.allLanguages });
    if (success) {
      log(i`Activating individual artifacts`);
      await session.setActivationInPostscript(await getArtifactActivation(artifacts), false);
    } else {
      return false;
    }
    return true;
  }
}