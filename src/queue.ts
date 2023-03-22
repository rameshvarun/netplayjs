import EventEmitter from "eventemitter3";

type MatchRequest = {
  clientID: string;
};

type MatchEvent = {
  hostID: string;
  clientIDs: Array<string>;
};

export class MatchmakingQueue extends EventEmitter {
  /** A map of gameID -> a list of match requests. */
  requests: Map<string, Array<MatchRequest>> = new Map();

  /**
   * A map of clientID -> gameID. Any client in the map
   * should have an active match request.
   */
  clients: Map<string, string> = new Map();

  constructor() {
    super();
  }

  /** Check if this client has an active match request. */
  hasClient(clientID: string): boolean {
    return this.clients.has(clientID);
  }

  addRequest(clientID: string, gameID: string) {
    // Add to our list of clients.
    this.clients.set(clientID, gameID);

    // If we don't have a queue for this gameID, create one.
    if (!this.requests.has(gameID)) {
      this.requests.set(gameID, []);
    }

    // Add client to the queue for this gameID.
    this.requests.get(gameID)!.push({
      clientID: clientID,
    });
  }

  /** Remove a matchmaking request, if it exists. */
  tryRemoveRequest(clientID) {
    // Check if this client has an ongoing request.
    if (this.hasClient(clientID)) {
      // Get the game ID for this client.
      const gameID = this.clients.get(clientID)!;

      // Delete client from global map.
      this.clients.delete(clientID);

      // Get the corresponding queue and remove the client.
      let queue = this.requests
        .get(gameID)!
        .filter((r) => r.clientID != clientID);

      if (queue.length > 0) {
        // If the queue is non-empty, set it back into our map.
        this.requests.set(gameID, queue);
      } else {
        // If the queue is now empty, delete the key.
        this.requests.delete(gameID);
      }
    }
  }

  tryMatch() {
    let entries = Array.from(this.requests.entries());

    for (let [gameID, queue] of entries) {
      while (queue.length > 1) {
        const host = queue.pop()!;
        const client = queue.pop()!;

        this.emit("match", {
          hostID: host.clientID,
          clientIDs: [client.clientID],
        } as MatchEvent);
      }

      // If the queue is now empty, clear that entry from the map.
      if (queue.length == 0) {
        this.requests.delete(gameID);
      }
    }
  }
}
