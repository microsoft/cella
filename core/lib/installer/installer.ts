import { strict } from 'assert';
import { acquireArtifactFile, AcquireEvents, AcquireOptions, nuget } from '../acquire';
import { OutputOptions, TarBzUnpacker, TarGzUnpacker, TarUnpacker, Unpacker, UnpackEvents, ZipUnpacker } from '../archive';
import { Artifact } from '../artifact';
import { Nupkg, ResourceLocation, UnpackSettings, UnTar, UnZip, Verifiable } from '../metadata-format';
import { Session } from '../session';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

function locations(from: ResourceLocation) {
  const result = from ? (typeof from === 'string' ? [from] : [...from]) : [];
  strict.ok(result, 'Installer - missing locations');
  return result;
}

function applyAcquireOptions(options?: AcquireOptions, install?: Verifiable): AcquireOptions | undefined {
  if (install) {
    if (install.sha256) {
      return {...options, algorithm: 'sha256', value: install.sha256};
    }

    if (install.md5) {
      return {...options, algorithm: 'md5', value: install.md5};
    }
  }

  return options;
}

function applyUnpackOptions(install: UnpackSettings) : OutputOptions {
  return {strip: install.strip, transform: install.transform ? [...install.transform] : undefined };
}

export async function installNuGet(session: Session, artifact: Artifact, install: Nupkg, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
    const targetFile = `${artifact.name}.zip`;
    const file = await nuget(
      session,
      install.location,
      targetFile,
      applyAcquireOptions(options,install));
    return new ZipUnpacker(session).unpack(
      file,
      artifact.targetLocation,
      applyUnpackOptions(install));
  }


async function acquireInstallArtifactFile(session: Session, targetFile: string, locations: Array<string>, options?: AcquireOptions, install?: Verifiable) {
  const file = await acquireArtifactFile(
    session,
    locations.map(each => session.fileSystem.parse(each)),
    targetFile,
    applyAcquireOptions(options,install));
  return file;
}

export async function installUnTar(session: Session, artifact: Artifact, install: UnTar, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
  const file = await acquireInstallArtifactFile(session, `${artifact.name}.tar`, locations(install.location), options, install);
  const x = await file.readBlock(0, 128);
  let unpacker : Unpacker;
  if (x[0] === 0x1f && x[1] === 0x8b) {
    unpacker = new TarGzUnpacker(session);
  } else if (x[0] === 66 && x[1] === 90) {
    unpacker = new TarBzUnpacker(session);
  } else {
    unpacker = new TarUnpacker(session);
  }

  return unpacker.unpack(file,artifact.targetLocation, applyUnpackOptions(install));
}

export async function installUnZip(session: Session, artifact: Artifact, install: UnZip, options?: { events?: Partial<UnpackEvents & AcquireEvents> }): Promise<void> {
  const file = await acquireInstallArtifactFile(session, `${artifact.name}.zip`, locations(install.location), options, install);
  await new ZipUnpacker(session).unpack(
    file,
    artifact.targetLocation,
    applyUnpackOptions(install));
}
