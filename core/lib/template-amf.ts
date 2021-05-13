/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from 'console';
import { isMap, isPair, isScalar, isSeq, LineCounter, Pair, parseDocument, YAMLMap, YAMLSeq } from 'yaml';
import { i } from './i18n';
import { Session } from './session';
import { FlatVsManPayload } from './willow';

// Replaces adopt-vsix-version-from-id in in the "info" block of the AMF denoted by inputRootMap,
// if any, with a real version derived from vsManLookup.
// Returns whether unrecoverable errors occurred.
function replaceAdoptVsixVersionFromId(session: Session, inputPath: string,
  inputRootMap : YAMLMap, vsManLookup: Map<string, Array<FlatVsManPayload>>) : boolean {
  const inputInfoMap = inputRootMap.get('info');
  if (!isMap(inputInfoMap)) {
    session.channels.error(i`${inputPath} is missing an 'info' map.`);
    return true;
  }

  const inputInfoMapCount = inputInfoMap.items.length;
  for (let idx = 0; idx < inputInfoMapCount; ++idx) {
    const inputInfoEntry = inputInfoMap.items[idx];
    if (!isPair(inputInfoEntry)) {
      continue;
    }

    if (!isScalar(inputInfoEntry.key) || inputInfoEntry.key.value !== 'adopt-vsix-version-from-id') {
      continue;
    }

    if (!isScalar(inputInfoEntry.value) || typeof inputInfoEntry.value.value !== 'string') {
      session.channels.error(i`${inputPath} use of adopt-vsix-version-from-id was not an id string`);
      return true;
    }

    const inputAdoptVersionId = inputInfoEntry.value.value;
    const adoptedVersionSource = vsManLookup.get(inputAdoptVersionId);
    if (!adoptedVersionSource) {
      session.channels.error(i`${inputPath} use of adopt-vsix-version-from-id (${inputAdoptVersionId}) names an ID not present in the Visual Studio manifest.`);
      return true;
    }

    assert(adoptedVersionSource.length >= 1);
    const adoptedVersion = adoptedVersionSource[0].version;
    if (adoptedVersionSource.length != 1) {
      session.channels.warning(i`${inputPath} use of adopt-vsix-version-from-id (${inputAdoptVersionId}) names an ID with more than one package in the Visual Studio manifest; choosing first version '${adoptedVersion}'.`);
    }

    inputInfoMap.items[idx] = new Pair('version', adoptedVersion);
  }

  return false;
}

function transformVsixMapToUnzipMaps(session: Session, inputPath: string,
  maybeVsixMap: YAMLMap, vsManLookup: Map<string, Array<FlatVsManPayload>>): Array<YAMLMap> | undefined {
  const vsixId = maybeVsixMap.get('vsix');
  if (typeof vsixId !== 'string') {
    return [maybeVsixMap]; // make no changes
  }

  const strip = maybeVsixMap.get('strip');
  const vsixSource = vsManLookup.get(vsixId);
  if (!vsixSource || vsixSource.length === 0 || !vsixSource[0]) {
    session.channels.error(i`${inputPath} use of install vsix, named ID ${vsixId} was not present in the Visual Studio manifest.`);
    return undefined;
  }

  if (vsixSource.length === 1) {
    const asUnzip = new YAMLMap();
    const soleSource = vsixSource[0];
    asUnzip.add(new Pair('unzip', soleSource.url));
    asUnzip.add(new Pair('sha256', soleSource.sha256));
    asUnzip.add(new Pair('local-alternate', soleSource.localPath));
    if (strip) {
      asUnzip.add(new Pair('strip', strip));
    }

    return [asUnzip];
  }

  const langMap = new Map<string, FlatVsManPayload>();
  for (const langVsix of vsixSource) {
    const language = langVsix.language;
    if (!language) {
      session.channels.error(i`${inputPath} use of install vsix, named ID ${vsixId} had multiple packages in the Visual Studio manifest, but not all packages had language set.`);
      return undefined;
    }

    if (langMap.has(language)) {
      session.channels.error(i`${inputPath} use of install vsix, named ID ${vsixId} had multiple matches for the same language.`);
      return undefined;
    }

    langMap.set(language, langVsix);
  }

  const result = new Array<YAMLMap>();
  for (const entry of langMap) {
    const asUnzip = new YAMLMap();
    asUnzip.add(new Pair('unzip', entry[1].url));
    asUnzip.add(new Pair('sha256', entry[1].sha256));
    asUnzip.add(new Pair('lang', entry[0]));
    asUnzip.add(new Pair('local-alternate', entry[1].localPath));
    if (strip) {
      asUnzip.add(new Pair('strip', strip));
    }

    result.push(asUnzip);
  }

  return result;
}

