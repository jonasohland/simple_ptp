import * as dgram from 'dgram';
import { EventEmitter } from 'events';
import { Message } from './messages';

export default class SlowNetwork extends EventEmitter {
    
    socket: dgram.Socket;
    delay: number;

    constructor(socket: dgram.Socket, delay: number) {
        
        super();

        this.socket = socket;
        this.delay = delay;

        socket.on('message', (buf, rinf) => {
            setTimeout(() => {
                this.emit('message', <Message> JSON.parse(buf.toString()), rinf);
            }, delay); 
        });
    }

    send(message: Message, port: number, addr: string) {
        setTimeout(() => {
            this.socket.send(JSON.stringify(message), port, addr);
        }, this.delay);
    }
}