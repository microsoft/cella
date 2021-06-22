// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '@microsoft/cella.core';
import { Command } from '../command';

export class RemoveCommand extends Command {
  readonly command = 'remove';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];

  get summary() {
    return i`Removes an artifact from a project.`;
  }

  get description() {
    return [
      i`This allows the consumer to remove an artifact from the project. Forces reactivation in this window.`,
    ];
  }

  async run() {

    return true;
  }
}