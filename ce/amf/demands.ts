// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Coerce } from '../yaml/Coerce';
import { Entity } from '../yaml/Entity';
import { EntityMap } from '../yaml/EntityMap';
import { Yaml, YAMLDictionary } from '../yaml/yaml-types';
import { Installs } from './installer';
import { Requires } from './Requires';
import { Settings } from './settings';

const hostFeatures = new Set<string>(['x64', 'x86', 'arm', 'arm64', 'windows', 'linux', 'osx', 'freebsd']);


export class Demands extends EntityMap<YAMLDictionary, DemandBlock> {
  constructor(node?: YAMLDictionary, parent?: Yaml, key?: string) {
    super(DemandBlock, node, parent, key);
  }
}

export class DemandBlock extends Entity {
  get error(): string | undefined { return Coerce.String(this.getMember('error')); }
  set error(value: string | undefined) { this.setMember('error', value); }

  get warning(): string | undefined { return Coerce.String(this.getMember('warning')); }
  set warning(value: string | undefined) { this.setMember('warning', value); }

  get message(): string | undefined { return Coerce.String(this.getMember('message')); }
  set message(value: string | undefined) { this.setMember('message', value); }

  seeAlso = new Requires(undefined, this, 'seeAlso');
  requires = new Requires(undefined, this, 'requires');

  settings = new Settings(undefined, this, 'settings');
  install = new Installs(undefined, this, 'install');
}


/*
export class DemandNode extends YamlObject implements Demands {

  /* Demands * /
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

  /** @internal * /
  override *validate(): Iterable<ValidationError> {
    yield* super.validate();
    if (this.self) {
      yield* this.settings.validate();
      yield* this.requires.validate();
      yield* this.seeAlso.validate();
      yield* this.install.validate();
    }
  }
}


export class ConditionalDemands extends ObjectDictionary<Demands> {
  constructor(parent: ParentNode, nodeName: string) {
    super(parent, nodeName, (k, v) => new DemandNode(this, k));
  }

  /** @internal * /
  override *validate(): Iterable<ValidationError> {
    for (const each of this.members) {
      const n = <YAMLSeq | YAMLMap | Scalar>each.key;
      if (!isMap(each.value) && !isSeq(each.value)) {

        yield {
          message: `Conditional Demand ${each.key} is not an object`,
          range: n.range || [0, 0, 0],
          category: ErrorKind.IncorrectType
        };
      }
    }

    for (const demand of this.values) {
      yield* demand.validate();
    }
  }
}*/