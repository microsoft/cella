// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Artifact, i } from '@microsoft/vcpkg-ce.core';
import { Activation } from '@microsoft/vcpkg-ce.core/dist/lib/activation';
import { MultiBar, SingleBar } from 'cli-progress';
import { session } from '../main';
import { UpdateCommand } from './commands/update';
import { artifactIdentity, artifactReference } from './format';
import { Table } from './markdown-table';
import { debug, error, log } from './styling';

export async function showArtifacts(artifacts: Iterable<Artifact>, options?: { force?: boolean }) {
  let failing = false;
  const table = new Table(i`Artifact`, i`Version`, i`Status`, i`Dependency`, i`Summary`);
  for (const artifact of artifacts) {

    const name = artifactIdentity(artifact.info.id, artifact.shortName);
    if (!artifact.isValid) {
      failing = true;
      for (const err of artifact.validationErrors) {
        error(err);
      }
    }
    table.push(name, artifact.info.version, options?.force || await artifact.isInstalled ? 'installed' : 'will install', artifact.isPrimary ? ' ' : '*', artifact.info.summary || '');
  }
  log(table.toString());

  return !failing;
}

export type Selections = Array<[string, string | undefined]>;

export async function selectArtifacts(selections: Selections): Promise<false | Set<Artifact>> {
  const artifacts = new Set<Artifact>();

  for (const [identity, version] of selections) {
    const artifact = await session.getArtifact(identity, version);
    if (!artifact) {
      error(`Unable to resolve artifact: ${artifactReference(identity, version || '*')}`);
      return false;
    }
    artifacts.add(artifact);
    artifact.isPrimary = true;
    await artifact.resolveDependencies(artifacts);
  }
  return artifacts;
}

export async function installArtifacts(artifacts: Iterable<Artifact>, options?: { force?: boolean, allLanguages?: boolean, language?: string }): Promise<[boolean, Map<Artifact, boolean>]> {
  // resolve the full set of artifacts to install.
  const installed = new Map<Artifact, boolean>();

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
      const actuallyInstalled = await artifact.install({
        ...options,
        events: {
          verifying: (name, percent) => {
            if (percent >= 100) {
              p?.update(percent);
              p = undefined;
              return;
            }
            if (percent) {
              if (!p) {
                p = bar.create(100, 0, { action: i`verifying`, name: artifactIdentity(id), current: name });
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
                dl = bar.create(100, 0, { action: i`downloading`, name: artifactIdentity(id), current: name });
              }
              dl.update(percent);
            }
          },
          fileProgress: (entry) => {
            p?.update({ action: i`unpacking`, name: artifactIdentity(id), current: entry.extractPath });
          },
          progress: (percent: number) => {
            if (percent >= 100) {
              if (p) {
                p.update(percent, { action: i`unpacked`, name: artifactIdentity(id), current: '' });
              }
              p = undefined;
              return;
            }
            if (percent) {
              if (!p) {
                p = bar.create(100, 0, { action: i`unpacking`, name: artifactIdentity(id), current: '' });
              }
              p.update(percent);
            }
          }
        }
      });
      // remember what was actually installed
      installed.set(artifact, actuallyInstalled);
    } catch (e) {
      bar.stop();
      debug(e);
      error(i`Error installing ${artifactIdentity(id)} - ${e} `);
      return [false, installed];
    }

    bar.stop();
  }
  return [true, installed];
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
