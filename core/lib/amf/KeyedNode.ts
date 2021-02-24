import { Document } from 'yaml';
import { Scalar, YAMLMap } from 'yaml/types';
import { DictionaryOf } from '../metadata-format';

export function proxyDictionary<T = string>(thisNode: YAMLMap, onGet: (thisNode: YAMLMap, prop: string) => T, onSet: (thisNode: YAMLMap, prop: string, value: T) => void, instance: any = new Dictionary(thisNode)): DictionaryOf<T> {
  const prototype = Object.getPrototypeOf(instance);
  return new Proxy<DictionaryOf<T>>(instance, {

    // allows you to delete a property
    deleteProperty: (dummy: DictionaryOf<T>, property: string | symbol) => {

      const i = thisNode.items.findIndex((each: any) => each == property || each.key == property); {
        if (i > -1) {
          // remove that item
          thisNode.items.splice(i, 1);
          return true;
        }
      }
      return true;
    },

    // allows usage of 'Object.getOwnPropertyNames`
    ownKeys: (dummy: DictionaryOf<T>) => {
      return thisNode.items.map(each => {
        const k = each.key;
        return (k instanceof Scalar) ? k.value : k;
      });
    },

    get: (dummy: DictionaryOf<T>, property: string, unused: any) => {
      // if the object has a property for this, don't proxy.
      // eslint-disable-next-line no-prototype-builtins
      if (prototype.hasOwnProperty(property) || instance[property]) {
        const r = instance[property];
        return typeof r === 'function' ?
          r.bind(instance) : // rebind the function back to the actual instance (so we don't have to deref it with valueof.)
          r; // just the property then.
      }

      return onGet(thisNode, property) || undefined;
      // return thisNode.get(property) || undefined;
    },

    set: (dummy: DictionaryOf<T>, property: string, value: any, unused: any) => {
      onSet(thisNode, property, value);
      // thisNode.set(property, value);
      return true;
    }
  });
}

/** @internal */
export class Dictionary<T> implements DictionaryOf<T> {

  constructor(protected readonly node: YAMLMap | Document.Parsed) {
  }

  [key: string]: any;

  get keys(): Array<string> {
    const filter = Object.getOwnPropertyNames(Object.getPrototypeOf(this));

    return this.node.items.map((each: any) => {

      const k = each.key;
      return (k instanceof Scalar) ? k.value : k;
    }).filter(each => filter.indexOf(each) === -1); // filter out actual known property names from the dictionary.
  }

  remove(key: string): void {
    const i = this.node.items.findIndex((each: any) => each == key || each.key == key); {
      if (i > -1) {
        // remove that item
        this.node.items.splice(i, 1);
        return;
      }
    }
  }
}
