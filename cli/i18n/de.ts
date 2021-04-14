/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

interface language { [key: string]: (...args: Array<any>) => string; }
export const map: language = {
  'core version: ${0}': (Version: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`core version: ${Version}`)
    return `Kernversion: ${Version}`;
  },
  '(C) Copyright Microsoft Corporation': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('(C) Copyright Microsoft Corporation')
    return '(C) Copyright Microsoft Corporation';
  },
  'Unrecognized command \'${0}\'.': (cmd: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Unrecognized command '${cmd}'.`)
    return `Unbekannter Befehl '${cmd}'.`;
  },
  'Use \\`${0} ${1}\\` ${2}': (cli: 'cella', p1: string, p2: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Use \`${cli} ${p1}\` ${p2}`)
    return `Verwenden Sie ''${cli} ${p1}'' ${p2}`;
  },

  'to get help': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('to get help')
    return 'um Hilfe zu bekommen';
  },
  '## Synopsis': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('## Synopsis')
    return '## Synopsis';
  },
  '### \\`${0}\\`': (p0: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`### \`${p0}\``)
    return `### '${p0}'`;
  },
  '## Description': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('## Description')
    return '## Beschreibung';
  },
  '## Switches': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('## Switches')
    return '## Schalter';
  },
  '## See Also': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('## See Also')
    return '## Siehe auch';
  },
  'enables debug mode, displays internal messsages about how ${0} works': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`enables debug mode, displays internal messsages about how ${cli} works`)
    return `aktiviert den Debug-Modus, zeigt interne Durcheinanderüberbrüche über die Funktionsweise von ${cli} an`;
  },
  'proceeds with the (potentially dangerous) action without confirmation': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('proceeds with the (potentially dangerous) action without confirmation')
    return 'geht mit der (potenziell gefährlichen) Aktion ohne Bestätigung vor';
  },
  'the name of the command for which you want help.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('the name of the command for which you want help.')
    return 'der Name des Befehls, für den Sie Hilfe benötigen.';
  },
  ' <${0}> : ${1}': (p0: string, p1: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (` <${p0}> : ${p1}`)
    return ` <${p0}> : ${p1}`;
  },
  'get help on ${0} or one of the commands': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`get help on ${cli} or one of the commands`)
    return `Hilfe zu ${cli} oder einem der Befehle erhalten`;
  },
  'Gets detailed help on ${0}, or one of the commands': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Gets detailed help on ${cli}, or one of the commands`)
    return `Ruft detaillierte Hilfe zu ${cli} oder einem der Befehle ab`;
  },
  'Arguments:': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Arguments:')
    return 'Argumente:';
  },
  'use \\`${0} ${1}\\` to get the list of available commands.': (cli: 'cella', p1: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`use \`${cli} ${p1}\` to get the list of available commands.`)
    return `Verwenden Sie ''${cli} ${p1}'', um die Liste der verfügbaren Befehle abrufbar zu machen.`;
  },
  '## Usage': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('## Usage')
    return '## Verwendung';
  },
  '${0} COMMAND <arguments> [--switches]': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`${cli} COMMAND <arguments> [--switches]`)
    return `${cli} COMMAND <arguments>[--schalter]`;
  },
  '## Available ${0} commands:': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`## Available ${cli} commands:`)
    return `## Verfügbare ${cli}-Befehle:`;
  },
  '\\`${0}\\` : ${1}': (p0: string, p1: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`\`${p0}\` : ${p1}`)
    return `\`${p0}\` : ${p1}`;
  },
  'check to see if a newer version of ${0} is available': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`check to see if a newer version of ${cli} is available`)
    return `Prüfen Sie, ob eine neuere Version von ${cli} verfügbar ist`;
  },
  'will update the current installation of ${0} if a newer version is available': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`will update the current installation of ${cli} if a newer version is available`)
    return `wird die aktuelle Installation von ${cli} aktualisieren, wenn eine neuere Version verfügbar ist`;
  },
  'manage the version of ${0}': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`manage the version of ${cli}`)
    return `Die Version von ${cli} verwalten`;
  },
  'This allows the user to get the current verison information for ${0}': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`This allows the user to get the current verison information for ${cli}`)
    return `Dies ermöglicht es dem Benutzer, die aktuellen Verison-Informationen für ${cli} zu erhalten`;
  },
  'as well as checking if a new version is available, and can upgrade the current installation to the latest version.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('as well as checking if a new version is available, and can upgrade the current installation to the latest version.')
    return 'sowie zu überprüfen, ob eine neue Version verfügbar ist, und kann die aktuelle Installation auf die neueste Version aktualisieren.';
  },
  'Unable to parse version ${0}': (version: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Unable to parse version ${version}`)
    return `Kann Version ${version} nicht analysieren`;
  },
  'checking to see if there is a new version of the ${0}, and updating if there is': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`checking to see if there is a new version of the ${cli}, and updating if there is`)
    return `Prüfen, ob es eine neue Version des ${cli} gibt, und Aktualisierung, falls vorhanden`;
  },
  'checking to see if there is a new version of the ${0}': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`checking to see if there is a new version of the ${cli}`)
    return `Prüfen, ob es eine neue Version des ${cli} gibt`;
  },
  'There is a new version (${0}) of ${1} available.': (p0: string, cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`There is a new version (${p0}) of ${cli} available.`)
    return `Es ist eine neue Version (${p0}) von ${cli} verfügbar.`;
  },
  'Failed to get latest version number. (${0})': (p0: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Failed to get latest version number. (${p0})`)
    return `Fehler beim Abrufen der neuesten Versionsnummer. (${p0})`;
  },
  '${0} version information\\n': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`${cli} version information\n`)
    return `${cli} Versionsinformationen`;
  },
  '  core version: ${0} ': (Version: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`  core version: ${Version} `)
    return ` Kernversion: ${Version} `;
  },
  '  cli version: ${0} ': (cliVersion: any) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`  cli version: ${cliVersion} `)
    return ` cli Version: ${cliVersion} `;
  }
};
