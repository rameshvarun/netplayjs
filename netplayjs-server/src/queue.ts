import { EventEmitter } from "eventemitter3";
import { Opaque } from "type-fest";
import * as utils from "./utils";

export type MatchRequest = {
  clientID: string;
  minPlayers: number;
  maxPlayers: number;
};

/**
 * The queue emits MatchEvents when
 * a match is successfully found.
 */
export type MatchEvent = {
  hostID: string;
  clientIDs: Array<string>;
};

/** Every 3 seconds, we run our matchmaking algorithm. */
export const MATCHMAKING_TICK_TIMER = 3 * 1000;

/**
 * Players can only match with others with the same QueueID.
 * A QueueID is determined by gameID, minPlayers, and maxPlayers.
 * This means that even if the gameID is the same, if the minPlayer
 * and maxPlayer counts are different, these players wont be matched
 * together.
 */
type QueueID = Opaque<string, "QueueID">;

/**
 * Construct a QueueID.
 */
function getQueueID(
  gameID: string,
  minPlayers: number,
  maxPlayers: number
): QueueID {
  return `${gameID}-${minPlayers}-${maxPlayers}` as QueueID;
}

/** The class handles all public matchmaking. */
export class MatchmakingQueue extends EventEmitter {
  /** A map of queueID -> a list of match requests. */
  requests: Map<QueueID, Array<MatchRequest>> = new Map();

  /**
   * A map of clientID -> queueID. Any client in the map
   * should have an active match request.
   */
  clients: Map<string, QueueID> = new Map();

  constructor() {
    super();
  }

  numClients(): number {
    return this.clients.size;
  }

  numGames(): number {
    return this.requests.size;
  }

  /** Check if this client has an active match request. */
  hasClient(clientID: string): boolean {
    return this.clients.has(clientID);
  }

  addRequest(
    clientID: string,
    gameID: string,
    minPlayers: number,
    maxPlayers: number
  ) {
    if (minPlayers < 2) throw new Error("minPlayers must be at least 2.");
    if (maxPlayers < minPlayers)
      throw new Error("maxPlayers must be at least greater than minPlayers.");

    // Add to our list of clients.
    const queueID = getQueueID(gameID, minPlayers, maxPlayers);
    this.clients.set(clientID, queueID);

    // If we don't have a queue for this gameID, create one.
    if (!this.requests.has(queueID)) {
      this.requests.set(queueID, []);
    }

    // Add client to the queue for this gameID.
    this.requests.get(queueID)!.push({
      clientID,
      minPlayers,
      maxPlayers,
    });
  }

  /** Remove a matchmaking request, if it exists. */
  tryRemoveRequest(clientID) {
    // Check if this client has an ongoing request.
    if (this.hasClient(clientID)) {
      // Get the game ID for this client.
      const queueID = this.clients.get(clientID)!;

      // Delete client from global map.
      this.clients.delete(clientID);

      // Get the corresponding queue and remove the client.
      let queue = this.requests
        .get(queueID)!
        .filter((r) => r.clientID != clientID);

      if (queue.length > 0) {
        // If the queue is non-empty, set it back into our map.
        this.requests.set(queueID, queue);
      } else {
        // If the queue is now empty, delete the key.
        this.requests.delete(queueID);
      }
    }
  }

  /** Try to form as many matches as possible. */
  tryMatch() {
    // Get a copy of our entries, because we are are going to modify while iterating.
    const entries = Array.from(this.requests.entries());

    for (const [queueID, queue] of entries) {
      // Shuffle our queue to help with fairness.
      utils.shuffleInPlace(queue);

      // Get the min and max player count for this queue.
      const { minPlayers, maxPlayers } = queue[0];

      while (queue.length >= minPlayers) {
        const numPlayers = Math.min(queue.length, maxPlayers);
        const players = queue.splice(0, numPlayers);

        // Delete these players from the request list.
        for (let player of players) {
          this.clients.delete(player.clientID);
        }

        // Pick one player to be the host.
        const host = players.shift()!;

        // Emit a match event.
        this.emit("match", {
          hostID: host.clientID,
          clientIDs: players.map((p) => p.clientID),
        });
      }

      // If the queue is now empty, clear that entry from the map.
      if (queue.length == 0) {
        this.requests.delete(queueID);
      }
    }
  }

  interval?: NodeJS.Timer;

  start() {
    this.interval = setInterval(() => {
      this.tryMatch();
    }, MATCHMAKING_TICK_TIMER);
  }

  stop() {
    clearInterval(this.interval!);
  }
}
