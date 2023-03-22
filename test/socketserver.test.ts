import { Server } from "../src/server";
import * as log from "loglevel";
import { ClientMessage, ServerMessage } from "../src/common/protocol";
import { TestClient } from "./testclient";

// Show debug messages while running tests.
log.setLevel("debug");

// Start / stop a new matchmaking server for each test.
let server: Server | undefined;
beforeEach(() => {
  server = new Server();
  return server.start();
});
afterEach(() => {
  server!.close();
});

test("Create and teardown server.", () => {});

test("Register one client.", (done) => {
  let client = new TestClient();
  client.onMessage((msg: ServerMessage) => {
    expect(msg.kind).toBe("registration-success");
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

test("Get ICE servers", (done) => {
  let client = new TestClient();

  client.onMessage((msg: ServerMessage) => {
    if (msg.kind == "registration-success") {
      client.sendMessage({
        kind: "request-ice-servers",
      });
    } else if (msg.kind == "ice-servers") {
      expect(msg).toHaveProperty("servers");
      client.close();
      done();
    }
  });
});

test("Send signaling messages between two clients.", (done) => {
  let clientA = new TestClient();
  let idA: string | undefined;

  let clientB = new TestClient();
  let idB: string | undefined;

  clientA.onMessage((msg: ServerMessage) => {
    console.log(msg);
    if (msg.kind == "registration-success") {
      idA = msg.clientID;
    }
  });

  clientB.onMessage((msg: ServerMessage) => {
    if (msg.kind == "registration-success") {
      console.log(msg);
      idB = msg.clientID;
      clientA.sendMessage({
        kind: "send-message",
        destinationID: idB,
        type: "offer",
        payload: "SDP-OFFER",
      });
    } else if (msg.kind == "peer-message") {
      expect(msg.sourceID).toBe(idA);
      expect(msg.type).toBe("offer");
      expect(msg.payload).toBe("SDP-OFFER");

      clientA.close();
      clientB.close();
      done();
    }
  });
});

test("Send signaling message to client that doesn't exist.", (done) => {
  let client = new TestClient();

  client.on("open", () => {
    client.sendMessage({
      kind: "send-message",
      destinationID: "00000000-0000-0000-0000-000000000000",
      type: "offer",
      payload: "SDP-OFFER",
    });
  });

  client.onMessage((msg: ServerMessage) => {
    if (msg.kind == "send-message-failure") {
      done();
      client.close();
    }
  });
});
