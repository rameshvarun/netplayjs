import { BasicInput, BasicState, NetplayPlayer } from "../types";

const dev = process.env.NODE_ENV === "development";
const log = dev && require("loglevel");
import expect from "ceylon";

export class LockstepNetcode<
  TState extends BasicState<TInput>,
  TInput extends BasicInput
> {
  /** Whether or not we are the host. The host is responsible for sending out authorative states. */
  isHost: boolean;

  /** The current frame we are on. */
  frame: number = 0;

  /** The current state of the game. */
  state: TState;

  /** The inputs from local / remote players. */
  inputs: Map<NetplayPlayer, TInput>;

  players: Array<NetplayPlayer>;

  broadcastInput: (frame: number, input: TInput) => void;

  constructor(
    isHost: boolean,
    initialState: TState,
    players: Array<NetplayPlayer>,
    broadcastInput: (frame: number, input: TInput) => void,
    broadcastState?: (frame: number, state: TState) => void
  ) {
    this.isHost = isHost;
    this.state = initialState;

    this.inputs = new Map();
    this.players = players;

    this.broadcastInput = broadcastInput;
  }

  tick(localInput: TInput) {
    let localPlayer = this.players.filter((p) => p.isLocalPlayer())[0];

    // If we already have a local input registered, then we cannot
    // use the new input, as we have already broadcasted an input
    // and cannot contradict that.
    if (this.inputs.has(localPlayer)) return;

    // If we don't have a local input registered, register it then
    // broadcast the input.
    this.inputs.set(localPlayer, localInput);
    this.broadcastInput(this.frame, localInput);

    // Check if the game state can be advanced.
    this.tryAdvanceState();
  }

  checkAllInputsRegistered() {
    for (let player of this.players) {
      if (!this.inputs.has(player)) return false;
    }
    return true;
  }

  tryAdvanceState() {
    if (this.checkAllInputsRegistered()) {
      // Tick the stack forward with the complete inputs.
      this.state.tick(this.inputs);

      // Increment our frame counter.
      this.frame++;

      // Clear the inputs for the next frame.
      this.inputs.clear();
    }
  }

  onRemoteInput(frame: number, player: NetplayPlayer, input: TInput) {
    expect(player.isRemotePlayer()).toBeTrue(
      `'player' must be a remote player.`
    );

    expect(this.frame).toBe(
      frame,
      `Got an input for frame ${frame}, but expected frame  ${this.frame}.`
    );

    expect(this.inputs.has(player)).toBeFalse(
      `Got an input for a player when an input has already been registered.`
    );

    // Set the input and try to advance the state.
    this.inputs.set(player, input);
    this.tryAdvanceState();
  }
}
