/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { YAMLMap } from 'yaml';
import { DictionaryOf, Settings, ValidationError } from '../metadata-format';
import { getOrCreateMap, getStrings, setStrings } from '../util/yaml';
import { DictionaryImpl, proxyDictionary } from './dictionary';

export class SettingsNode extends DictionaryImpl<any> implements Settings {
  /** @internal */
  constructor(node: YAMLMap) {
    super(node);
  }

  #paths!: DictionaryOf<Array<string>>;
  get paths(): DictionaryOf<Array<string>> {
    return this.#paths || (this.#paths = proxyDictionary<Array<string>>(getOrCreateMap(this.node, 'paths'), (m, p) => getStrings(m, p), setStrings));
  }

  #tools!: DictionaryOf<string>;
  get tools(): DictionaryOf<string> {
    return this.#tools || (this.#tools = <DictionaryOf<string>>proxyDictionary(getOrCreateMap(this.node, 'tools'), (m, p) => m.get(p), (m, p, v) => m.set(p, v)));
  }

  #variables!: DictionaryOf<Array<string>>;
  get variables(): DictionaryOf<Array<string>> {
    return this.#variables || (this.#variables = proxyDictionary<Array<string>>(getOrCreateMap(this.node, 'variables'), getStrings, setStrings));
  }

  #defines!: DictionaryOf<string>;
  get defines(): DictionaryOf<string> {
    return this.#defines || (this.#defines = <DictionaryOf<string>>proxyDictionary(getOrCreateMap(this.node, 'defines'), (m, p) => m.get(p), (m, p, v) => m.set(p, v)));
  }

  *validate(): Iterable<ValidationError> {
    //
  }

}
