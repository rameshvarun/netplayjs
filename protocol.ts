import { z } from "zod";

/**
 * The version number of the matchmaking protocol.
 * This number is incremented whenever a backwards-incompatible change is made.
 */
export const PROTOCOL_VERSION = 1;

/** The types of signaling messages one peer can send to another. */
export const MessageType = z.union([
  z.literal("offer"),
  z.literal("answer"),
  z.literal("candidate"),
]);

/** A message sent from a client to the server. */
export const ClientMessage = z.union([
  /** Send a WebRTC signaling message to a peer. */
  z.object({
    kind: z.literal("send-message"),
    destinationID: z.string().uuid(),
    type: MessageType,
    payload: z.any(),
  }),
  /** Request a list of ICE servers and their credentials. */
  z.object({
    kind: z.literal("request-ice-servers"),
  }),
  /** Matchmaking request. */
  z
    .object({
      kind: z.literal("match-request"),
      gameID: z.string().nonempty(),
      maxPlayers: z.number().min(2),
      minPlayers: z.number().min(2),
    })
    .refine((req) => req.maxPlayers >= req.minPlayers),
]);

export type ClientMessage = z.output<typeof ClientMessage>;

/**
 * A message sent from the server to the client.
 * Server messages don't really need to be validated
 * but this could be useful for debugging / unit testing.
 */
export const ServerMessage = z.union([
  /** Sent as soon as a client connects in order to inform client of their ID. */
  z.object({
    kind: z.literal("registration-success"),
    clientID: z.string().uuid(),
  }),
  /** An unexpected error occurred on the server side. The connection will be terminated. */
  z.object({
    kind: z.literal("server-error"),
    reason: z.string().nonempty(),
  }),
  /** A signaling message failed to send. */
  z.object({
    kind: z.literal("send-message-failure"),
    destinationID: z.string().uuid(),
    reason: z.string().nonempty(),
  }),
  /** Deliver a signaling message from a peer. */
  z.object({
    kind: z.literal("peer-message"),
    sourceID: z.string().uuid(),
    type: MessageType,
    payload: z.any(),
  }),
  /** Return a list of ICE servers and their credentials. */
  z.object({
    kind: z.literal("ice-servers"),
    servers: z.any(),
  }),
  /** Tell the client it should host the match. */
  z.object({
    kind: z.literal("host-match"),
    clientIDs: z.array(z.string().uuid()),
  }),
  /** Tell the client it should join a match hosted by another player. */
  z.object({
    kind: z.literal("join-match"),
    hostID: z.string().uuid(),
  }),
  /** Tell the client it's match request failed. */
  z.object({
    kind: z.literal("match-request-failure"),
    reason: z.string().nonempty(),
  }),
]);

export type ServerMessage = z.output<typeof ServerMessage>;
