import { EventEmitter } from 'ee-ts';

interface ChannelEvents {
  warning(text: string, context: any, msec: number): void;
  error(text: string, context: any, msec: number): void;
  message(text: string, context: any, msec: number): void;
  debug(text: string, context: any, msec: number): void;
}

class Stopwatch {
  start: number;
  last: number;
  constructor() {
    this.last = this.start = process.uptime() * 1000;
  }
  get time() {
    const now = process.uptime() * 1000;
    const result = Math.floor(now - this.last);
    this.last = now;
    return result;
  }
  get total() {
    const now = process.uptime() * 1000;
    return Math.floor(now - this.start);
  }
}

export class Channels extends EventEmitter<ChannelEvents> {
  stopwatch = new Stopwatch();

  warning(text: string, context?: any) {
    this.emit('warning', text, context, this.stopwatch.total);
  }
  error(text: string, context?: any) {
    this.emit('error', text, context, this.stopwatch.total);
  }
  message(text: string, context?: any) {
    this.emit('message', text, context, this.stopwatch.total);
  }
  debug(text: string, context?: any) {
    this.emit('debug', text, context, this.stopwatch.total);
  }

  constructor() {
    super();
  }
}