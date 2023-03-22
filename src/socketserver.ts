import log = require("loglevel");
import { WebSocket, WebSocketServer } from "ws";
import { ClientMessage, ServerMessage } from "./protocol";
import * as crypto from "crypto";
import { getICEServers } from "./iceservers";

// This class is responsible for handling all WebSocket messages from clients.
export class SocketServer {
  wss: WebSocketServer;

  // Register an ID -> Connection mapping so that peers can connect to us.
  registrations: Map<string, WebSocket> = new Map<string, WebSocket>();

  // Type-safe message sending helper.
  send(conn: WebSocket, message: ServerMessage) {
    let data = JSON.stringify(message);
    log.debug(`Sent message: ${data}.`);
    conn.send(data);
  }

  // Returns the number of registered connections.
  numRegisteredConnections(): number {
    return this.registrations.size;
  }

  constructor(wss: WebSocketServer) {
    this.wss = wss;

    this.wss.on("connection", (conn) => {
      // Generate an ID and register the client.
      const clientID = crypto.randomUUID();
      this.registrations.set(clientID, conn);

      // Inform client of successful registration.
      this.send(conn, {
        kind: "registration-success",
        clientID: clientID,
      });

      // Listen for messages.
      conn.on("message", (data: string) => {
        try {
          let msg: ClientMessage = JSON.parse(data);

          if (msg.kind == "send-message") {
            // Check if we have the destination peer registered.
            if (this.registrations.has(msg.destinationID)) {
              // Forward signaling message on to peer.
              this.send(this.registrations.get(msg.destinationID)!, {
                kind: "peer-message",
                type: msg.type,
                sourceID: clientID,
                payload: msg.payload,
              });
            } else {
              // We don't have this peer registered, so report failure.
              this.send(conn, {
                kind: "send-message-failure",
                destinationID: msg.destinationID,
                reason: `No peer found with ID: ${msg.destinationID}.`,
              });
            }
          } else if (msg.kind == "request-ice-servers") {
            getICEServers().then((servers) => {
              this.send(conn, {
                kind: "ice-servers",
                servers: servers,
              });
            });
          }
        } catch (e) {
          // The server failed to process the message.
          this.send(conn, {
            kind: "server-error",
            reason: e.message,
          });
          conn.close();
        }
      });

      conn.on("close", () => {
        // Clear connection from registrations.
        this.registrations.delete(clientID);
      });
    });
  }
}
