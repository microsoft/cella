// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Artifact, createArtifact } from '../artifacts/artifact';
import { i } from '../i18n';
import { session } from '../main';
import { Uri } from '../util/uri';
import { activateArtifacts, installArtifacts, showArtifacts } from './artifacts';
import { blank } from './constants';
import { projectFile } from './format';
import { error, log } from './styling';

export async function openProject(location: Uri): Promise<Set<Artifact>> {
  // load the project
  const manifest = await session.openManifest(location);

  const artifact = createArtifact(session, manifest, '');

  return await artifact.resolveDependencies();
}

export async function activate(artifacts: Set<Artifact>, options?: { force?: boolean, allLanguages?: boolean, language?: string }) {
  // install the items in the project
  const [success] = await installArtifacts(artifacts, options);

  if (success) {
    // activate all the tools in the project
    const activation = await activateArtifacts(artifacts);
    await session.setActivationInPostscript(activation);
  }

  return success;
}

export async function activateProject(project: Uri, options?: { force?: boolean, allLanguages?: boolean, language?: string }) {
  // track what got installed
  const artifacts = await openProject(project);

  // print the status of what is going to be activated.
  if (!await showArtifacts(artifacts, options)) {
    error(i`Unable to activate project`);
    return false;
  }

  if (await activate(artifacts, options)) {
    log(blank);
    log(i`Project ${projectFile(project)} activated`);
    return true;
  }

  log(blank);
  log(i`Failed to activate project ${projectFile(project)}`);

  return false;
}
