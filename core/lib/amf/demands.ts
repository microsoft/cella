// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Demands, Settings, ValidationError } from '../metadata-format';
import { YamlObject } from '../yaml/YamlObject';
import { Installs } from './installer';
import { Requires } from './metadata-file';
import { SettingsNode } from './settings';

const hostFeatures = new Set<string>(['x64', 'x86', 'arm', 'arm64', 'windows', 'linux', 'osx', 'freebsd']);

export class DemandNode extends YamlObject implements Demands {

  /* Demands */
  settings: Settings = new SettingsNode(this);
  requires = new Requires(this);
  seeAlso = new Requires(this, 'seeAlso');
  install = new Installs(this);

  get error(): string | undefined {
    return <string>this.selfNode.get('error');
  }
  set error(errorMessage: string | undefined) {
    this.selfNode.set('error', errorMessage);
  }

  get warning(): string | undefined {
    return <string>this.self?.get('warning');
  }
  set warning(warningMessage: string | undefined) {
    this.selfNode.set('warning', warningMessage);
  }

  get message(): string | undefined {
    return <string>this.self?.get('message');
  }
  set message(message: string | undefined) {
    this.selfNode.set('message', message);
  }

  /** @internal */
  *validate(): Iterable<ValidationError> {
    yield* super.validate();
    if (this.self) {
      yield* this.settings.validate();
      yield* this.requires.validate();
      yield* this.seeAlso.validate();
      yield* this.install.validate();
    }
  }
}
