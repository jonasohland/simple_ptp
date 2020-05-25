import * as blessed from 'blessed';
import fixed from 'fixed-width-string';
import Clock from './clock';

export default class Interface {
    
    screen: blessed.Widgets.Screen;
    header_box: blessed.Widgets.BoxElement;
    log: blessed.Widgets.Log;

    time: number = 0;
    state: string;

    clock: Clock;

    waiter: () => void;

    constructor() {


        this.screen = blessed.screen({
            smartCSR: true
        });

        this.header_box = blessed.box({
            tags: true,
            width: "100%",
            height: "shrink",
            border: {
                type: "line"
            },
            style: {
                fg: 'white',
                border: {
                  fg: '#f0f0f0'
                },
            }
        });

        this.header_box.setContent("");

        this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
            return process.exit(0);
        });

        this.screen.key(['enter', 'space'], () => {
            if(this.waiter){
                this.log.clearLine(this.log.getLines().length - 1);
                this.waiter();
            }

            this.waiter = null;
        })

        this.log = blessed.log({
            tags: true,
            width: "100%",
            height: "100%-3",
            top: "0%+3",
            border: {
                type: "line"
            },
            style: {
                fg: 'white',
                border: {
                  fg: '#f0f0f0'
                },
              }
        });

        this.screen.append(this.header_box);
        this.screen.append(this.log);
        this.screen.render();
    }

    writeLog(text: string) {
        this.log.add(`{bold}${fixed("" + this.clock.time(), 7)}{/} ${text}`);
        this.screen.render();

    }

    writeEmptyLogLine() {
        this.log.add("");
        this.screen.render();
    }

    setTime(time: number) {
        this.time = time;
        this.renderHeader();
    }

    setState(txt: string) {
        this.state = `{|}{green-fg}{bold}${txt}{/}   `;
    }

    renderHeader() {
        if(Math.floor(this.time / 100) % 2)
            this.header_box.setContent(fixed("" + this.time, 15) + this.state);
        else
            this.header_box.setContent("{white-bg}{black-fg}" + this.time + "{/}" + this.state);

        this.screen.render();
    }

    async waitEnter(): Promise<void> {
        return new Promise((res, rej) => {
            this.log.add("Press space to continue");
            this.waiter = res;
        })
    }
}