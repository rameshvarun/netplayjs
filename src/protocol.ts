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
    };
