/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { acquireArtifactFile, buildIdPackageLookupTable, FileType, FlatVsManPayload, i, parseConfiguration, parseVsManFromChannel, Session, templateAmfApplyVsManifestInformation, Uri } from '@microsoft/cella.core';
import { session } from '../../main';
import { Command } from '../command';
import { log } from '../styling';
import { Switch } from '../switch';

class ChannelUri extends Switch {
  readonly switch = 'channel';

  get help() {
    return [
      i`The URI to the Visual Studio channel to apply.`
    ];
  }
}

class RepoRoot extends Switch {
  readonly switch = 'repo';

  get help() {
    return [
      i`The directory path to the root of the repo into which artifact metadata is to be generated.`
    ];
  }
}

export class ApplyVsManCommand extends Command {
  readonly command = 'z-apply-vsman';
  readonly seeAlso = [];
  readonly argumentsHelp = [];
  readonly aliases = [];

  readonly channelUri = new ChannelUri(this);
  readonly repoRoot = new RepoRoot(this);

  get summary() {
    return i`Apply Visual Studio Channel (.vsman) information to a prototypical artifact metadata.`;
  }

  get description() {
    return [
      i`This is used to mint artifacts metadata exactly corresponding to a release state in a Visual Studio channel.`,
    ];
  }

  /**
   * Process an input file.
   */
  static async processFile(session: Session, inputUri: Uri, repoRoot: Uri, vsManLookup: Map<string, Array<FlatVsManPayload>>) {
    const inputPath = inputUri.fsPath;
    session.channels.message(i`Processing ${inputPath}...`);
    const inputContent = session.utf8(await inputUri.readFile());
    const outputContent = templateAmfApplyVsManifestInformation(session, inputPath, inputContent, vsManLookup);
    if (!outputContent) {
      session.channels.warning(i`Skipped processing ${inputPath}`);
      return;
    }

    const outputAmf = parseConfiguration(inputPath, outputContent);
    if (!outputAmf.isValid) {
      const errors = outputAmf.validationErrors.join('\n');
      session.channels.warning(i`After transformation, ${inputPath} did not result in a valid AMF; skipping:\n${outputContent}\n${errors}`);
      return;
    }

    const outputId = outputAmf.info.id;
    const outputIdLast = outputId.slice(outputId.lastIndexOf('/'));
    const outputVersion = outputAmf.info.version;
    const outputRelativePath = `${outputId}/${outputIdLast}-${outputVersion}.yaml`;
    const outputFullPath = repoRoot.join(outputRelativePath);
    if (await outputFullPath.exists()) {
      session.channels.warning(i`After transformation, ${inputPath} results in ${outputFullPath.toString()} which already exists; overwriting.`);
    }

    await outputFullPath.writeFile(Buffer.from(outputContent, 'utf-8'));
    session.channels.message(i`-> ${outputFullPath.toString()}`);
  }

  /**
   * Process an input file or directory, recursively.
   */
  static async processInput(session: Session, inputDirectoryEntry: [Uri, FileType], repoRoot: Uri, vsManLookup: Map<string, Array<FlatVsManPayload>>) {
    if ((inputDirectoryEntry[1] & FileType.Directory) !== 0) {
      for (const child of await inputDirectoryEntry[0].readDirectory()) {
        await ApplyVsManCommand.processInput(session, child, repoRoot, vsManLookup);
      }
    } else if ((inputDirectoryEntry[1] & FileType.File) !== 0) {
      await ApplyVsManCommand.processFile(session, inputDirectoryEntry[0], repoRoot, vsManLookup);
    }
  }

  async run() {
    const channelUriStr = this.channelUri.requiredValue;
    const repoRoot = session.fileSystem.file(this.repoRoot.requiredValue);
    log(i`Downloading channel manifest from ${channelUriStr}`);
    const channelUriUri = session.fileSystem.parse(channelUriStr);
    const channelFile = await acquireArtifactFile(session, [channelUriUri], 'channel.chman');
    const vsManPayload = parseVsManFromChannel(session.utf8(await channelFile.readFile()));
    log(i`Downloading Visual Studio manifest version ${vsManPayload.version} (${vsManPayload.url})`);
    const vsManUri = await acquireArtifactFile(session, [session.fileSystem.parse(vsManPayload.url)], vsManPayload.fileName);
    const vsManLookup = buildIdPackageLookupTable(session.utf8(await vsManUri.readFile()));
    for (const inputPath of this.inputs) {
      const inputUri = session.fileSystem.file(inputPath);
      const inputStat = await inputUri.stat();
      await ApplyVsManCommand.processInput(session, [inputUri, inputStat.type], repoRoot, vsManLookup);
    }

    return true;
  }
}