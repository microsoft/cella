/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { readFileSync } from 'fs';

export const Version = JSON.parse(readFileSync(`${__dirname}/../package.json`, { encoding: 'utf8' })).version;
