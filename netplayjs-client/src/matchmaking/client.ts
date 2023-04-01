import EventEmitter from "eventemitter3";
import log from "loglevel";
import { ClientMessage, MessageType, ServerMessage } from "@vramesh/netplayjs-common/matchmaking-protocol";
import { TypedEvent } from "@vramesh/netplayjs-common/typedevent";
import { PeerConnection } from "./peerconnection";

export const DEFAULT_SERVER_URL = "https://netplayjs.varunramesh.net";

/**
 * Server URLs are provided using either http:// or https://. We use
 * this URL to connect to any REST endpoints. We can also derive the
 * WebSocket endpoint by changing the protocol to ws:// or wss:// respectively.
 */
function getWebSocketURL(serverURL: string): string {
  const url = new URL(serverURL);
  if (url.protocol === "http:") {
    return `ws://${url.hostname}/`;
  } else if (url.protocol === "https:") {
    return `wss://${url.hostname}/`;
  } else {
    throw new Error(`Unknown protocol: ${url.protocol}`);
  }
}

export class MatchmakingClient {
  /** The URL of the matchmaking server that we are connected to. */
  serverURL: string;

  /** The websocket transport that lets us send messages to the server. */
  ws: WebSocket;

  /**
   * The ID that this client is registed as on the server. This ID is only
   * available after the onRegistered event has been called.
   */
  clientID?: string;

  /**
   * The list of ICE servers that we should forward to WebRTC. This
   * is only set after the onRegistered event has been fired.
   */
  iceServers?: RTCIceServer[];

  /** A map of all the currently active PeerConnections. */
  connections: Map<string, PeerConnection> = new Map();

  /**
   * This event is emitted as result of matchmaking.
   * The server has told us that we should host a public match.
   * */
  onHostMatch: TypedEvent<{ clientIDs: Array<string> }> = new TypedEvent();

  /**
   * This event is emitted as a result of matchmaking.
   * The server has told has that we should join a public match
   * as a client.
   */
  onJoinMatch: TypedEvent<{ hostID: string }> = new TypedEvent();

  /**
   * This event is emitted as soon as a peer tries to establish a connection
   * with us. However, you must still wait until the connection is actually
   * open before sending any data.
   */
  onConnection: TypedEvent<PeerConnection> = new TypedEvent();

  onRegistered: TypedEvent<string> = new TypedEvent();

  constructor(serverURL: string = DEFAULT_SERVER_URL) {
    this.serverURL = serverURL;

    this.ws = new WebSocket(getWebSocketURL(this.serverURL));
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

  /** THis function handles all messages received from the server. */
  onServerMessage(msg: ServerMessage) {
    if (msg.kind === "registration-success") {
      // If we registered successfully, emit an event.
      this.clientID = msg.clientID;
      this.iceServers = msg.iceServers;
      this.onRegistered.emit(this.clientID);
    } else if (msg.kind === "peer-message") {
      // We've received a peer message. Check if we already have a
      // matching PeerConnection.
      if (!this.connections.has(msg.sourceID)) {
        // Create the connection and emit it.
        const connection = new PeerConnection(this, msg.sourceID, false);
        this.connections.set(msg.sourceID, connection);
        this.onConnection.emit(connection);
      }

      // Forward the signaling message to our peer.
      this.connections
        .get(msg.sourceID)!
        .onSignalingMessage(msg.type, msg.payload);
    } else if (msg.kind === "host-match") {
      // The server is telling us to host a match.
      this.onHostMatch.emit({
        clientIDs: msg.clientIDs,
      });
    } else if (msg.kind === "join-match") {
      // The server is telling us to join a match.
      this.onJoinMatch.emit({
        hostID: msg.hostID,
      });
    }
  }

  connectPeer(peerID: string): PeerConnection {
    const connection = new PeerConnection(this, peerID, true);
    this.connections.set(peerID, connection);
    this.onConnection.emit(connection);
    return connection;
  }

  sendMatchRequest(gameID: string, minPlayers: number, maxPlayers: number) {
    this.send({
      kind: "match-request",
      gameID: gameID,
      minPlayers,
      maxPlayers,
    });
  }
}
