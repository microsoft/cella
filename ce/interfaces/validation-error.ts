// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ErrorKind } from './error-kind';


export interface ValidationError {
  message: string;
  range?: [number, number, number];
  rangeOffset?: { line: number; column: number; };
  category: ErrorKind;
}
