import { Dictionary } from '../lib/linq';

export const map: Dictionary<(...args: Array<any>) => string> = {
  'scheme \'${0}\' already registered.': (scheme: string) => {
    return `Achtung! ze scheme known as der '${scheme}' vas already registereden!`;
  },
  'stats may not be undefined': () => {
    return 'stats may not be undefined';
  },
  'Cannot rename files across filesystems': () => {
    return 'Cannot rename files across filesystems';
  },
  'Uri may not be empty': () => {
    return 'Uri may not be empty';
  },
  'scheme ${0} has no filesystem associated with it': (scheme: string | undefined) => {
    return `scheme ${scheme} has no filesystem associated with it`;
  },
  'uri ${0} has no scheme': (uri: string) => {
    return `Die URL ${uri} hat kein Schema`;
  },
  'may not rename across filesystems': () => {
    return 'darf nicht über Dateisysteme hinweg umbenennen';
  }
};
