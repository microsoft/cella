
export interface JSONRPC {
  CreateSession(currentDirectory: string, context: string, settings: string, environment: string): Promise<number>;
  Activate(project: string, commandline: Array<string>, sessionID: number): number;
  Deactivate(sessionID: number): void;
}