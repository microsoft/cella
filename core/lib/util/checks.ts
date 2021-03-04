/** @internal */
export function isPrimitive(value: any): value is string | number | boolean {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
  }
  return false;
}