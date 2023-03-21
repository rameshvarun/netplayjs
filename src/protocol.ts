export const PROTOCOL_VERSION = 1;

export type ClientMessage =
  | {
      kind: "send-message";
      destinationID: string;
      type: "offer" | "answer" | "candidate";
      payload: string;
    }
  | {
      kind: "request-ice-servers";
    }
  | {
      kind: "match-request";

      /**
       * The game that we are searching for a match for. You will only
       * be matched with people in the same game.
       */
      game: string;

      /**
       * The version of the game. You will only be matched with people
       * that have the same version number.
       */
      version: number;

      /**
       * The peerjs ID that people can use to connect to you.
       */
      clientID: string;
    };

export type ServerMessage =
  | {
      kind: "send-message-failure";
      destinationID: string;
      reason: string;
    }
  | {
      kind: "peer-message";
      sourceID: string;
      type: "offer" | "answer" | "candidate";
      payload: string;
    }
  | {
      kind: "registration-success";
      clientID: string;
    }
    | {
      kind: "server-error";
      reason: string;
    }
  | {
      kind: "ice-servers";
      servers: any;
    }
  | {
      /**
       * The server tells the client to act as a host and wait for
       * incoming connections.
       */
      kind: "host-match";
    }
  | {
      /**
       * The server tells the client to act as a client and connect
       * to the specified id.
       */
      kind: "join-match";
      hostID: string;
    };
