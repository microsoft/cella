/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { acquireArtifactFile, buildIdPackageLookupTable, i, parseConfiguration, parseVsManFromChannel, templateAmfApplyVsManifestInformation } from '@microsoft/cella.core';
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

  async run() {
    const channelUriStr = this.channelUri.requiredValue;
    const repoRoot = session.fileSystem.file(this.repoRoot.requiredValue);
    log(i`Downloading channel manifest from ${channelUriStr}`);
    const channelUriUri = session.fileSystem.parse(channelUriStr);
    const channelFile = await acquireArtifactFile(session, [channelUriUri], 'channel.chman');
    const vsManPayload = parseVsManFromChannel((await channelFile.readFile()).toString());
    log(i`Downloading Visual Studio manifest version ${vsManPayload.version} (${vsManPayload.url})`);
    const vsManUri = await acquireArtifactFile(session, [session.fileSystem.parse(vsManPayload.url)], vsManPayload.fileName);
    const vsManLookup = buildIdPackageLookupTable((await vsManUri.readFile()).toString());
    for (const inputPath of this.inputs) {
      session.channels.message(i`Processing ${inputPath}...`);
      const inputUri = session.fileSystem.file(inputPath);
      const inputContent = (await inputUri.readFile()).toString();
      const outputContent = templateAmfApplyVsManifestInformation(session, inputPath, inputContent, vsManLookup);
      if (!outputContent) {
        session.channels.warning(i`Skipped processing ${inputPath}`);
        continue;
      }

      const outputAmf = parseConfiguration(inputPath, outputContent);
      if (!outputAmf.isValid) {
        const errors = outputAmf.validationErrors.join('\n');
        session.channels.warning(i`After transformation, ${inputPath} did not result in a valid AMF; skipping:\n${outputContent}\n${errors}`);
        continue;
      }

      const outputId = outputAmf.info.id;
      const outputIdLast = outputId.slice(outputId.lastIndexOf('/'));
      const outputVersion = outputAmf.info.version;
      const outputRelativePath = `${outputId}/${outputIdLast}-${outputVersion}.yaml`;
      const outputFullPath = repoRoot.join(outputRelativePath);
      if (await outputFullPath.exists()) {
        session.channels.warning(i`After transformation, ${inputPath} results in ${outputFullPath.toString()} which already exists; skipping.`);
        continue;
      }

      session.channels.message(i`-> ${outputFullPath.toString()}`);
      await outputFullPath.writeFile(Buffer.from(outputContent, 'utf-8'));
      session.channels.message(i`done.`);
    }

    return true;
  }
}
