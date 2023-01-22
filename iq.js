const Broker = require("iqoption");
const { io } = require("socket.io-client");

class IQOption {
  constructor() {
    this.iq = new Broker({
      email: process.env.EMAIL,
      password: process.env.PASSWORD,
    });
    this.socket = io("http://127.0.0.1:5500");
    this.ticker_object = { time: [], ticker: [] };
    this.single_ticker = 0;
    this.active_id = 76; //EURUSD = 1, EURUSD (OTC) = 76
    this.frame = null;
  }

  async authentication() {
    await this.iq.login();
    await this.iq.connect();
    await this.iq.subscribe("candle-generated", {
      active_id: this.active_id,
      size: 1,
    });
  }

  async cleanUp() {
    await this.iq.unsubscribe("candle-generated", {
      active_id: this.active_id,
      size: 1,
    });
    await this.iq.disconnect();
  }

  filterTimeValue(value) {
    if (value < 10) {
      return `0${value}`;
    }
    return value.toString();
  }

  calculateTime() {
    const date = new Date();
    return `${this.filterTimeValue(date.getHours())}:${this.filterTimeValue(
      date.getMinutes()
    )}:${this.filterTimeValue(date.getSeconds())}`;
  }

  sendTicker() {
    this.frame = setInterval(() => {
      if (this.single_ticker > 0) {
        this.socket.emit("ticker", this.single_ticker);
      }
    }, 1000);
  }

  runTicker() {
    console.log("ticker streaming...");
    this.iq.on("candle-generated", (tick) => {
      this.single_ticker = tick.close;
    });
  }

  socketClient() {
    this.runTicker();
    this.socket.on("connect", () => {
      console.log(`connected with id ${this.socket.id}`);
      if (this.frame) {
        clearInterval(this.frame);
      }
      this.sendTicker();
    });

    this.socket.on("disconnect", () => {
      console.log("disconnected");
      clearInterval(this.frame);
      this.sendTicker.single_ticker = 0;
      this.frame = null;
    });
  }
}

module.exports = IQOption;
