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
  queue.addRequest("CLIENTID", "GAMEID", 2, 2);

  expect(queue.numClients()).toBe(1);
  queue.tryRemoveRequest("CLIENTID");
  expect(queue.numClients()).toBe(0);

  checkInvariants(queue);
});

test("Create a two player match.", () => {
  const queue = new MatchmakingQueue();
  queue.addRequest("CLIENTA", "GAMEID", 2, 2);
  queue.addRequest("CLIENTB", "GAMEID", 2, 2);

  const matches = jest.fn();
  queue.on("match", matches);

  expect(queue.numClients()).toBe(2);
  queue.tryMatch();
  expect(queue.numClients()).toBe(0);

  expect(matches.mock.calls).toHaveLength(1);

  if (matches.mock.calls[0][0].hostID == "CLIENTA") {
    expect(matches.mock.calls[0][0].clientIDs).toMatchObject(["CLIENTB"]);
  } else if (matches.mock.calls[0][0].hostID == "CLIENTB") {
    expect(matches.mock.calls[0][0].clientIDs).toMatchObject(["CLIENTA"]);
  } else {
    fail();
  }

  checkInvariants(queue);
});

test("The number of clients is between minPlayers and maxPlayers.", () => {
  const queue = new MatchmakingQueue();

  queue.addRequest("CLIENT1", "GAMEID", 2, 4);
  queue.addRequest("CLIENT2", "GAMEID", 2, 4);
  queue.addRequest("CLIENT3", "GAMEID", 2, 4);

  expect(queue.numClients()).toBe(3);
  queue.tryMatch();
  expect(queue.numClients()).toBe(0);

  checkInvariants(queue);
});

test("The number of clients is greater than maxPlayers.", () => {
  const queue = new MatchmakingQueue();

  queue.addRequest("CLIENT1", "GAMEID", 2, 4);
  queue.addRequest("CLIENT2", "GAMEID", 2, 4);
  queue.addRequest("CLIENT3", "GAMEID", 2, 4);
  queue.addRequest("CLIENT4", "GAMEID", 2, 4);
  queue.addRequest("CLIENT5", "GAMEID", 2, 4);

  expect(queue.numClients()).toBe(5);
  queue.tryMatch();
  expect(queue.numClients()).toBe(1);

  checkInvariants(queue);
});
