/// <reference types='../node_modules/@types/node' />

import * as chalk from 'chalk';
import { dirname, join, normalize } from 'path';
import { ForEachDescendantTraversalControl, Node, Project, PropertyAssignment, PropertyAssignmentStructure, StructureKind } from 'ts-morph';

export interface Dictionary<T> {
  [key: string]: T;
}

function singleQuote(text: string) {
  return JSON.stringify(text).replace(/'/g, '\\\'').replace(/^"(.*)"$/, '\'$1\'');
}
type parameters = { name: string, type: string }; //, tn: Type 
type translator = { literal: string; params: Array<parameters> };

async function main() {
  const root = dirname(__dirname);
  const i18n = join(root, 'i18n');

  const project = new Project({ tsConfigFilePath: `${__dirname}/../tsconfig.json`, });
  const translationFiles = project.getSourceFiles().filter(each => normalize(each.getFilePath()).startsWith(i18n));
  const sourceFiles = project.getSourceFiles().filter(each => !normalize(each.getFilePath()).startsWith(i18n));
  const i18nSourceFile = project.getSourceFiles().find(each => normalize(each.getFilePath()).startsWith(join(root, 'lib', 'i18n.ts')));

  const strings: Dictionary<translator> = {};

  // track the i`` strings
  function track(key: string, literal: string, params: Array<parameters> = []) {
    if (key.startsWith('`') && key.endsWith('`')) {
      key = key.substr(1, key.length - 2);
    }
    strings[key] = { literal, params };
  }

  for (const sourceFile of sourceFiles) {
    // find all the template literals in the file
    sourceFile.forEachDescendant((node: Node, traversal: ForEachDescendantTraversalControl) => {
      try {
        if (Node.isTaggedTemplateExpression(node)) {
          const template = node.getTemplate();
          const tag = node.getTag();
          // quick and dirty. just see if it's (....).i 
          const tagType = tag.getType();
          const tagSymbol = tagType.getSymbol();
          const decl = tagSymbol?.getDeclarations()[0];
          if (Node.isFunctionDeclaration(decl)) {
            const sourceFile = decl?.getSourceFile();
            if (decl.getName() === 'i' && sourceFile === i18nSourceFile)

              // we have found a tagged template literal.
              // let's start gathering the data for it.

              if (Node.isNoSubstitutionTemplateLiteral(template)) {
                // simple, no params
                track(template.getText(), template.getText());

              } else if (Node.isTemplateExpression(template)) {
                // get the preamble
                const templateHead = template.getHead();
                let key = templateHead.getText();
                let literal = templateHead.getText();
                let parameters = new Array<parameters>();
                let n = 0;
                for (const span of template.getTemplateSpans()) {
                  const content = span.getChildAtIndex(0);
                  const text = span.getChildAtIndex(1);
                  key = `${key}${n}${text.getText()}`;

                  if (Node.isIdentifier(content)) {
                    // it's a simple identifier,
                    // that'll be the parameter name
                    const symbol = content.getSymbol();
                    const declaration = symbol?.getDeclarations();

                    const name = content.getText();
                    const type = declaration?.[0].getType().getText() || 'any'; //fallback to any

                    parameters.push({ name, type });
                    literal = literal + name + text.getText();
                  } else if (Node.isExpression(content)) {
                    // just use a placeholder number for now.
                    const type = node.getType().getText();
                    const name = `p${n}`;

                    parameters.push({ name, type });
                    literal = literal + name + text.getText();
                  }

                }
                track(key, literal, parameters);
                n++;
              }
          }
        }
      } catch {
      }
    })
    // let's make sure there are entries in all of the language translations
  }

  for (const lang of translationFiles) {
    let modified = false;
    const map = lang.getVariableDeclarations().find(variable => variable.getSymbol()?.getEscapedName() === 'map');
    if (Node.isVariableDeclaration(map)) {
      const initializer = map.getInitializer();
      const props: Dictionary<PropertyAssignment | null> = {};

      if (Node.isObjectLiteralExpression(initializer)) {
        for (const prop of initializer.getProperties()) {
          if (Node.isPropertyAssignment(prop)) {
            const name = prop.getName();
            const pa = prop.getInitializer();
            props[name] = Node.isPropertyAssignment(pa) ? pa : null;
          }
        }

        // got all the properties. 
        // let's see if all of our strings are in there.
        for (const key in strings) {
          const fn = strings[key];
          const name = singleQuote(key);

          if (props[name] === undefined) {
            // no property for that string. create it with the default impl
            const pp = fn.params.map(each => `${each.name}: ${each.type}`);
            initializer.addProperty(<PropertyAssignmentStructure>{
              name,
              kind: StructureKind.PropertyAssignment,
              initializer: `(${pp.join(',')}) => {
              return ${pp.length === 0 ? name : fn.literal};
            }`
            });
            modified = true;
          }
        }
      }
      if (modified) {
        // clean up formatting
        lang.formatText({
          indentSize: 2,
        });
        lang.saveSync();
        console.log(`${chalk.yellowBright('Updated i18n lang file')}: ${chalk.greenBright(lang.getFilePath())}`)
      }
    }
  }
}

main();
