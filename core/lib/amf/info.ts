import { fail } from 'assert';
import { parse as parseSemver } from 'semver';
import { YAMLMap } from 'yaml/types';
import { i } from '../i18n';
import { ErrorKind, Info, ValidationError } from '../metadata-format';
import { createNode } from '../util/yaml';

/** @internal */
export class InfoNode implements Info {
  /** @internal */
  constructor(protected node: YAMLMap) {
  }

  get id(): string {
    return this.node.get('id');
  }

  set id(value: string) {
    this.node.set('id', createNode(value));
  }

  get version(): string {
    return this.node.get('version');
  }

  set version(value: string) {
    const v = parseSemver(value);
    this.node.set('version', v?.format() || fail(i`Version '${value}' is not a legal semver version`));
  }

  get summary(): string | undefined {
    return this.node.get('summary') || undefined;
  }

  set summary(value: string | undefined) {
    this.node.set('summary', value);
  }

  get description(): string | undefined {
    return this.node.get('description') || undefined;
  }
  set description(value: string | undefined) {
    this.node.set('description', value);
  }


  *validate(): Iterable<ValidationError> {
    const column = this.node.cstNode?.rangeAsLinePos?.start.col || 0;
    const line = this.node.cstNode?.rangeAsLinePos?.start.line || 0;

    if (!(this.node instanceof YAMLMap)) {
      yield { message: i`Incorrect type for '${'info'}' - should be an object`, line, column, category: ErrorKind.IncorrectType };
      return; // stop processing in this block
    }

    if (!this.node.hasIn('id')) {
      yield { message: i`Missing identity '${'info.id'}'`, line, column, category: ErrorKind.FieldMissing };
    }

    if (!this.node.has('version')) {
      yield { message: i`Missing version '${'info.version'}'`, line, column, category: ErrorKind.FieldMissing };
    }
  }

}
