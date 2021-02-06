/**
 * Stub function to support value formatting in an i18n tagged template handler.
 * @param content the content to format
 */
function format(content: any) {
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
  const content = literals.flatMap((k, i) => [k, format(values[i])]);
  content.length--;
  return content.join('');
}

