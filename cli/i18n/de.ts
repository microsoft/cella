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
  },
  'Find artifacts in the repository.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Find artifacts in the repository.')
    return 'Finden Sie Artefakte im Repository.';
  },
  'This allows the user to find artifacts based on some criteria.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('This allows the user to find artifacts based on some criteria.')
    return 'Dies ermöglicht es dem Benutzer, Artefakte basierend auf bestimmten Kriterien zu finden.';
  },
  'Artifact repository data is not loaded.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Artifact repository data is not loaded.')
    return 'Artefakt-Repository-Daten werden nicht geladen.';
  },
  'Attempting to update artifact repository.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Attempting to update artifact repository.')
    return 'Versuch, das Artefakt-Repository zu aktualisieren.';
  },
  'Unable to load repository index.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Unable to load repository index.')
    return 'Repository-Index kann nicht geladen werden.';
  },
  'regenerate the index for a repository': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('regenerate the index for a repository')
    return 'Regenerieren des Indexes für ein Repository';
  },
  'This allows the user to regenerate the index.yaml files for a ${0} repository.': (cli: 'cella') => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`This allows the user to regenerate the index.yaml files for a ${cli} repository.`)
    return `Dadurch kann der Benutzer die index.yaml-Dateien für ein ${cli}-Repository regenerieren.`;
  },
  'Regenerating index.yaml file for the repository at ${0}': (p0: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Regenerating index.yaml file for the repository at ${p0}`)
    return `Regenerieren der index.yaml-Datei für das Repository bei ${p0}`;
  },
  'Regeneration complete. Index contains ${0} metadata files.': (p0: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Regeneration complete. Index contains ${p0} metadata files.`)
    return `Regeneration abgeschlossen. Index enthält ${p0} Metadatendateien.`;
  },
  'update the repository from the remote': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('update the repository from the remote')
    return 'Aktualisieren des Repositorys von der Fernbedienung';
  },
  'This downloads the latest contents of the repository from github.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('This downloads the latest contents of the repository from github.')
    return 'Dadurch werden die neuesten Inhalte des Repositorys von github heruntergeladen.';
  },
  'Downloading repository data': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Downloading repository data')
    return 'Repository-Daten herunterladen';
  },
  'Repository update complete. Repository contains \\`${0}\\` metadata files.': (p0: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Repository update complete. Repository contains \`${p0}\` metadata files.`)
    return `Repository-Aktualisierung abgeschlossen. Das Repository enthält Metadatendateien von ''${p0}''.`;
  },
  'Unable to download repository snapshot.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Unable to download repository snapshot.')
    return 'Repository-Snapshot kann nicht heruntergeladen werden.';
  },
  'override the path to the repository': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('override the path to the repository')
    return 'überschreiben sie den Pfad zum Repository';
  },
  'a version or version range to match': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('a version or version range to match')
    return 'eine Version oder ein entsprechender Versionsbereich';
  },
  'Expected a single value for \'--${0}\' -- found multiple.': (p0: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Expected a single value for '--${p0}' -- found multiple.`)
    return `Erwartet einen einzelnen Wert für '--${p0}' -- gefunden mehrere.`;
  },
  'Acquire artifacts in the repository.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Acquire artifacts in the repository.')
    return 'Erwerben Sie Artefakte im Repository.';
  },
  'This allows the consumer to acquire (download and unpack) artifacts. Artifacts must be activated to be used.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('This allows the consumer to acquire (download and unpack) artifacts. Artifacts must be activated to be used.')
    return 'Dies ermöglicht es dem Verbraucher, Artefakte zu erwerben (herunterladen und zu entpacken). Artefakte müssen aktiviert werden, um verwendet zu werden.';
  },
  'Multiple packages specified, but not an equal number of \'--verison=\' switches. ': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Multiple packages specified, but not an equal number of \'--verison=\' switches. ')
    return 'Mehrere Pakete angegeben, aber nicht eine gleiche Anzahl von Schaltern von \'--verison=\'. ';
  },
  'Artifact identity \'${0}\' could not be found.': (each: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Artifact identity '${each}' could not be found.`)
    return `Artefaktidentität '${each}' konnte nicht gefunden werden.`;
  },
  'Artifact identity \'${0}\' matched more than one result. This should never happen.': (each: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Artifact identity '${each}' matched more than one result. This should never happen.`)
    return `Artefaktidentität '${each}' stimmte mit mehr als einem Ergebnis überein. Das darf niemals geschehen.`;
  },
  'Artifact': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Artifact')
    return 'Artefakt';
  },
  'Version': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Version')
    return 'Version';
  },
  'Summary': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Summary')
    return 'Zusammenfassung';
  },
  'No artifacts are being acquired.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('No artifacts are being acquired.')
    return 'Es werden keine Artefakte erworben.';
  },
  'verified': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('verified')
    return 'verifiziert';
  },
  'verifying': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('verifying')
    return 'Verifizieren';
  },
  'downloading': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('downloading')
    return 'Herunterladen';
  },
  'unpacking': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('unpacking')
    return 'Auspacken';
  },
  'unpacked': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('unpacked')
    return 'ausgepackt';
  },
  'Installation completed successfuly': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Installation completed successfuly')
    return 'Installation erfolgreich abgeschlossen';
  },
  'Manages the download cache.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Manages the download cache.')
    return 'Verwaltet den Download-Cache.';
  },
  'Cache folder cleared (${0}) ': (p0: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Cache folder cleared (${p0}) `)
    return `Cache-Ordner gelöscht (${p0}) `;
  },
  'Deletes an artifact from the artifact folder.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('Deletes an artifact from the artifact folder.')
    return 'Löscht ein Artefakt aus dem Artefaktordner.';
  },
  'This allows the consumer to remove an artifact from disk.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('This allows the consumer to remove an artifact from disk.')
    return 'Dadurch kann der Verbraucher ein Artefakt vom Datenträger entfernen.';
  },
  'Deleting artifact ${0} from ${1}': (id: string, p1: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`Deleting artifact ${id} from ${p1}`)
    return `Artefakt ${id} von ${p1} löschen`;
  },
  'This downloads the latest contents of the repository from the remote service.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('This downloads the latest contents of the repository from the remote service.')
    return 'Dadurch werden die neuesten Inhalte des Repositorys vom Remotedienst heruntergeladen.';
  },
  'specify a github authentication token to access protected github repositories/urls': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('specify a github authentication token to access protected github repositories/urls')
    return 'Geben Sie ein Github-Authentifizierungstoken an, um auf geschützte Github-Repositorys/URls zuzugreifen';
  },
  'removes all files in the local cache.': () => {
    // autotranslated using Azure Translator via 'translate-strings' tool ('removes all files in the local cache.')
    return 'entfernt alle Dateien im lokalen Cache.';
  }
};
