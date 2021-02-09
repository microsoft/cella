import { readFileSync } from 'fs';

/** @internal */
export const Version = JSON.parse(readFileSync(`${__dirname}/../package.json`, { encoding: 'utf8' })).version;