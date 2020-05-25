import * as dgram from 'dgram';
import Clock from './clock';
import Interface from './interface';
import { Message, DiscoverMessage, RequestDelayMessage, FollowUpMessage, ReplyDelayMessage } from './messages';
import SlowNetwork from './slow_network';

interface User {
    id: string; 
    addr: string; 
    port: number; 
    sync_time?: number;
    delay_req_time?: number;
}

export default class Server {

    socket: dgram.Socket;
    network: SlowNetwork;
    clock: Clock;
    interface: Interface;
    users: User[] = [];
    step_mode: boolean;

    constructor(ui: Interface, step_mode: boolean)
    {
        this.socket = dgram.createSocket('udp4');
        this.socket.bind(5555);

        this.interface = ui;
        this.step_mode = step_mode;

        this.network = new SlowNetwork(this.socket, 1245);
        this.clock   = new Clock(0, this.interface);
        this.interface.clock = this.clock;

        this.network.on("message", this.onMessage.bind(this));
        this.interface.setState("SERVER");
        this.clock.start();
    }

    async onDiscover(msg: DiscoverMessage, remoteInfo: dgram.RemoteInfo) 
    {
        let user = this.getUser(msg.userid);

        if(!user) {
            user = {
                id: msg.userid,
                port: remoteInfo.port,
                addr: remoteInfo.address
            }
            this.users.push(user);
        }
        this.interface.writeLog("Received {bold}DISCOVER{/} message from {cyan-fg}" + user.id + "{/}");
        this.interface.writeEmptyLogLine();

        if(this.step_mode)
            await this.interface.waitEnter();

        this.sendSync(user);
    }

    async sendSync(user: User) {

        this.network.send({
            userid: "server",
            type: "sync",
        }, user.port, user.addr);

        user.sync_time = this.clock.time();

        this.interface.setState("SYNC (" + user.sync_time + ") (" + user.id + ")");
        this.interface.writeLog("Sending {bold}SYNC{/} message to slave {cyan-fg}" + user.id + "{/}");
        this.interface.writeEmptyLogLine();

        if(this.step_mode) {
            await this.interface.waitEnter();
            this.sendFollowUp(user);
        } else {
            setTimeout(() => {
                this.sendFollowUp(user);
            }, 2000);
        }
    }

    sendFollowUp(user: User) {

        this.interface.writeLog(`Sending {bold}FOLLOW_UP{/} (${user.sync_time}) message to slave {cyan-fg}${user.id}{/}`);
        this.interface.writeEmptyLogLine();

        this.interface.setState(`FOLLOW_UP (${user.sync_time}) (${user.id})`)

        this.network.send( <FollowUpMessage> {
            userid: "server",
            type: "followup",
            master_sync_time: user.sync_time
        }, user.port, user.addr);
    }

    async onDelayRequest(msg: RequestDelayMessage)
    {
        let usr = this.getUser(msg.userid);
        let time = this.clock.time();

        this.interface.writeLog(`Received {bold}DELAY_REQ{/} message from {cyan-fg}${usr.id}{/}`);

        if(this.step_mode)
            await this.interface.waitEnter();

        this.interface.writeLog(`Sending {bold}DELAY_RESP (${time}){/} message to slave`)
        this.interface.writeEmptyLogLine();

        this.interface.setState(`DELAY_RESP (${time}) (${usr.id})`)

        this.network.send(<ReplyDelayMessage> {
            type: "delay_reply",
            userid: "server",
            req_time: time,
        }, usr.port, usr.addr);
    }

    onMessage(msg: Message, remoteInfo: dgram.RemoteInfo) 
    {
        switch(msg.type) {
            case "discover":
                return this.onDiscover(<DiscoverMessage> msg, remoteInfo);
            case "delay_req":
                return this.onDelayRequest(<RequestDelayMessage> msg);
        }
    }

    getUser(id: string) {
        return this.users.find(usr => usr.id == id);
    }
}