/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Artifact, i } from '@microsoft/cella.core';
import { MultiBar, SingleBar } from 'cli-progress';
import { session } from '../../main';
import { Command } from '../command';
import { Table } from '../markdown-table';
import { error, formatName, log, warning } from '../styling';
import { GithubAuthToken } from '../switches/auth';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';
import { UpdateCommand } from './update';

export class AcquireCommand extends Command {
  readonly command = 'acquire';
  readonly aliases = ['install'];
  seeAlso = [];
  argumentsHelp = [];
  repo = new Repo(this);
  ghAuth = new GithubAuthToken(this);
  version = new Version(this)

  get summary() {
    return i`Acquire artifacts in the repository.`;
  }

  get description() {
    return [
      i`This allows the consumer to acquire (download and unpack) artifacts. Artifacts must be activated to be used.`,
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

    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple packages specified, but not an equal number of '--version=' switches. `);
      return false;
    }

    let failing = false;

    const artifacts = new Set<Artifact>();

    let n = 0;
    for (const identity of this.inputs) {
      const version = versions[n++];

      const artifact = await session.getArtifact(identity, version);
      if (!artifact) {
        error(`Unable to resolve artifact: \`${identity}/${version || '*'}\``);
        return false;
      }

      artifacts.add(artifact);
      await artifact.resolveDependencies(artifacts);
    }

    if (artifacts.size) {
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
    }

    log();

    if (failing) {
      warning(i`No artifacts are being acquired.`);
      return false;
    }

    if (await this.install(artifacts)) {
      log(i`Installation completed successfully`);
      return true;
    }

    return false;
  }

  async install(artifacts: Iterable<Artifact>) {
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
          force: this.commandLine.force,
          allLanguages: this.commandLine.allLanguages,
          language: this.commandLine.language,
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
}
