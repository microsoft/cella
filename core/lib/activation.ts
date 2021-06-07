/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { delimiter } from 'path';
import { linq } from './linq';
import { Uri } from './uri';

function mapSerializer(key: any, value: any) {
  return (value instanceof Map) ? { dataType: 'Map', value: Array.from(value.entries()) } : value;
}

function mapDeserializer(key: any, value: any) {
  return (typeof value === 'object' && value !== null && value.dataType === 'Map') ? new Map(value.value) : value;
}

export class Activation {
  toJSON() {
    return JSON.stringify(this, mapSerializer);
  }

  static fromJSON(text: string) {
    const v = JSON.parse(text, mapDeserializer);
    const result = new Activation();
    result.defines = v.defines;
    result.tools = v.tools;
    result.paths = v.paths;
    result.environment = v.environment;
    return result;
  }

  defines = new Map<string, string>();
  tools = new Map<string, Uri>();
  paths = new Map<string, Array<Uri>>();
  environment = new Map<string, Array<string>>();

  get Paths(): Array<[string, string]> {
    return [...linq.items(this.paths).select(([variable, values]) => <[string, string]>[variable, values.map(uri => uri.fsPath).join(delimiter)])];
  }

  get Variables() {
    // tools + environment
    const result = new Array<[string, string]>();

    // combine variables with spaces
    for (const [key, values] of this.environment) {
      result.push([key, values.join(' ')]);
    }

    // add tools to the list
    for (const [key, value] of this.tools) {
      result.push([key, value.fsPath]);
    }
    return result;
  }

  get Defines(): Array<[string, string]> {
    return linq.items(this.defines).toArray();
  }
}