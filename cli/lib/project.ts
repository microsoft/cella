/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Uri } from '@microsoft/cella.core';
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


// activation
//  -- store the 'reverse-activation' info in a file somewhere.
//  -- d
//  -- set an environment variable to keep the de-activate session cmd.

// de-activation - restore the environment variables to their previous state
// -- paths should have their things removed.
// -- other variables should just be deleted?

