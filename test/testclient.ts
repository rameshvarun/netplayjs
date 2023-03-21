import { WebSocket } from "ws";
import { ClientMessage, ServerMessage } from "../src/protocol";

export class TestClient extends WebSocket {
  constructor() {
    super("ws://localhost:3000/");
  }

  waitForOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.on("open", (msg: string) => {
        resolve();
      });
    });
  }

  onMessage(handler: (ServerMessage) => void) {
    this.on("message", (msg: string) => {
      handler(JSON.parse(msg));
    });
  }

  sendMessage(msg: ClientMessage) {
    this.send(JSON.stringify(msg));
  }
}
