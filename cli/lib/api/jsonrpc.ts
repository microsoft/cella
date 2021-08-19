
export interface JSONRPC {
  CreateSession(currentDirectory: string, context: string, settings: string, environment: string): Promise<number>;
  Activate(projectURI: string, commandline: Array<string>, sessionID: number): Promise<number>;
  Deactivate(sessionID: number): void;
}