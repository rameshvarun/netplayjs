import WebSocket = require("ws");
import * as log from "loglevel";
import { ClientMessage } from "./protocol";

export class RoomsServer {
  wss: WebSocket.Server;

  rooms: Array<{ game: string; version: number; hostID: string }>;

  findRoom(game: string, version: number): string | null {
    let rooms = this.rooms.filter((r) => {
      return r.game === game && r.version === version;
    });
    if (rooms.length > 0) return rooms[0].hostID;
    return null;
  }

  removeRoom(hostID: string) {
    this.rooms = this.rooms.filter((room) => room.hostID != hostID);
  }

  constructor(wss: WebSocket.Server) {
    this.wss = wss;

    this.wss.on("connection", (conn) => {
      let clientID: string | null = null;
      conn.on("message", (data: string) => {
        log.debug(`Received data: ${data}.`);
        let msg: ClientMessage = JSON.parse(data);

        if (msg.kind === "match-request") {
          if (clientID) throw new Error(`Already sent a match request.`);

          clientID = msg.clientID;

          let hostID = this.findRoom(msg.game, msg.version);
          if (!hostID) {
            // If we found no room, then tell this client that
            // it has to be a host.
            this.rooms.push({
              game: msg.game,
              version: msg.version,
              hostID: msg.clientID,
            });
            let resp: ServerMessage = { kind: "host-match" };
            conn.send(JSON.stringify(resp));
          } else {
            // If we found a room, tell our client to join that room
            // and clear it from the list.
            let resp: ServerMessage = { kind: "join-match", hostID: hostID };
            conn.send(JSON.stringify(resp));
            this.removeRoom(hostID);
          }
        }
      });

      conn.on("close", () => {
        // If a client disconnects, clear up and rooms that might be associated with that client.
        if (clientID) {
          this.removeRoom(clientID);
        }
      });
    });
  }

  close() {
    this.wss.close();
  }
}
