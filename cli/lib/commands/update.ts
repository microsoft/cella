/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i, RemoteFileUnavailable, Repository } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { error, log } from '../styling';
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
    const token = process.env['github_auth_token'] || '';
    if (!token) {
      error(i`Current, the repository requires an auth token. Please set the 'github_auth_token' environment variable.`);
      return false;
    }
    try {
      log(i`Downloading repository data`);
      await repository.update(token);
      await repository.load();
      log(i`Repository update complete. Repository contains \`${repository.count}\` metadata files.`);
    } catch (e) {
      if (e instanceof RemoteFileUnavailable) {
        log(i`Unable to download repository snapshot.`);
        return false;
      }
    }
    return true;
  }
}