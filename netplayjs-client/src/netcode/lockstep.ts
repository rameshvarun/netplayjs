import { NetplayInput, NetplayPlayer, NetplayState } from "../types";

import { DEV } from "../debugging";
import { assert } from "chai";

/**
 * Lockstep networking is the simplest networking architecture for games. Each player
 * broadcasts their own local input while waiting for inputs from remote players.
 * Once all remote player imputs have been received, the game can tick forward one step.
 */
export class LockstepNetcode<
  TState extends NetplayState<TInput>,
  TInput extends NetplayInput<TInput>
> {
  /**
   * Whether or not we are the host of this match. The host is responsible for
   * sending our authoritative state updates to prevent non-determinism.
   */
  isHost: boolean;

  /** The current frame we are on. */
  frame: number = 0;

  /** The current state of the game. */
  state: TState;

  /** The partially filled inputs from local / remote players. */
  partialInputs: Map<NetplayPlayer, TInput>;

  /** The list of players that are in this match. */
  players: Array<NetplayPlayer>;

  onRemoteInput(frame: number, player: NetplayPlayer, input: TInput) {
    DEV && assert.isTrue(player.isRemotePlayer(), `'player' must be remote.`);
    DEV &&
      assert.equal(this.frame, frame, `Got an input for an unexpected frame.`);
    DEV &&
      assert.isFalse(
        this.partialInputs.has(player),
        `Got an input for a player when an input has already been registered.`
      );

    // Set the input and try to advance the state.
    this.partialInputs.set(player, input);
    this.tryAdvanceState();
  }

  broadcastInput: (frame: number, input: TInput) => void;

  constructor(
    isHost: boolean,
    initialState: TState,
    players: Array<NetplayPlayer>,
    broadcastInput: (frame: number, input: TInput) => void
  ) {
    this.isHost = isHost;
    this.state = initialState;

    this.partialInputs = new Map();
    this.players = players;

    this.broadcastInput = broadcastInput;
  }

  getLocalPlayer() {
    return this.players.filter((p) => p.isLocalPlayer())[0];
  }

  tick(localInput: TInput) {
    let localPlayer = this.getLocalPlayer();

    // If we already have a local input registered, then we cannot
    // use the new input, as we have already broadcasted an input
    // and cannot contradict that.
    if (this.partialInputs.has(localPlayer)) return;

    // If we don't have a local input registered, register it then
    // broadcast the input.
    this.partialInputs.set(localPlayer, localInput);
    this.broadcastInput(this.frame, localInput);

    // Check if the game state can be advanced.
    this.tryAdvanceState();
  }

  /**
   * Check if we have an input for every player.
   */
  checkAllInputsReady() {
    for (let player of this.players) {
      if (!this.partialInputs.has(player)) return false;
    }
    return true;
  }

  tryAdvanceState() {
    if (this.checkAllInputsReady()) {
      // Tick the stack forward with the complete inputs.
      this.state.tick(this.partialInputs);

      // Increment our frame counter.
      this.frame++;

      // Clear the inputs for the next frame.
      this.partialInputs.clear();
    }
  }
}
