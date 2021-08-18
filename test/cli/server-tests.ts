import { strict } from 'assert';
import * as cp from 'child_process';
import { describe, it } from 'mocha';
import { resolve } from 'path';
import * as rpc from 'vscode-jsonrpc';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/lib/node/main';

let connection: rpc.MessageConnection;
let stopNotification = new rpc.NotificationType('Deactivate');

describe('Server Tests', () => {
  let childProcess = cp.spawn(process.argv[0], [resolve(__dirname, '../../../cli'), 'server', '--accept-eula'], { stdio: ["pipe", "pipe", "inherit"] });
  strict.ok(childProcess, "child process did not start");

  // Use stdin and stdout for communication:
  connection = rpc.createMessageConnection(
    new StreamMessageReader(childProcess.stdout),
    new StreamMessageWriter(childProcess.stdin));

  let createSession = new rpc.RequestType4<string, string, string, string, number, void>('CreateSession');
  let activateSession = new rpc.RequestType3<string, string[], number, number, void>('Activate');
  let deactivateSession = new rpc.NotificationType<number>('Deactivate');
  let stopSession = new rpc.RequestType<number, number, void>('Stop');

  connection.listen();

  it('Creates a ce server session', async () => {
    const obj = <any>{};
    obj.os = "win32";
    obj.arch = "x64";

    const obj1 = <any>{};
    let result = await connection.sendRequest(createSession, process.cwd(), JSON.stringify(obj), JSON.stringify(obj1), JSON.stringify(process.env));
    console.error(result);
  });

  it('Activates a ce session', async () => {
    let result = await connection.sendRequest(activateSession, "", [""], 1);
    console.error(result);
  });

  it('Deactivates a ce session', async () => {
    await connection.sendNotification(deactivateSession, 1);
  });


});

after(async () => {
  connection.sendNotification(stopNotification);
});