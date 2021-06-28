// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { artifactIdentity } from '../format';
import { Table } from '../markdown-table';
import { log } from '../styling';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';
import { UpdateCommand } from './update';

export class FindCommand extends Command {
  readonly command = 'find';
  readonly aliases = ['search'];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  version = new Version(this)

  get summary() {
    return i`Find artifacts in the repository`;
  }

  get description() {
    return [
      i`This allows the user to find artifacts based on some criteria.`,
    ];
  }

  async run() {
    const repository = session.getRepository('default');
    try {
      await repository.load();
    } catch (e) {
      // try to update the repo
      if (!await UpdateCommand.update(repository)) {
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

    const results = await repository.openArtifacts(selections.items);

    const table = new Table('Artifact', 'Version', 'Summary');

    for (const [fullName, artifacts] of results) {
      const latest = artifacts[0];
      if (!latest.info.dependencyOnly) {
        const name = artifactIdentity(fullName, latest.shortName);
        table.push(name, latest.info.version, latest.info.summary || '');
      }
    }
    log(table.toString());
    log();
    return true;
  }
}