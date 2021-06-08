/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Environment, i, intersect } from '@microsoft/cella.core';
import { strict } from 'assert';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { Command } from './command';

export type switches = {
  [key: string]: Array<string>;
}

export interface Help {
  readonly help: Array<string>;
  readonly title: string;
}

class Ctx {


  constructor(cmdline: CommandLine) {
    this.os =
      cmdline.isSet('windows') ? 'win32' :
        cmdline.isSet('osx') ? 'darwin' :
          cmdline.isSet('linux') ? 'linux' :
            cmdline.isSet('freebsd') ? 'freebsd' :
              process.platform;
    this.arch = cmdline.isSet('x64') ? 'x64' :
      cmdline.isSet('x86') ? 'x32' :
        cmdline.isSet('arm') ? 'arm' :
          cmdline.isSet('arm64') ? 'arm64' :
            process.arch;
  }

  readonly os: string;
  readonly arch: string;

  get windows(): boolean {
    return this.os === 'win32';
  }

  get linux(): boolean {
    return this.os === 'linux';
  }

  get freebsd(): boolean {
    return this.os === 'freebsd';
  }

  get osx(): boolean {
    return this.os === 'darwin';
  }

  get x64(): boolean {
    return this.arch === 'x64';
  }

  get x86(): boolean {
    return this.arch === 'x32';
  }

  get arm(): boolean {
    return this.arch === 'arm';
  }

  get arm64(): boolean {
    return this.arch === 'arm64';
  }
}

export function resolvePath(v: string | undefined) {
  return v?.startsWith('.') ? resolve(v) : v;
}

export class CommandLine {
  readonly commands = new Array<Command>();
  readonly inputs = new Array<string>();
  readonly switches: switches = {};
  readonly context: Ctx & switches;

  #home?: string;
  get cella_home() {
    // home folder is determined by
    // command line (--cella-home, --cella_home)
    // environment (CELLA_HOME)
    // default 1 $HOME/.cella
    // default 2 <tmpdir>/.cella

    // note, this does not create the folder, that would happen when the session is initialized.

    return this.#home || (this.#home = resolvePath(this.switches['cella-home']?.[0] || this.switches['cella_home']?.[0] || process.env['CELLA_HOME'] || join(process.env['HOME'] || tmpdir(), '.cella')));
  }

  get repositoryFolder() {
    return resolvePath(this.switches['repo']?.[0] || this.switches['repository']?.[0] || undefined);
  }

  get force() {
    return !!this.switches['force'];
  }

  #githubAuthToken?: string;
  get githubAuthToken() {
    return this.#githubAuthToken || (this.#githubAuthToken = this.switches['github_auth_token']?.[0] || this.switches['github-auth-token']?.[0] || process.env['github-auth-token'] || process.env['github_auth_token'] || '');
  }

  get debug() {
    return !!this.switches['debug'];
  }

  get language() {
    const l = this.switches['language'] || [];
    strict.ok((l?.length || 0) < 2, i`Expected a single value for '--${'language'}' -- found multiple.`);
    return l[0] || Intl.DateTimeFormat().resolvedOptions().locale;
  }

  get allLanguages() : boolean {
    const l = this.switches['all-languages'] || [];
    strict.ok((l?.length || 0) < 2, i`Expected a single value for '--${'all-languages'}' -- found multiple.`);
    return !!l[0];
  }

  #environment?: Environment;
  get environment(): Environment {
    return this.#environment || (this.#environment = intersect(this, process.env, ['constructor', 'environment']));
  }

  isSet(sw: string) {
    const s = this.switches[sw];
    if (s && s.last !== 'false') {
      return true;
    }
    return false;
  }

  claim(sw: string) {
    const v = this.switches[sw];
    delete this.switches[sw];
    return v;
  }

  addCommand(command: Command) {
    this.commands.push(command);
  }

  /** parses the command line and returns the command that has been requested */
  get command() {
    return this.commands.find(cmd => cmd.command === this.inputs[0] || !!cmd.aliases.find(alias => alias === this.inputs[0]));
  }

  constructor(args: Array<string>) {
    for (const each of args) {
      // --name
      // --name:value
      // --name=value
      const [, name, value] = /^--([^=:]+)[=:]?(.+)?$/g.exec(each) || [];
      if (name) {
        this.switches[name] = this.switches[name] === undefined ? [] : this.switches[name];
        this.switches[name].push(value);
        continue;
      }

      this.inputs.push(each);
    }
    this.context = intersect(new Ctx(this), this.switches);
  }
}

