/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { i, Version } from '@microsoft/cella.core';
import { strict } from 'assert';
import { parse } from 'semver';
import { Version as cliVersion } from '../exports';
import { session } from '../main';
import { Command } from './command';
import { cli } from './constants';
import { Debug } from './debug';
import { debug, error, log } from './styling';
import { Switch } from './switch';

class Check extends Switch {
  switch = 'check';
  get help() {
    return [
      i`check to see if a newer version of ${cli} is available`
    ];
  }

}

class Update extends Switch {
  switch = 'update';
  get help() {
    return [
      i`will update the current installation of ${cli} if a newer version is available`
    ];
  }
}

export class VersionCommand extends Command {
  readonly command = 'version';
  seeAlso = [];
  argumentsHelp = [];
  check = new Check(this);
  update = new Update(this);
  debug = new Debug(this);

  versionUrl = session.fileSystem.parse('https://aka.ms/cella.version');

  get summary() {
    return i`manage the version of ${cli}`;
  }

  get description() {
    return [
      i`This allows the user to get the current verison information for ${cli}`,
      i`as well as checking if a new version is available, and can upgrade the current installation to the latest version.`,
    ];
  }

  private async getRemoteVersion() {
    const version = session.utf8(await session.fileSystem.readFile(this.versionUrl));
    const semver = parse(version);
    strict.ok(semver, i`Unable to parse version ${version}`);

    return semver;
  }

  async run() {
    if (this.update.active) {
      // check for a new version, and update if necessary
      debug(i`checking to see if there is a new version of the ${cli}, and updating if there is`);
      try {
        const semver = await this.getRemoteVersion();

        if (semver.compare(cliVersion) > 0) {
          // we can update the tool.
          debug('An update is available, we can install it. ');
          debug('(we can not do it yet, waiting for download support');
        }

      } catch (err) {
        error('Failed to get latest version number.');
        return false;
      }
      return true;
    }

    if (this.check.active) {
      // check for a new version
      debug(i`checking to see if there is a new version of the ${cli}`);
      try {
        const semver = await this.getRemoteVersion();

        if (semver.compare(cliVersion) > 0) {
          log(i`There is a new version (${semver.version}) of ${cli} available.`);
        }
        return true;
      } catch (err) {
        if (err instanceof Error) {
          error(i`Failed to get latest version number. (${err.message})`);
          log(err.stack || '');
        }
      }
      return false;
    }

    // dump version information
    log(i`${cli} version information\n`);
    log(i`  core version: ${Version} `);
    log(i`  cli version: ${cliVersion} `);
    return true;
  }

}