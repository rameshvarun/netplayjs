import { MatchmakingServer } from "./src/index";
import { WebSocket } from "ws";
import * as log from "loglevel";
import { ServerMessage } from "./src/protocol";

// Show debug messages while running tests.
log.setLevel("debug");

// Start / stop a new server for each test.
let server: MatchmakingServer | undefined;
beforeEach(() => {
  server = new MatchmakingServer();
  return server.start();
});
afterEach(() => {
  server!.close();
});

class TestClient extends WebSocket {
  constructor() {
    super("ws://localhost:3000/");
  }

  onMessage(handler: (ServerMessage) => void) {
    this.on('message', (msg: string) => {
      handler(JSON.parse(msg));
    });
  }
}

test("Create and teardown server.", () => {});

test("Register one client.", (done) => {
  let client = new TestClient();
  client.onMessage((msg: ServerMessage) => {
    expect(msg.kind).toBe("registration-success")
    expect(msg).toHaveProperty("clientID");
    
    client.close();
    done();
  });
});

test("Send non-JSON message", (done) => {
  let client = new TestClient();
  client.on("open", () => {
    client.send("cannot-parse");
  });
  client.on("close", () => {
    done();
  });
});

test("Send empty message", (done) => {
  let client = new TestClient();
  client.on("open", () => {
    client.send("{}");
  });
  client.on("close", () => {
    done();
  });
});