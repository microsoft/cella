import { i, Session } from '@microsoft/vcpkg-ce.core';
import * as rpc from 'vscode-jsonrpc';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/lib/node/main';
import { JSONRPC } from '../api/jsonrpc';
import { Command } from '../command';
import { CommandLine } from '../command-line';
import { activateProject } from '../project';
import { Project } from '../switches/project';
import { WhatIf } from '../switches/whatIf';
import { UpdateCommand } from './update';

export class ServerCommand extends Command implements JSONRPC {
  readonly command = 'server';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  whatIf = new WhatIf(this)
  project: Project = new Project(this);
  serverMap = new Map();

  get summary() {
    return i`Enables a server mode that can be used by VS and VSCode`;
  }

  get description() {
    return [
      i`This allows for use with VS and VSCode in order to `,
    ];
  }

  get nextSessionID() {
    let keys = this.serverMap.keys()
    let maxKey = 0;
    for (let val of keys) {
      if (val > maxKey) {
        maxKey = val;
      }
    }
    if (maxKey == 0) {
      return maxKey;
    }
    return maxKey + 1;
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
    this.serverMap.set(sessionID, session);
    let activeSession = await session.init();
    //console.error(activeSession.fileSystem);
    //console.error(session.acceptedEula);
    return sessionID;
  }

  async Activate(projectURI: string, commandline: string[], sessionID: number): Promise<number> {
    // activate the session and return the sessionID
    let session = this.serverMap.get(sessionID);
    //console.error(session);
    await session.deactivate();
    //console.error(session.fileSystem);
    //console.error(session.currentDirectory);
    await activateProject(session.currentDirectory);
    return sessionID;
  }

  async Deactivate(sessionID: number): Promise<void> {
    await this.serverMap.get(sessionID).deactivate();
  }

  async Update(sessionID: number): Promise<void> {
    await UpdateCommand.update(this.serverMap.get(sessionID).getRepository('default'));
  }

  async run() {
    let connection = rpc.createMessageConnection(
      new StreamMessageReader(process.stdin),
      new StreamMessageWriter(process.stdout));

    let createSession = new rpc.RequestType4<string, string, string, string, number, void>('CreateSession');
    connection.onRequest(createSession, async (param1, param2, param3, param4) => {
      return await this.CreateSession(param1, param2, param3, param4);
    });

    connection.onRequest(new rpc.RequestType3<string, string[], number, number, void>('Activate'), async (param1, param2, param3) => {
      return await this.Activate(param1, param2, param3);
    });

    connection.onNotification(new rpc.NotificationType<number>('Update'), async (param) => {
      await this.Update(param);
    });

    connection.onNotification(new rpc.NotificationType<number>('Deactivate'), async (param) => {
      await this.Deactivate(param);
    })

    connection.onNotification(new rpc.NotificationType('Stop'), () => {
      console.error("Exiting");
      process.exit();
    });


    connection.listen();

    return true;
  }
}

