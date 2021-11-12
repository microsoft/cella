// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { i } from '../../i18n';
import { session } from '../../main';
import { Command } from '../command';
import { cli } from '../constants';
import { log, writeException } from '../styling';
import { Registry } from '../switches/registry';
import { WhatIf } from '../switches/whatIf';

export class RegenerateCommand extends Command {
  readonly command = 'regenerate';
  readonly aliases = ['regen'];
  readonly regSwitch = new Registry(this, { required: true });
  seeAlso = [];
  argumentsHelp = [];

  whatIf = new WhatIf(this);
  get summary() {
    return i`regenerate the index for a repository`;
  }

  get description() {
    return [
      i`This allows the user to regenerate the index.yaml files for a ${cli} repository.`,
    ];
  }

  override async run() {
    const registries = await this.regSwitch.loadRegistries(session);

    for (const each of this.inputs) {
      // regenerate a named registry
      const registry = registries.getRegistry(each);
      if (registry) {
        await registry.regenerate();
        await registry.save();
        log(i`Regeneration complete. Index contains ${registry.count} metadata files`);
      }
    }

    // process referenced repositories
    for (const [registry, names] of registries) {
      try {
        log(i`Regenerating index`);
        await registry.regenerate();
        await registry.save();
        log(i`Regeneration complete. Index contains ${registry.count} metadata files`);
      } catch (e) {
        log(i`Regeneration failed for ${names[0].toString()}`);
        writeException(e);
        return false;
      }
    }

    return true;
  }
}