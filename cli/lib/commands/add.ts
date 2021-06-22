// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { Command } from '../command';

export class AddCommand extends Command {
  readonly command = 'add';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];

  get summary() {
    return i`Adds an artifact to the project.`;
  }

  get description() {
    return [
      i`This allows the consumer to add an artifact to the project. This will activate the project as well.`,
    ];
  }

  async run() {

    return true;
  }
}