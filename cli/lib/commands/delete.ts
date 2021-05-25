/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { Version } from '../switches/version';

export class DeleteCommand extends Command {
  readonly command = 'delete';
  readonly aliases = ['uninstall'];
  seeAlso = [];
  argumentsHelp = [];
  version = new Version(this)

  get summary() {
    return i`Deletes an artifact from the artifact folder.`;
  }

  get description() {
    return [
      i`This allows the consumer to remove an artifact from disk.`,
    ];
  }

  async run() {
    const artifacts = await session.getInstalledArtifacts();
    for (const input of this.inputs) {
      for (const { artifact, id, folder } of artifacts) {
        if (input === id) {
          if (await folder.exists()) {
            session.channels.message(i`Deleting artifact ${id} from ${folder.fsPath}`);
            await artifact.uninstall();
          }
        }
      }
    }


    return true;
  }
}