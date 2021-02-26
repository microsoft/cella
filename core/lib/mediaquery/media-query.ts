/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { i } from '../i18n';
import { Kind, MediaQueryError, Scanner, Token } from './scanner';


export function parseQuery(text: string) {
  const cursor = new Scanner(text);

  return QueryList.parse(cursor);
}

function takeWhitespace(cursor: Scanner) {
  while (!cursor.eof && isWhiteSpace(cursor)) {
    cursor.take();
  }
}

function isWhiteSpace(cursor: Scanner) {
  return cursor.kind === Kind.Whitespace;
}

class QueryList {
  queries = new Array<Query>();
  get isValid() {
    return !this.error;
  }
  error?: MediaQueryError;

  protected constructor() {
    //
  }

  get length() {
    return this.queries.length;
  }
  static parse(cursor: Scanner) {
    const result = new QueryList();

    try {
      cursor.scan(); // start the scanner
      for (const statement of QueryList.parseQuery(cursor)) {
        result.queries.push(statement);
      }
    } catch (error) {
      result.error = error;
    }
    return result;
  }

  static *parseQuery(cursor: Scanner): Iterable<Query> {
    takeWhitespace(cursor);
    if (cursor.eof) {
      return;
    }
    yield Query.parse(cursor);
    takeWhitespace(cursor);
    if (cursor.eof) {
      return;
    }
    switch (cursor.kind) {
      case Kind.Comma:
        cursor.take();
        return yield* QueryList.parseQuery(cursor);
      case Kind.EndOfFile:
        return;
    }
    throw new MediaQueryError(i`Expected comma, found ${JSON.stringify(cursor.text)}`, cursor.position.line, cursor.position.column);
  }

  match(properties: Record<string, unknown>) {
    if (this.isValid) {
      queries: for (const query of this.queries) {
        for (const { feature, constant, not } of query.expressions) {

          if ((feature in properties) || (not && constant === undefined)) {
            if (constant === undefined) {
              // if they didn't give a constant for 'foo' and there is a foo property, we're good.
              continue;
            }

            if (constant == properties[feature] || not && constant != properties[feature]) {
              continue;
            }

            // value didn't match. this whole query is a bust.
            continue queries;
          } else {
            // the feature ain't here, and it's not negated
            continue queries;
          }
        }
        // we matched a whole query, we're good
        return true;
      }
    }
    // no query matched.
    return false;
  }
}

class Query {
  protected constructor(public readonly expressions: Array<Expression>) {

  }

  static parse(cursor: Scanner): Query {
    const result = new Array<Expression>();
    takeWhitespace(cursor);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      result.push(Expression.parse(cursor));
      takeWhitespace(cursor);
      if (cursor.kind === Kind.AndKeyword) {
        cursor.take(); // consume and
        continue;
      }
      // the next token is not an 'and', so we bail now.
      return new Query(result);
    }
  }

}

class Expression {
  protected constructor(protected readonly featureToken: Token, protected readonly constantToken: Token | undefined, public readonly not: boolean) {

  }
  get feature() {
    return this.featureToken.text;
  }
  get constant() {
    return this.constantToken?.stringValue || this.constantToken?.text || undefined;
  }


  /** @internal */
  static parse(cursor: Scanner, isNotted = false, inParen = false): Expression {
    takeWhitespace(cursor);

    switch (<any>cursor.kind) {
      case Kind.Identifier: {
        // start of an expression
        const feature = cursor.take();
        takeWhitespace(cursor);

        if (<any>cursor.kind === Kind.Colon) {
          cursor.take(); // consume colon;

          // we have a constant for the
          takeWhitespace(cursor);
          switch (<any>cursor.kind) {
            case Kind.NumericLiteral:
            case Kind.BooleanLiteral:
            case Kind.Identifier:
            case Kind.StringLiteral: {
              // we have a good const value.
              const constant = cursor.take();
              return new Expression(feature, constant, isNotted);
            }
          }
          throw new MediaQueryError(i`Expected one of {Number, Boolean, Identifier, String}, found token ${JSON.stringify(cursor.text)}`, cursor.position.line, cursor.position.column);
        }
        return new Expression(feature, undefined, isNotted);
      }

      case Kind.NotKeyword:
        if (isNotted) {
          throw new MediaQueryError(i`Expression specified NOT twice`, cursor.position.line, cursor.position.column);
        }
        cursor.take(); // suck up the not token
        return Expression.parse(cursor, true, inParen);

      case Kind.OpenParen: {
        cursor.take();
        const result = Expression.parse(cursor, isNotted, inParen);
        takeWhitespace(cursor);
        if (cursor.kind !== Kind.CloseParen) {
          throw new MediaQueryError(i`Expected close parenthesis for expression, found ${JSON.stringify(cursor.text)}`, cursor.position.line, cursor.position.column);
        }

        cursor.take();
        return result;
      }

      default:
        throw new MediaQueryError(i`Expected expression, found ${JSON.stringify(cursor.text)}`, cursor.position.line, cursor.position.column);
    }
  }
}
/**

# query-list
\s* #query \s* [, #query ]* ]?

# query
- \s* #expression \s* ['AND' \s* #expression ]*

# expression
- \s* #identifier \s*
- \s* #identifier \s* ':' \s* #constant  \s*
- '(' #expression ')' \s*
- ['NOT']? #expression


# constant
<string>|<number>|<boolean>

 */