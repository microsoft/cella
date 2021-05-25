/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Artifact, i } from '@microsoft/cella.core';
import { Activation } from '@microsoft/cella.core/dist/lib/activation';
import { MultiBar, SingleBar } from 'cli-progress';
import { session } from '../main';
import { UpdateCommand } from './commands/update';
import { Table } from './markdown-table';
import { error, formatName, log } from './styling';

export async function showArtifacts(artifacts: Set<Artifact>) {
  let failing = false;
  const table = new Table(i`Artifact`, i`Version`, i`Status`, i`Summary`);
  for (const artifact of artifacts) {

    const name = formatName(artifact.info.id, artifact.shortName);
    if (!artifact.isValid) {
      failing = true;
      for (const err of artifact.validationErrors) {
        error(err);
      }
    }
    table.push(name, artifact.info.version, await artifact.isInstalled ? 'installed' : 'not installed', artifact.info.summary || '');
  }
  log(table.toString());

  return failing;
}

export async function selectArtifacts(inputs: Array<string>, versions: Array<string>) {
  if (versions.length && inputs.length !== versions.length) {
    error(i`Multiple packages specified, but not an equal number of '--verison=' switches. `);
    return false;
  }

  const artifacts = new Set<Artifact>();

  let n = 0;
  for (const identity of inputs) {
    const version = versions[n++];

    const artifact = await session.getArtifact(identity, version);
    if (!artifact) {
      error(`Unable to resolve artifact: \`${identity}/${version || '*'}\``);
      return false;
    }

    artifacts.add(artifact);
    await artifact.resolveDependencies(artifacts);
  }
  return artifacts;
}

export async function installArtifacts(artifacts: Iterable<Artifact>, options?: { force?: boolean }) {
  // resolve the full set of artifacts to install.

  const bar = new MultiBar({
    clearOnComplete: true, hideCursor: true, format: '{name} {bar}\u25A0 {percentage}% {action} {current}',
    barCompleteChar: '\u25A0',
    barIncompleteChar: ' ',
    etaBuffer: 40
  });
  let dl: SingleBar | undefined;
  let p: SingleBar | undefined;

  for (const artifact of artifacts) {
    const id = artifact.id;

    try {
      await artifact.install({
        force: options?.force,
        events: {
          verifying: (name, percent) => {
            if (percent >= 100) {
              p?.update(percent);
              p = undefined;
              return;
            }
            if (percent) {
              if (!p) {
                p = bar.create(100, 0, { action: i`verifying`, name: formatName(id), current: name });
              }
              p.update(percent);
            }
          },
          download: (name, percent) => {
            if (percent >= 100) {
              if (dl) {
                dl.update(percent);
              }
              dl = undefined;
              return;
            }
            if (percent) {
              if (!dl) {
                dl = bar.create(100, 0, { action: i`downloading`, name: formatName(id), current: name });
              }
              dl.update(percent);
            }
          },
          fileProgress: (entry) => {
            p?.update({ action: i`unpacking`, name: formatName(id), current: entry.extractPath });
          },
          progress: (percent: number) => {
            if (percent >= 100) {
              if (p) {
                p.update(percent, { action: i`unpacked`, name: formatName(id), current: '' });
              }
              p = undefined;
              return;
            }
            if (percent) {
              if (!p) {
                p = bar.create(100, 0, { action: i`unpacking`, name: formatName(id), current: '' });
              }
              p.update(percent);
            }
          }
        }
      });
    } catch (e) {
      bar.stop();
      error(i`Error installing ${formatName(id)} - ${e} `);
      return false;
    }

    bar.stop();
  }
  return true;
}

// more options in the future...
export async function getRepository() {
  const repository = session.getRepository('default');
  try {
    await repository.load();
  } catch (e) {
    // try to update the repo
    if (!await UpdateCommand.update(repository)) {
      return false;
    }
  }
  return repository;
}

export async function activateArtifacts(artifacts: Iterable<Artifact>) {
  const activation = new Activation();
  for (const artifact of artifacts) {
    if (await artifact.isInstalled) {
      await artifact.loadActivationSettings(activation);
    }
  }
  return activation;
}