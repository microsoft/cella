// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { MetadataFile } from '../../lib/amf/metadata-file';
import { i } from '../../lib/i18n';
import { session } from '../../main';
import { selectArtifacts, Selections } from '../artifacts';
import { Command } from '../command';
import { cmdSwitch, projectFile } from '../format';
import { activateProject } from '../project';
import { debug, error } from '../styling';
import { Project } from '../switches/project';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';
import { WhatIf } from '../switches/whatIf';

export class AddCommand extends Command {
  readonly command = 'add';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  version = new Version(this)
  project: Project = new Project(this);
  whatIf = new WhatIf(this);

  get summary() {
    return i`Adds an artifact to the project`;
  }

  get description() {
    return [
      i`This allows the consumer to add an artifact to the project. This will activate the project as well.`,
    ];
  }

  override async run() {
    const project = await this.project.value;
    if (!project) {
      return false;
    }

    if (this.inputs.length === 0) {
      error(i`No artifacts specified`);
      return false;
    }

    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple artifacts specified, but not an equal number of ${cmdSwitch('version')} switches`);
      return false;
    }

    const selections = <Selections>this.inputs.map((v, i) => [v, versions[i]]);
    const selectedArtifacts = await selectArtifacts(selections);

    if (!selectedArtifacts) {
      return false;
    }

    const manifest = await session.openManifest(project);
    let m: MetadataFile;

    for (const artifact of selectedArtifacts) {
      manifest.requires.set(artifact.id, <any>artifact.version.toString());
    }

    // write the file out.
    await manifest.save(project);

    debug(i`Deactivating project ${projectFile(project)}`);
    await session.deactivate();

    return await activateProject(project, this.commandLine);
  }
}