import EventEmitter from "eventemitter3";
import log from "loglevel";
import { ClientMessage, MessageType, ServerMessage } from "./common/protocol";

export class MatchmakingClient extends EventEmitter {
  ws: WebSocket;
  id: string | undefined;
  connections: Map<string, PeerConnection> = new Map();
  iceServers: any;

  constructor() {
    super();

    this.ws = new WebSocket("ws://localhost");
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
      } else {
        this.connections
          .get(msg.sourceID)!
          .onSignalingMessage(msg.type, msg.payload);
      }
    }
  }

  connectPeer(peerID: string) {
    this.connections.set(peerID, new PeerConnection(this, peerID, true));
  }
}

export class PeerConnection extends EventEmitter {
  client: MatchmakingClient;
  peerID: string;
  peerConnection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;

  constructor(client: MatchmakingClient, peerID: string, initiator: boolean) {
    super();

    this.client = client;
    this.peerID = peerID;

    // Create a RTCPeerConnection.
    this.peerConnection = new RTCPeerConnection({
      iceServers: client.iceServers,
    });

    // Send out candidate messages as we generate ICE candidates.
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.client.send({
          kind: "send-message",
          type: "candidate",
          destinationID: peerID,
          payload: event.candidate,
        });
      }
    };

    if (initiator) {
      // Invoked when we are ready to negotiate.
      this.peerConnection.onnegotiationneeded = async () => {
        // Create an offer and send to our peer.
        const offer = await this.peerConnection.createOffer();
        this.client.send({
          kind: "send-message",
          type: "offer",
          destinationID: peerID,
          payload: offer,
        });

        // Install this offer locally.
        await this.peerConnection.setLocalDescription(offer);
      };

      // Create a reliable data channel.
      this.setDataChannel(
        this.peerConnection.createDataChannel("data", {
          ordered: true,
        })
      );
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.setDataChannel(event.channel);
      };
    }
  }

  setDataChannel(dataChannel: RTCDataChannel) {
    this.dataChannel = dataChannel;
    this.dataChannel.onopen = (e) => {
      this.client.emit("connection", this);
      this.emit("open");
    };
    this.dataChannel.onmessage = (e) => {
      this.emit("data", JSON.parse(e.data));
    };
  }

  async onSignalingMessage(type: MessageType, payload: any) {
    log.debug(`onSignalingMessage: ${type}, ${JSON.stringify(payload)}`);
    if (type === "offer") {
      // Set the offer as our remote description.
      await this.peerConnection.setRemoteDescription(payload);

      // Generate an answer and set it as our local description.
      log.debug("Generating answer...");
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send the answer back to our peer.
      this.client.send({
        kind: "send-message",
        type: "answer",
        destinationID: this.peerID,
        payload: answer,
      });
    } else if (type === "answer") {
      // Set the answer as our remote description.
      await this.peerConnection.setRemoteDescription(payload);
    } else if (type === "candidate") {
      // Add this ICE candidate.
      await this.peerConnection.addIceCandidate(payload);
    }
  }

  send(data: any) {
    this.dataChannel!.send(JSON.stringify(data));
  }
}
