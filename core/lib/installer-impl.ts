import { acquireArtifactFile, AcquireEvents, AcquireOptions, nuget } from './acquire';
import { OutputOptions, TarBzUnpacker, TarGzUnpacker, TarUnpacker, Unpacker, UnpackEvents, ZipUnpacker } from './archive';
import { Installer, Nupkg, UnpackSettings, UnTar, UnZip, Verifiable } from './metadata-format';
import { Session } from './session';
import { Uri } from './uri';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface InstallArtifactInfo {
  readonly name: string;
  readonly targetLocation: Uri;
}

function artifactFileName(artifact: InstallArtifactInfo, install: Installer, extension: string) : string {
  let result = artifact.name;
  if (install.nametag) {
    result += '-';
    result += install.nametag;
  }

  if (install.lang) {
    result += '-';
    result += install.lang;
  }

  result += extension;
  return result;
}

function applyAcquireOptions(options: AcquireOptions, install: Verifiable) : AcquireOptions {
  if (install.sha256) {
    return {...options, algorithm: 'sha256', value: install.sha256};
  }

  if (install.md5) {
    return {...options, algorithm: 'md5', value: install.md5};
  }

  return options;
}

function applyUnpackOptions(options: OutputOptions, install: UnpackSettings) : OutputOptions {
  return {...options, strip: install.strip, transform: install.transform ? [...install.transform] : undefined };
}

export async function installNuGet(session: Session, artifact: InstallArtifactInfo, install: Nupkg, options: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
  const targetFile = `${artifact.name}.zip`;
  const file = await nuget(
    session,
    install.location,
    targetFile,
    applyAcquireOptions(options,install));
  return new ZipUnpacker(session).unpack(
    file,
    artifact.targetLocation,
    applyUnpackOptions(options,install));
}


async function acquireInstallArtifactFile(session: Session, targetFile: string, locations: Array<string>, options: AcquireOptions, install: Verifiable) {
  const file = await acquireArtifactFile(
    session,
    locations.map(each => session.fileSystem.parse(each)),
    targetFile,
    applyAcquireOptions(options,install));
  return file;
}

export async function installUnTar(session: Session, artifact: InstallArtifactInfo, install: UnTar, options: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
  const file = await acquireInstallArtifactFile(session, artifactFileName(artifact, install, '.tar'), install.location, options, install);
  const x = await file.readBlock(0, 128);
  let unpacker : Unpacker;
  if (x[0] === 0x1f && x[1] === 0x8b) {
    unpacker = new TarGzUnpacker(session);
  } else if (x[0] === 66 && x[1] === 90) {
    unpacker = new TarBzUnpacker(session);
  } else {
    unpacker = new TarUnpacker(session);
  }

  return unpacker.unpack(file,artifact.targetLocation, applyUnpackOptions(options,install));
}

export async function installUnZip(session: Session, artifact: InstallArtifactInfo, install: UnZip, options: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
  const file = await acquireInstallArtifactFile(session, artifactFileName(artifact, install, '.zip'), install.location, options, install);
  await new ZipUnpacker(session).unpack(
    file,
    artifact.targetLocation,
    applyUnpackOptions(options,install));
}
