// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Dictionary } from '../lib/util/linq';

export const map: Dictionary<(...args: Array<any>) => string> = {
  'stats may not be undefined': () => {
    // autotranslated using Azure Translator ('stats may not be undefined')
    return 'Statistiken dürfen nicht undefiniert sein';
  },
  'Cannot rename files across filesystems': () => {
    // autotranslated using Azure Translator ('Cannot rename files across filesystems')
    return 'Dateien können nicht über Dateisysteme hinweg umbenennen';
  },
  'Uri may not be empty': () => {
    // autotranslated using Azure Translator ('Uri may not be empty')
    return 'Uri darf nicht leer sein';
  },
  'scheme \'${0}\' already registered.': (scheme: string) => {
    // autotranslated using Azure Translator (`scheme '${scheme}' already registered.`)
    return `Schema '${scheme}' bereits angemeldet.`;
  },
  'uri ${0} has no scheme': (uri: string) => {
    // autotranslated using Azure Translator (`uri ${uri} has no scheme`)
    return `uri ${uri} hat kein Schema`;
  },
  'scheme ${0} has no filesystem associated with it': (scheme: string | undefined) => {
    // autotranslated using Azure Translator (`scheme ${scheme} has no filesystem associated with it`)
    return `Schema ${scheme} ist kein Dateisystem zugeordnet`;
  },
  'may not rename across filesystems': () => {
    // autotranslated using Azure Translator ('may not rename across filesystems')
    return 'kann nicht zwischen Dateisystemen umbenennen';
  }
};
