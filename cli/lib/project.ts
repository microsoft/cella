/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Artifact, createArtifact, Uri } from '@microsoft/cella.core';
import { session } from '../main';
import { activateArtifacts, installArtifacts } from './artifacts';
import { project } from './constants';

export async function findProject(location: Uri): Promise<undefined | Uri> {
  const p = location.join(project);

  if (await location.exists()) {
    return p;
  }

  const parent = location.parent();
  if (parent.fsPath !== '.' && parent.fsPath != '/') {
    return findProject(parent);
  }

  return undefined;
}

export async function activateProject(location: Uri): Promise<[boolean, Map<Artifact, boolean>]> {
  // load the project
  const manifest = await session.openManifest(location);

  const artifact = createArtifact(session, manifest, '');

  const artifacts = await artifact.resolveDependencies();

  // install the items in the project
  const [success, artifactStatus] = await installArtifacts(artifacts);

  if (success) {
    // activate all the tools in the project
    const activation = await activateArtifacts(artifacts);
    await session.setActivationInPostscript(activation);

  }

  return [success, artifactStatus];
}

// activation
//  -- store the 'reverse-activation' info in a file somewhere.
//  -- d
//  -- set an environment variable to keep the de-activate session cmd.

// de-activation - restore the environment variables to their previous state
// -- paths should have their things removed.
// -- other variables should just be deleted?

