import { Dictionary } from './linq';

export type language = Dictionary<(...args: Array<any>) => string>;


const locale = 'en';

let translation: language | undefined = undefined;

export function setLocale(newLocale: string) {
  if (newLocale.length > 2) {
    newLocale = newLocale.substr(0, 2);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    translation = <language>(require(`../i18n/${newLocale}`).map);
  } catch {
    // translation did not load.
    // fallback to no translation
    translation = undefined;
  }
}

export type Value = string | number | boolean | undefined | Date;

function normalize(literals: TemplateStringsArray, values: Array<Value>, formatter?: (value: Value) => string) {
  const content = formatter ? literals.flatMap((k, i) => [k, format(values[i])]) : literals.flatMap((k, i) => [k, `$\{${i}}`]);
  content.length--;
  return content.join('');
}
/**
 * Stub function to support value formatting in an i18n tagged template handler.
 * @param content the content to format
 */
export function format(content: any) {
  return `${content}`;
}

/**
 * Abstraction of support for tagged template literals for i18n.
 *
 * As long as we use these tagged templates in literal strings, we can backfill how we implement i18n
 * once we land on a choice of i18n library.
 *
 * @param literals the literal values in the tagged template
 * @param values the inserted values in the template
 */
export function i(literals: TemplateStringsArray, ...values: Array<string | number | boolean | undefined | Date>) {
  // if the language has no translation, use the default content.
  if (!translation) {
    return normalize(literals, values, format);
  }
  const index = normalize(literals, values);
  const fn = translation[index];
  if (fn) {
    return fn(...values);
  }

  // fallback to english I guess
  return normalize(literals, values, format);

  // The way that I'm thinking this will work, is to use the back

  // const content = literals.flatMap((k, i) => [k, format(values[i])]);
  // content.length--;
  //return content.join('');
}

