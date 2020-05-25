import Interface from './interface';

export default class Clock {
    
    _time: number;
    ticker: NodeJS.Timeout;
    interface: Interface;

    constructor(start_time: number, ui: Interface) {
        this._time = start_time || 0;
        this.interface = ui;
    }

    tick()
    {
        this._time += 1;
        
        if((Math.floor(this._time) % 10) == 0)
            this.interface.setTime(this._time);
    }

    start()
    {
        this.ticker = setInterval(this.tick.bind(this), 10);
    }

    stop()
    {
        clearInterval(this.ticker);
    }

    reset()
    {
        this._time = 0;
    }

    time()
    {
        return this._time;
    }

    adjust(new_time: number) {
        this._time = new_time;
    }
}