import { MatchmakingQueue } from "../src/queue";
import * as log from "loglevel";

// Show debug messages while running tests.
log.setLevel("debug");

function checkInvariants(queue: MatchmakingQueue) {
  // All queues have at least one player.
  for (let [gameID, gameQueue] of queue.requests) {
    expect(gameQueue.length).toBeGreaterThan(0);
  }

  // Number of clients matches number of requests.
  const count = Array.from(queue.requests.values())
    .map((q) => q.length)
    .reduce((a, b) => a + b, 0);
  expect(queue.clients.size).toEqual(count);
}

test("Create a Matchmaking queue.", () => {
  const queue = new MatchmakingQueue();
  checkInvariants(queue);
});

test("Create a Matchmaking queue and add a single request.", () => {
  const queue = new MatchmakingQueue();
  queue.addRequest("CLIENTID", "GAMEID");

  expect(queue.numClients()).toBe(1);
  queue.tryRemoveRequest("CLIENTID");
  expect(queue.numClients()).toBe(0);

  checkInvariants(queue);
});

test("Create a single match.", () => {
  const queue = new MatchmakingQueue();
  queue.addRequest("CLIENTA", "GAMEID");
  queue.addRequest("CLIENTB", "GAMEID");

  const matches = jest.fn();
  queue.on("match", matches);

  expect(queue.numClients()).toBe(2);
  queue.tryMatch();
  expect(queue.numClients()).toBe(0);

  expect(matches.mock.calls).toHaveLength(1);
  expect(matches.mock.calls[0][0]).toMatchObject({
    hostID: "CLIENTB",
    clientIDs: ["CLIENTA"],
  });

  checkInvariants(queue);
});
