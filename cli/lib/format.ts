/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Uri } from '@microsoft/cella.core';
import { bold, cyan, gray, green, greenBright, grey, underline, whiteBright, yellowBright } from 'chalk';

export function projectFile(uri: Uri): string {
  return cyan(uri.fsPath);
}

export function artifactIdentity(identity: string, alias?: string) {
  if (alias) {
    return `${identity.substr(0, identity.length - alias.length)}${yellowBright(alias)}`;
  }
  return yellowBright(identity);
}

export function artifactReference(identity: string, version: string) {
  return `${artifactIdentity(identity)}-v${gray(version)}`;
}

export function heading(text: string, level = 1) {
  switch (level) {
    case 1:
      return `${underline.bold(text)}\n`;
    case 2:
      return `${greenBright(text)}\n`;
    case 3:
      return `${green(text)}\n`;
  }
  return `${bold(text)}\n`;
}

export function optional(text: string) {
  return gray(text);
}
export function cmdSwitch(text: string) {
  return optional(`--${text}`);
}

export function command(text: string) {
  return whiteBright.bold(text);
}

export function hint(text: string) {
  return green.dim(text);
}

export function count(num: number) {
  return grey(`${num}`);
}

export function position(text: string) {
  return grey(`${text}`);
}