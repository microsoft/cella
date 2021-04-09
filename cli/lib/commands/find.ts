/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i, Repository } from '@microsoft/cella.core';
import { yellowBright } from 'chalk';
import { session } from '../../main';
import { Command } from '../command';
import { parseArgs } from '../command-line';
import { error, log } from '../styling';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';
import { UpdateCommand } from './update';


export class FindCommand extends Command {
  readonly command = 'find';
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  version = new Version(this)

  get summary() {
    return i`Find artifacts in the repository.`;
  }

  get description() {
    return [
      i`This allows the user to find artifacts based on some criteria.`,
    ];
  }

  async run() {
    const repository = new Repository(session);
    try {
      await repository.load();
    } catch (e) {
      log(i`Artifact repository data is not loaded.`);
      log(i`Attempting to update artifact repository.`);
      const update = new UpdateCommand(parseArgs([]));

      let success = true;
      try {
        success = await update.run();
      } catch {
        success = false;
      }
      if (!success) {
        error(i`Unable to load repository index.`);
        return false;
      }
      try {
        await repository.load();
      } catch (e) {
        // it just doesn't want to load.
        error(i`Unable to load repository index.`);
        return false;
      }
    }
    const selections = repository.where;
    for (const each of this.inputs) {
      selections.id.contains(each);
    }

    for (const each of this.version.values) {
      selections.version.rangeMatch(each);
    }

    const results = await repository.open(selections.items);

    let t = '|Artifact|Version|Summary|\n|--|--|--|\n';
    for (const [fullName, artifacts] of results) {
      const latest = artifacts[0];

      const shortname = latest.shortName;
      const name = `${fullName.substr(0, fullName.length - shortname.length)}${yellowBright(shortname)}`;

      t += (`|${name} | ${artifacts[0].metadata.info.version}|${artifacts[0].metadata.info.summary || ''}|\n`);
    }
    log(t);
    log();
    return true;
  }
}