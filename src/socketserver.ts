import log = require("loglevel");
import { WebSocket, WebSocketServer } from "ws";
import { ClientMessage, ServerMessage } from "./common/protocol";
import * as crypto from "crypto";
import { getICEServers } from "./iceservers";
import { MatchEvent, MatchmakingQueue } from "./queue";

/**
 * Sockets that don't return a PONG within 30 seconds from
 * a PONG are considered broken and can be closed. */
export const HEARTBEAT_INTERVAL = 30 * 1000;

/** This class is responsible for handling all WebSocket messages from clients. */
export class SocketServer {
  wss: WebSocketServer;

  /** Register an ID -> Connection mapping so that peers can connect to us. */
  registrations: Map<string, WebSocket> = new Map<string, WebSocket>();

  aliveConnections: Set<WebSocket> = new Set();

  queue: MatchmakingQueue = new MatchmakingQueue();

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
      this.aliveConnections.add(conn);
      conn.on("pong", () => {
        this.aliveConnections.add(conn);
      });

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
        log.debug(`Received message: ${data}.`);
        try {
          let msg: ClientMessage = ClientMessage.parse(JSON.parse(data));
          this.processClientMessage(conn, clientID, msg);
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

        // Clear connection from isAlive map.
        this.aliveConnections.delete(conn);

        // Remove connection from queue.
        this.queue.tryRemoveRequest(clientID);
      });
    });

    // Listen for successful matches from our matchmaking queue.
    this.queue.on("match", (match: MatchEvent) => {
      // Inform the host.
      this.send(this.registrations.get(match.hostID)!, {
        kind: "host-match",
        clientIDs: match.clientIDs,
      });

      // Inform the clients.
      for (let clientID of match.clientIDs) {
        this.send(this.registrations.get(clientID)!, {
          kind: "join-match",
          hostID: match.hostID,
        });
      }
    });
  }

  heartbeatInterval: NodeJS.Timer;

  start() {
    this.queue.start();

    // Heartbeat checker for detecting broken connections.
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (!this.aliveConnections.has(client)) {
          client.terminate();
        } else {
          this.aliveConnections.delete(client);
          client.ping();
        }
      });
    }, HEARTBEAT_INTERVAL);
  }

  close() {
    this.queue.stop();
    clearInterval(this.heartbeatInterval);
  }

  processClientMessage(conn: WebSocket, clientID: string, msg: ClientMessage) {
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
      // Generate and return a list of ICE servers.
      getICEServers().then((servers) => {
        this.send(conn, {
          kind: "ice-servers",
          servers: servers,
        });
      });
    } else if (msg.kind == "match-request") {
      if (this.queue.hasClient(clientID)) {
        // If our client is already in the queue, report failure
        // since we can only have one pending match request
        // at a time.
        this.send(conn, {
          kind: "match-request-failure",
          reason: "Client already has ongoing match request.",
        });
      } else {
        // Add this request to the matchmaking queue.
        this.queue.addRequest(
          clientID,
          msg.gameID,
          msg.minPlayers,
          msg.maxPlayers
        );
      }
    }
  }
}
