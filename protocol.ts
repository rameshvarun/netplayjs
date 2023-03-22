// The version number of the matchmaking protocol.
// This number is incremented whenever a backwards-incompatible change is made.
export const PROTOCOL_VERSION = 1;

/** The types of signaling messages one peer can send to another. */
export type MessageType = "offer" | "answer" | "candidate";

/** A message sent from a client to the server. */
export type ClientMessage =
  | {
      /** Send a WebRTC signaling message to a peer. */
      kind: "send-message";
      destinationID: string;
      type: MessageType;
      payload: any;
    }
  | {
      /** Request a list of ICE servers and their credentials. */
      kind: "request-ice-servers";
    }
  | {
      kind: "match-request";

      /**
       * A unique ID representing the game. You will
       * only be matched to players with the same gameID.
       */
      gameID: string;

      /** The maximum number of players a match can hold. */
      maxPlayers: number;

      /** The minimum number of players required for a match to start. */
      minPlayers: number;
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
      payload: any;
    }
  | {
      // Return a list of ICE servers and their credentials.
      kind: "ice-servers";
      servers: any;
    }
  | {
      /** Tell the client it should host the match. */
      kind: "host-match";

      /** The clients to expect connection requests from. */
      clientIDs: Array<string>;
    }
  | {
      kind: "join-match";
      hostID: string;
    }
  | {
      kind: "match-request-failure";
      reason: string;
    };
