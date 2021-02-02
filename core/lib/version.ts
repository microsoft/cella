import { readFileSync } from 'fs';

/** export a constant with the version of this library. */
export const Version = JSON.parse(readFileSync(`${__dirname}/../../package.json`, { encoding: 'utf8' })).version;
