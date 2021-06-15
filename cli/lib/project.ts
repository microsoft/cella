/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Artifact, createArtifact, Uri } from '@microsoft/cella.core';
import { session } from '../main';
import { activateArtifacts, installArtifacts } from './artifacts';

export async function activateProject(location: Uri): Promise<[boolean, Map<Artifact, boolean>]> {
  // load the project
  const manifest = await session.openManifest(location);

  const artifact = createArtifact(session, manifest, '');

  const artifacts = await artifact.resolveDependencies();

  // install the items in the project
  const [success, artifactStatus] = await installArtifacts(artifacts);

  /*
  // which artifacts have been installed
  for (const [dep, installed] of artifactStatus) {
    if (installed) {
      const id = dep.id;
      const ver = dep.info.version;
      console.log(`${id}, ${ver}`);
    }
  }
*/

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

