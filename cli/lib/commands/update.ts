/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i, RemoteFileUnavailable, Repository } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { parseArgs } from '../command-line';
import { error, log, writeException } from '../styling';
import { Repo } from '../switches/repo';
export class UpdateCommand extends Command {
  readonly command = 'update';
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);

  get summary() {
    return i`update the repository from the remote`;
  }

  get description() {
    return [
      i`This downloads the latest contents of the repository from github.`,
    ];
  }

  async run() {

    const repository = new Repository(session);
    try {
      log(i`Downloading repository data`);
      await repository.update('');
      await repository.load();
      log(i`Repository update complete. Repository contains \`${repository.count}\` metadata files.`);
    } catch (e) {
      if (e instanceof RemoteFileUnavailable) {
        log(i`Unable to download repository snapshot.`);
        return false;
      }
      writeException(e);
      return false;
    }
    return true;
  }

  static async update(repository: Repository) {
    log(i`Artifact repository data is not loaded.`);
    log(i`Attempting to update artifact repository.`);
    const update = new UpdateCommand(parseArgs([]));

    let success = true;
    try {
      success = await update.run();
    } catch (e) {
      writeException(e);
      success = false;
    }
    if (!success) {
      error(i`Unable to load repository index.`);
      return false;
    }
    try {
      await repository.load();
    } catch (e) {
      writeException(e);
      // it just doesn't want to load.
      error(i`Unable to load repository index.`);
      return false;
    }
    return true;
  }
}