function templateAmfProcessInstallCandidate(session : Session, inputPath: string,
  vsManLookup: Map<string, Array<FlatVsManPayload>>, installParent: YAMLMap) : boolean {
  const replacement = new Array<YAMLMap>();
  const installNode = installParent.get('install');
  if (isMap(installNode)) {
    const candidates = transformVsixMapToUnzipMaps(session, inputPath, installNode, vsManLookup);
    if (!candidates) {
      return false;
    }

    for (const candidate of candidates) {
      replacement.push(candidate);
    }
  } else if (isSeq(installNode)) {
    for (const item of installNode.items) {
      if (!isMap(item)) {
        return true;
      }

      const candidates = transformVsixMapToUnzipMaps(session, inputPath, item, vsManLookup);
      if (!candidates) {
        return false;
      }

      for (const candidate of candidates) {
        replacement.push(candidate);
      }
    }
  } else {
    return false;
  }

  if (replacement.length === 1) {
    installParent.set('install', replacement[0]);
  } else {
    const inserted = new YAMLSeq();
    for (const entry of replacement) {
      inserted.add(entry);
    }

    installParent.set('install', inserted);
  }

  return false;
}

export function templateAmfApplyVsManifestInformation(
  session : Session, inputPath: string, inputContent: string,
  vsManLookup: Map<string, Array<FlatVsManPayload>>): string | undefined {
  const genericErrorMessage = i`Failed to interpret ${inputPath} as an AMF template.`;
  const lc = new LineCounter();
  const inputDom = parseDocument(inputContent, { prettyErrors: false, lineCounter: lc, strict: true });
  if (inputDom.errors.length !== 0) {
    session.channels.error(i`Failed to parse ${inputPath} as a YAML document: ${JSON.stringify(inputDom.errors)}`);
    return undefined;
  }

  if (inputDom.warnings.length !== 0) {
    session.channels.warning(i`YAML warnings when parsing ${inputPath}: ${JSON.stringify(inputDom.warnings)}`);
  }

  if (!isMap(inputDom.contents)) {
    session.channels.error(genericErrorMessage);
    return undefined;
  }

  const inputRootMap = <YAMLMap>inputDom.contents;

  // replace any adopt-vsix-version-from-id nodes with the real versions
  if (replaceAdoptVsixVersionFromId(session, inputPath, inputRootMap, vsManLookup)) {
    return undefined;
  }

  // replace any demands with "vsix" sources inside with real https sources
  if (templateAmfProcessInstallCandidate(session, inputPath, vsManLookup, inputRootMap)) {
    return undefined;
  }

  for (const demand of inputRootMap.items) {
    if (!isPair(demand)) {
      session.channels.error(genericErrorMessage);
      return undefined;
    }

    const demandKey = demand.key;
    if (!isScalar(demandKey)) {
      session.channels.error(genericErrorMessage);
      return undefined;
    }

    const demandKeyValue = demandKey.value;
    if (typeof demandKeyValue !== 'string') {
      session.channels.error(genericErrorMessage);
      return undefined;
    }

    const demandContents = demand.value;
    if (demandKeyValue === 'info' || demandKeyValue == 'contacts' || !isMap(demandContents)) {
      continue;
    }

    if (templateAmfProcessInstallCandidate(session, inputPath, vsManLookup, demandContents)) {
      return undefined;
    }
  }

  return inputDom.toString();
}
