/*---------------------------------------------------------------------------------------------
 *  Copyright 2021 (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strict } from 'assert';

export class Table {
  private readonly rows = new Array<string>();
  private numberOfColumns = 0;
  constructor(...columnNames: Array<string>) {
    this.numberOfColumns = columnNames.length;
    this.rows.push(`|${columnNames.join('|')}|`);
    this.rows.push(`${'|--'.repeat(this.numberOfColumns)}|`);
  }
  push(...values: Array<string>) {
    strict.equal(values.length, this.numberOfColumns, 'unexpected number of arguments in table row');
    this.rows.push(`|${values.join('|')}|`);
  }
  toString() {
    return this.rows.join('\n');
  }
}