// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { sanitizeUri } from '../../artifacts/artifact';
import { i } from '../../i18n';
import { Session } from '../../session';
import { UpdateCommand } from '../commands/update';
import { Switch } from '../switch';

export class Registry extends Switch {
  switch = 'registry';
  get help() {
    return [
      i`override the path to the repository`
    ];
  }

  async loadRegistries(session: Session, more: Array<string> = []) {
    const registries = session.defaultRegistry;
    for (const each of new Set([...this.values, ...more].map(each => sanitizeUri(each)))) {
      if (each) {
        const uri = session.parseUri(each);
        if (await session.isLocalRegistry(uri) || await session.isRemoteRegistry(uri)) {

          const r = session.loadRegistry(uri, 'artifact');
          if (r) {
            try {
              await r.load();
            } catch (e) {
              // try to update the repo
              if (!await UpdateCommand.update(r)) {
                session.channels.error(i`failed to load registry ${uri.toString()}`);
                continue;
              }
            }
            // registry is loaded
            // it should be added to the
            registries.add(r, each);
          }
          continue;
        }
        session.channels.error(i`Invalid registry ${each}`);
      }
    }

    return registries;
  }

}