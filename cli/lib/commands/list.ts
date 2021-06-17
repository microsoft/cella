/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { artifactIdentity } from '../format';
import { Table } from '../markdown-table';
import { log } from '../styling';
import { Installed } from '../switches/installed';

export class ListCommand extends Command {
  readonly command = 'list';
  readonly aliases = ['show'];
  seeAlso = [];
  argumentsHelp = [];
  installed = new Installed(this);

  get summary() {
    return i`Lists the artifacts`;
  }

  get description() {
    return [
      i`This allows the consumer to list artifacts.`,
    ];
  }

  async run() {
    if (this.installed.active) {
      const artifacts = await session.getInstalledArtifacts();
      const table = new Table('Artifact', 'Version', 'Summary');

      for (const { artifact, id, folder } of artifacts) {
        const latest = artifacts[0];
        const name = artifactIdentity(id);
        table.push(name, artifact.info.version, artifact.info.summary || '');
      }
      log(table.toString());
      log();
    }
    else {
      log('use --installed for now');
    }

    return true;
  }
}