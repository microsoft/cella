/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { i } from './i18n';

export interface VsPayload {
  readonly fileName: string;
  readonly sha256: string;
  readonly size: number;
  readonly url: string;
}

export interface ChManDef {
  readonly payloads: Array<VsPayload>;
  readonly type: string;
  readonly version: string;
}

export interface FlatChManPayload extends VsPayload {
  readonly version: string;
}

export interface FlatVsManPayload extends VsPayload {
  readonly id: string;
  readonly version: string;
  readonly language: string | undefined;
  readonly installSize: number;
  readonly localPath: string;
}

function throwUnexpectedManifest() : never {
  throw new Error(i`Unexpected format for Visual Studio manifest in channel.`);
}

function isPayload(candidatePayload: any) {
  return typeof candidatePayload.fileName === 'string'
    && typeof candidatePayload.sha256 === 'string'
    && candidatePayload.sha256.length === 64
    && typeof candidatePayload.size === 'number'
    && typeof candidatePayload.url === 'string';
}

export function parseVsManFromChannel(channelManifestContent: string): FlatChManPayload {
  const chMan = JSON.parse(channelManifestContent);
  const channelItemsRaw = chMan?.channelItems;
  if (chMan.manifestVersion !== '1.1' || !Array.isArray(channelItemsRaw)) {
    throw new Error(i`Unexpected Visual Studio channel manifest version.`);
  }

  let vsManItem : ChManDef | undefined = undefined;
  for (const channelItem of channelItemsRaw) {
    if (channelItem?.id === 'Microsoft.VisualStudio.Manifests.VisualStudio') {
      if (vsManItem === undefined) {
        vsManItem = <ChManDef>channelItem;
      } else {
        throwUnexpectedManifest();
      }
    }
  }

  if (!vsManItem) {
    throwUnexpectedManifest();
  }

  if (!Array.isArray(vsManItem.payloads)
    || vsManItem.type !== 'Manifest'
    || typeof vsManItem.version !== 'string'
    || vsManItem.payloads.length !== 1
    || !isPayload(vsManItem.payloads[0])) {
    throwUnexpectedManifest();
  }

  return { ...vsManItem.payloads[0], version: vsManItem.version };
}

function flattenVsManPackage(rawJson: any): FlatVsManPayload | undefined {
  if (typeof rawJson.id !== 'string'
    || typeof rawJson.version !== 'string'
    || rawJson.type !== 'Vsix'
    || !Array.isArray(rawJson.payloads)
    || rawJson.payloads.length !== 1
    || !isPayload(rawJson.payloads[0])
    || typeof(rawJson.installSizes) !== 'object'
    || typeof(rawJson.installSizes.targetDrive) !== 'number') {
    return undefined;
  }

  let language : string | undefined;
  if (typeof(rawJson.language) === 'string') {
    language = rawJson.language;
  }

  const thePayload = rawJson.payloads[0];
  const theId = <string>rawJson.id;
  const theVersion = <string>rawJson.version;
  let chip : string | undefined;
  if (typeof(rawJson.chip) === 'string') {
    chip = rawJson.chip;
  }

  let localPath = `$ENV{PROGRAMDATA}/Microsoft/VisualStudio/Packages/${theId},version=${theVersion}`;
  if (chip) {
    localPath += `,chip=${chip}`;
  }

  if (language) {
    localPath += `,language=${language}`;
  }

  localPath += '/payload.vsix';

  return {
    fileName: <string>thePayload.fileName,
    sha256: <string>thePayload.sha256,
    size: <number>thePayload.size,
    url: <string>thePayload.url,
    id: theId,
    version: theVersion,
    language: language,
    installSize: <number>rawJson.installSizes.targetDrive,
    localPath: localPath
  };
}

export function buildIdPackageLookupTable(vsManContent: string): Map<string, Array<FlatVsManPayload>> {
  const vsMan = JSON.parse(vsManContent);
  const result = new Map<string, Array<FlatVsManPayload>>();
  if (!Array.isArray(vsMan.packages)) {
    throwUnexpectedManifest();
  }

  for (const p of vsMan.packages) {
    const flattened = flattenVsManPackage(p);
    if (flattened) {
      const id = flattened.id;
      const existing = result.get(id);
      if (existing) {
        existing.push(flattened);
      } else {
        result.set(id, [flattened]);
      }
    }
  }

  return result;
}
