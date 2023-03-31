import EventEmitter from "eventemitter3";
import log from "loglevel";
import { ClientMessage, MessageType, ServerMessage } from "../common/protocol";
import { PeerConnection } from "./peerconnection";

export const DEFAULT_NETPLAYJS_SERVER_URL = "https://netplayjs.varunramesh.net";

export class MatchmakingClient extends EventEmitter {
  serverURL: string;

  ws: WebSocket;
  id: string | undefined;
  connections: Map<string, PeerConnection> = new Map();
  iceServers: any;

  getWebSocketURL(): string {
    const url = new URL(this.serverURL);
    if (url.protocol === "http:") {
      return `ws://${url.hostname}/`;
    } else if (url.protocol === "https:") {
      return `wss://${url.hostname}/`;
    } else {
      throw new Error(`Unknown protocol: ${url.protocol}`);
    }
  }

  constructor(serverURL: string = DEFAULT_NETPLAYJS_SERVER_URL) {
    super();

    this.serverURL = serverURL;

    this.ws = new WebSocket(this.getWebSocketURL());
    this.ws.onmessage = (message) => {
      log.debug(`Server -> Client: ${message.data}`);
      this.onServerMessage(JSON.parse(message.data));
    };
  }

  send(msg: ClientMessage) {
    const data = JSON.stringify(msg);
    log.debug(`Client -> Server: ${data}`);
    this.ws.send(data);
  }

  onServerMessage(msg: ServerMessage) {
    if (msg.kind === "registration-success") {
      this.id = msg.clientID;
      this.send({ kind: "request-ice-servers" });
    } else if (msg.kind === "ice-servers") {
      this.iceServers = msg.servers;
      this.emit("ready");
    } else if (msg.kind === "peer-message") {
      if (!this.connections.has(msg.sourceID)) {
        const connection = new PeerConnection(this, msg.sourceID, false);
        this.connections.set(msg.sourceID, connection);
        connection.onSignalingMessage(msg.type, msg.payload);
        this.emit("connection", connection);
      } else {
        this.connections
          .get(msg.sourceID)!
          .onSignalingMessage(msg.type, msg.payload);
      }
    }
  }

  connectPeer(peerID: string): PeerConnection {
    const connection = new PeerConnection(this, peerID, true);
    this.connections.set(peerID, connection);
    this.emit("connection", connection);
    return connection;
  }
}

