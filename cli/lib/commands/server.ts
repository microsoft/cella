import { i, Session, Uri } from '@microsoft/vcpkg-ce.core';
import * as rpc from 'vscode-jsonrpc';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/lib/node/main';
import { JSONRPC } from '../api/jsonrpc';
import { Command } from '../command';
import { CommandLine } from '../command-line';
import { activateProject } from '../project';
import { Project } from '../switches/project';
import { WhatIf } from '../switches/whatIf';

export let server_map = new Map();

export class ServerCommand extends Command implements JSONRPC {
  readonly command = 'server';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  whatIf = new WhatIf(this)
  project: Project = new Project(this);

  get summary() {
    return i`Enables a server mode that can be used by VS and VSCode`;
  }

  get description() {
    return [
      i`This allows for use with VS and VSCode in order to `,
    ];
  }

  get nextSessionID() {
    let keys = server_map.keys()
    let max_key = 0;
    for (let val of keys) {
      if (val > max_key) {
        max_key = val
      }
    }
    if (max_key == 0) {
      return max_key;
    }
    return max_key + 1;
  }

  async CreateSession(currentDirectory: string, context: string, settings: string, environment: string): Promise<number> {

    let commandline = new CommandLine([], context);
    /*console.error("start printing");
    console.error(currentDirectory);
    console.error(commandline.context);
    console.error(<any>commandline);
    console.error(JSON.parse(environment));*/
    let session = new Session(currentDirectory, commandline.context, <any>commandline, JSON.parse(environment));
    let sessionID = this.nextSessionID;
    server_map.set(sessionID, session);
    let activeSession = await session.init();
    //console.error(activeSession.fileSystem);
    //console.error(session.acceptedEula);
    return sessionID;
  }

  async Activate(projectURI: string, commandline: string[], sessionID: number): Promise<number> {
    // activate the session and return the sessionID
    let session = server_map.get(sessionID);
    console.error(session);
    await session.deactivate();
    console.error(session.fileSystem);
    console.error(projectURI);
    await activateProject(Uri.file(session.fileSystem, projectURI), this.commandLine)
    return sessionID;
  }

  Deactivate(sessionID: number): void {
    server_map.get(sessionID).deactivate();
    return;
  }

  async run() {
    let connection = rpc.createMessageConnection(
      new StreamMessageReader(process.stdin),
      new StreamMessageWriter(process.stdout));

    let createSession = new rpc.RequestType4<string, string, string, string, number, void>('CreateSession');
    connection.onRequest(createSession, async (param1, param2, param3, param4) => {
      let result = await this.CreateSession(param1, param2, param3, param4);
      return result;
    });

    connection.onRequest(new rpc.RequestType3<string, string[], number, number, void>('Activate'), (param1, param2, param3) => {
      return this.Activate(param1, param2, param3);
    });

    connection.onNotification(new rpc.NotificationType<number>('Deactivate'), (param) => {
      this.Deactivate(param);
    })

    connection.onNotification(new rpc.NotificationType('Stop'), () => {
      console.error("Exiting");
      process.exit();
    });


    connection.listen();

    return true;
  }
}

