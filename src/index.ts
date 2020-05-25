import * as commander from 'commander';

import Client from './client';
import Interface from './interface';
import Server from './server';

const program = new commander.Command();

const ui = new Interface();

function runServer(options: any)
{
    const srv = new Server(ui, options.stepMode);
}

function runClient(name: string, server_addr: string, options: any)
{
    ui.screen.title = name;

    let st = 0;

    if (options.startTime) st = Number.parseInt(options.startTime);

    ui.time = st || 0;

    const client = new Client(ui, name, server_addr, options.stepMode, st);
}

program.command('server').option('--step-mode').action(runServer)

program.command('client <name> <server_addr>')
    .option('--start-time <time>')
    .option('--step-mode')
    .action(runClient);

program.parse(process.argv);