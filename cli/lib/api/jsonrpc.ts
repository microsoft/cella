
export interface JSONRPC {
  CreateSession(currentDirectory: string, context: string, settings: string, environment: string): Promise<number>;
  Activate(projectURI: string, commandline: Array<string>, sessionID: number): Promise<number>;
  Update(sessionID: number): Promise<void>;
  Deactivate(sessionID: number): void;
}