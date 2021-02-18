interface language { [key: string]: (...args: Array<any>) => string; }
export const map: language = {
  'core version: ${0}': (Version: string) => {
    // autotranslated using Azure Translator via 'translate-strings' tool (`core version: ${Version}`)
    return `Kernversion: ${Version}`;
  }
};
