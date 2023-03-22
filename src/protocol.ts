// The version of the protocol. This number is incremented whenever a breaking change is made.
export const PROTOCOL_VERSION = 1;

export type MessageType = "offer" | "answer" | "candidate";

// A message sent from a client to the server.
export type ClientMessage =
  | {
      // Send a WebRTC signaling message to a peer.
      kind: "send-message";
      destinationID: string;
      type: MessageType;
      payload: string;
    }
  | {
      // Request a list of ICE servers and their credentials.
      kind: "request-ice-servers";
    };

// A message sent from the server to the client.
export type ServerMessage =
  | {
      // Sent as soon as a client connects in order to inform client of their ID.
      kind: "registration-success";
      clientID: string;
    }
  | {
      // An unexpected error occurred on the server side. The connection will be terminated.
      kind: "server-error";
      reason: string;
    }
  | {
      // A signaling message failed to send.
      kind: "send-message-failure";
      destinationID: string;
      reason: string;
    }
  | {
      // Deliver a signaling message from a peer.
      kind: "peer-message";
      sourceID: string;
      type: MessageType;
      payload: string;
    }
  | {
      // Return a list of ICE servers and their credentials.
      kind: "ice-servers";
      servers: any;
    };
