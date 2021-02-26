/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { readFileSync } from 'fs';

/** export a constant with the version of this library. */
export const Version: string = JSON.parse(readFileSync(`${__dirname}/../../package.json`, { encoding: 'utf8' })).version;
