import EventEmitter from "eventemitter3";
import { MatchmakingClient } from "./client";
import log from "loglevel";
import { MessageType } from "@vramesh/netplayjs-common/matchmaking-protocol";
import * as msgpack from "msgpack-lite";
import { ConnectionStats } from "./stats";
import { TypedEvent } from "@vramesh/netplayjs-common/typedevent";

/** A reliable data connection to a single peer. */
export class PeerConnection extends EventEmitter {
  client: MatchmakingClient;
  peerID: string;
  peerConnection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;

  sendStats: ConnectionStats = new ConnectionStats();
  receiveStats: ConnectionStats = new ConnectionStats();

  onClose: TypedEvent<void> = new TypedEvent();

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

    this.peerConnection.onconnectionstatechange = (event) => {
      log.debug(
        `ConnectionStateChange: ${this.peerConnection.connectionState}`
      );
      if (this.peerConnection.connectionState === "disconnected") {
        this.close();
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

  closed: boolean = false;
  close() {
    if (!closed) {
      this.closed = true;
      this.peerConnection.close();
      this.dataChannel?.close();
      this.onClose.emit();
    }
  }

  setDataChannel(dataChannel: RTCDataChannel) {
    this.dataChannel = dataChannel;
    this.dataChannel.binaryType = "arraybuffer";
    this.dataChannel.onopen = (e) => {
      this.emit("open");
    };
    this.dataChannel.onmessage = (e) => {
      this.receiveStats.onMessage(e.data.byteLength);
      this.emit("data", msgpack.decode(new Uint8Array(e.data as ArrayBuffer)));
    };
    this.dataChannel.onclose = (e) => {
      log.debug("Data channel closed...");
      this.close();
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
    if (this.dataChannel?.readyState !== "open") return;
    let encoded = msgpack.encode(data);
    this.sendStats.onMessage(encoded.byteLength);
    this.dataChannel!.send(encoded);
  }
}
