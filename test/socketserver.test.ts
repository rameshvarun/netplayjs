import { Server } from "../src/server";
import * as socketserver from "../src/socketserver";
import * as log from "loglevel";
import { ClientMessage, ServerMessage } from "../src/common/protocol";
import { TestClient } from "./testclient";

// Show debug messages while running tests.
log.setLevel("debug");

// Start / stop a new matchmaking server for each test.
let server: Server | undefined;
beforeEach(async () => {
  jest.replaceProperty(socketserver, "HEARTBEAT_INTERVAL", 100);
  server = new Server();
  await server.start();
});
afterEach(async () => {
  await server!.close();
  jest.restoreAllMocks();
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

test("Make a match between two clients.", async () => {
  const clientA = new Promise((resolve) => {
    let clientA = new TestClient();
    clientA.onMessage((msg: ServerMessage) => {
      if (msg.kind == "registration-success") {
        clientA.sendMessage({
          kind: "match-request",
          gameID: "game-id",
          maxPlayers: 2,
          minPlayers: 2,
        });
      } else if (msg.kind == "join-match" || msg.kind == "host-match") {
        clientA.close();
        resolve(msg);
      }
    });
  });

  const clientB = new Promise((resolve) => {
    let clientB = new TestClient();
    clientB.onMessage((msg: ServerMessage) => {
      if (msg.kind == "registration-success") {
        clientB.sendMessage({
          kind: "match-request",
          gameID: "game-id",
          maxPlayers: 2,
          minPlayers: 2,
        });
      } else if (msg.kind == "join-match" || msg.kind == "host-match") {
        clientB.close();
        resolve(msg);
      }
    });
  });

  const aResult = await clientA;
  const bResult = await clientB;
});

test("Old connection cleanup", (done) => {
  let client = new TestClient();
  client.on("open", () => {
    let interval = setInterval(() => {
      if (server?.socketServer.numRegisteredConnections() == 0) {
        clearInterval(interval);
        done();
      }
    }, 100);

    // @ts-ignore
    client._socket.removeAllListeners("data");
  });
});
