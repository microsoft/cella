/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
interface language { [key: string]: (...args: Array<any>) => string; }
export const map: language = {
  'core version: ${0}': (Version: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`core version: ${Version}`)
    return `Kernversion: ${Version}`;
  },
  '(C) Copyright 2021 Microsoft Corporation': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('(C) Copyright 2021 Microsoft Corporation')
    return '(C) Copyright 2021 Microsoft Corporation';
  }
};
