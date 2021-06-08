/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Artifact, i } from '@microsoft/cella.core';
import { MultiBar, SingleBar } from 'cli-progress';
import { getRepository, installArtifacts, selectArtifacts, showArtifacts } from '../artifacts';
import { Command } from '../command';
import { error, formatName, log, warning } from '../styling';
import { GithubAuthToken } from '../switches/auth';
import { Repo } from '../switches/repo';
import { Version } from '../switches/version';

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
    if (this.inputs.length === 0) {
      error(i`No artifacts specified.`);
      return false;
    }

    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple packages specified, but not an equal number of '--version=' switches. `);
      return false;
    }

    const repository = await getRepository();
    if (!repository) {
      // the repository isn't functional
      return false;
    }

    let failing = false;

    const artifacts = await selectArtifacts(this.inputs, this.version.values);

    if (!artifacts) {
      return false;
    }

    failing = await showArtifacts(artifacts);

    if (failing) {
      warning(i`No artifacts are being acquired.`);
      return false;
    }

    if (await installArtifacts(artifacts, { force: this.commandLine.force })) {
      log(i`Installation completed successfuly`);
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
