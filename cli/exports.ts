// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { readFileSync } from 'fs';

export const Version = JSON.parse(readFileSync(`${__dirname}/../package.json`, { encoding: 'utf8' })).version;
