// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Uri } from '../util/uri';
import { Artifact } from './artifact';
import { RepoIndex } from './repository';


export interface Registry {
  readonly count: number;
  readonly where: RepoIndex;
  readonly loaded: boolean;

  load(): Promise<void>;
  save(): Promise<void>;
  update(): Promise<void>;
  regenerate(): Promise<void>;

  openArtifact(manifestPath: string): Promise<Artifact>;
  openArtifacts(manifestPaths: Array<string>): Promise<Map<string, Array<Artifact>>>;
  readonly baseFolder: Uri;
}
