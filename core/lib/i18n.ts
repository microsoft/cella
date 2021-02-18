/** what a language map looks like. */
interface language {
  [key: string]: (...args: Array<any>) => string;
}

type PrimitiveValue = string | number | boolean | undefined | Date;

let translatorModule: language | undefined = undefined;

export function setLocale(newLocale: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    translatorModule = <language>(require(`../i18n/${newLocale}`).map);
  } catch {
    // translation did not load.
    // fallback to no translation
    translatorModule = undefined;
  }
}

/**
 * processes a TaggedTemplateLiteral to return either:
 * - a template string with numbered placeholders
 * - or to resolve the template with the values given.
 *
 * @param literals The templateStringsArray from the templateFunction
 * @param values the values from the template Function
 * @param formatter an optional formatter (formats to ${##} if not specified)
 */
function normalize(literals: TemplateStringsArray, values: Array<PrimitiveValue>, formatter?: (value: PrimitiveValue) => string) {
  const content = formatter ? literals.flatMap((k, i) => [k, formatter(values[i])]) : literals.flatMap((k, i) => [k, `$\{${i}}`]);
  content.length--; // drop the trailing undefined.
  return content.join('');
}

/**
 * Support for tagged template literals for i18n.
 *
 * Leverages translation files in ../i18n
 *
 * @param literals the literal values in the tagged template
 * @param values the inserted values in the template
 *
 * @translator
 */
export function i(literals: TemplateStringsArray, ...values: Array<string | number | boolean | undefined | Date>) {
  // if the language has no translation, use the default content.
  if (!translatorModule) {
    return normalize(literals, values, (content) => `${content}`);
  }
  // use the translator module, but fallback to no translation if the file doesn't have a translation.
  const fn = translatorModule[normalize(literals, values)];
  return fn ? fn(...values) : normalize(literals, values, (content) => `${content}`);
}
