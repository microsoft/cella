// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Primitive } from './yaml-types';


export /** @internal */ class Coerce {
  static String(value: any): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
  static Number(value: any): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }
  static Boolean(value: any): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }
  static Primitive(value: any): Primitive | undefined {
    switch (typeof value) {
      case 'boolean':
      case 'number':
      case 'string':
        return value;
    }
    return undefined;
  }
}
