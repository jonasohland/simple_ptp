import * as dgram from 'dgram';

import Clock from './clock';
import Interface from './interface';
import {
    FollowUpMessage,
    Message,
    ReplyDelayMessage,
    SyncMessage
} from './messages'
import SlowNetwork from './slow_network';

export default class Client {

    userid: string;
    server_addr: string;

    interface: Interface;
    clock: Clock;

    socket: dgram.Socket;
    network: SlowNetwork;

    ready: boolean;

    sync_time: number;
    delay_req_time: number;

    step_mode: boolean;
    offset: number;
    delay: number;
    

    constructor(ui: Interface, userid: string, server_addr: string, step_mode: boolean, starttime?: number)
    {
        this.userid      = userid;
        this.interface   = ui;
        this.server_addr = server_addr;
        this.step_mode   = step_mode;

        this.socket = dgram.createSocket("udp4");

        this.clock   = new Clock(starttime || 0, this.interface);
        this.network = new SlowNetwork(this.socket, 400);
        this.interface.clock = this.clock;

        this.clock.start();

        this.network.on('message', this.onMessage.bind(this));
        this.socket.bind(this.sendDiscoverMessage.bind(this));

        this.interface.setState("DISCOVER")
    }

    sendDiscoverMessage()
    {
        if(this.ready)
            return;

        this.network.send({ type : 'discover', userid : this.userid },
                          5555,
                          this.server_addr);
        
        this.interface.writeLog("Send {bold}DISCOVER{/} message to master");
        this.interface.writeEmptyLogLine();

        if(!this.step_mode)
            setTimeout(this.sendDiscoverMessage.bind(this), 7000);
    }

    onSyncMessage(msg: SyncMessage)
    {
        this.ready = true;

        this.interface.writeLog("Received {bold}SYNC{/} message from master.")
        this.interface.writeEmptyLogLine();
        this.sync_time = this.clock.time();
        this.interface.setState("SYNC (" + this.sync_time + ")");
    }

    async onFollowUpMessage(msg: FollowUpMessage)
    {
        this.offset = msg.master_sync_time - this.sync_time;

        this.interface.writeLog("Received {bold}FOLLOW_UP{/} message from master.");
        this.interface.writeLog("Master {bold}SYNC{/} time: {cyan-fg}" + msg.master_sync_time + "{/}. My SYNC time was {green-fg}" + this.sync_time + "{/}");
        this.interface.writeLog(`Offset is {cyan-fg}${msg.master_sync_time}{/} - {green-fg}${this.sync_time}{/} = {yellow-fg}${this.offset}{/}`);
        this.interface.writeEmptyLogLine();

        if(this.step_mode)
            await this.interface.waitEnter();

        this.sendDelayReq();
    }

    sendDelayReq()
    {
        this.interface.writeLog("Sending {bold}DELAY_REQ{/} message to master")
        this.interface.writeEmptyLogLine();
    
        this.delay_req_time = this.clock.time();

        this.interface.setState(`DELAY_REQ (${this.delay_req_time})`)

        this.network.send({ type : 'delay_req', userid : this.userid },
                          5555,
                          this.server_addr);
    }

    async onDelayReplyMessage(msg: ReplyDelayMessage)
    {
        let delay = (this.offset - (msg.req_time - this.delay_req_time)) / 2;
        let adjustment = this.offset - delay;

        this.interface.writeLog("Received {bold}DELAY_RESP{/} message from master");
        this.interface.writeLog(`Master DELAY_REQ time: {cyan-fg}${msg.req_time}{/}`);
        this.interface.writeLog(`Delay is: ({yellow-fg}${this.offset}{/} - ({cyan-fg}${msg.req_time}{/} - {green-fg}${this.delay_req_time}{/})) / 2 = {blue-fg}${delay}{/}`);
        this.interface.writeEmptyLogLine();
        this.interface.writeLog(`Total offset is {yellow-fg}${this.offset}{/} - {blue-fg}${delay}{/} = {magenta-fg}${adjustment}{/}`)
        this.interface.writeLog(`Adjusting from {bold}${this.clock.time()}{/} by {magenta-fg}${adjustment}{/} to {bold}${this.clock.time() + adjustment}{/}`)
        this.interface.writeEmptyLogLine();

        this.clock.adjust(this.clock.time() + adjustment);

        if(!this.step_mode){
            this.ready = false;
            this.sendDiscoverMessage();
        }
    }

    onMessage(msg: Message)
    {
        switch (msg.type) {
            case 'sync': return this.onSyncMessage(<SyncMessage>msg);
            case 'followup':
                return this.onFollowUpMessage(<FollowUpMessage>msg);
            case 'delay_reply':
                return this.onDelayReplyMessage(<ReplyDelayMessage>msg);
        }
    }
}
