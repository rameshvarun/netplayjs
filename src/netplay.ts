import { assert } from "chai";
import { get, shift } from "./utils";

export interface NetplayState<
  TState extends NetplayState<TState, TInput>,
  TInput extends NetplayInput<TInput>
> {
  tick(playerInputs: Map<NetplayPlayer, TInput>): TState;
}

export interface NetplayInput<TInput extends NetplayInput<TInput>> {
  equals(other: TInput): boolean;
  predictNext(): TInput;
}

export interface NetplayPlayer {
  isLocalPlayer(): boolean;
  isRemotePlayer(): boolean;
  isServer(): boolean;
  isClient(): boolean;
  getID(): number;
}

class NetplayHistory<
  TState extends NetplayState<TState, TInput>,
  TInput extends NetplayInput<TInput>
> {
  frame: number;
  state: TState;
  inputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>;

  constructor(
    frame: number,
    state: TState,
    inputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>
  ) {
    this.frame = frame;
    this.state = state;
    this.inputs = inputs;
  }

  isPlayerInputPredicted(player: NetplayPlayer) {
    return get(this.inputs, player).isPrediction;
  }

  tick(
    newInputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>
  ): NetplayHistory<TState, TInput> {
    let stateInputs = new Map();
    for (const [player, { input }] of newInputs.entries()) {
      stateInputs.set(player, input);
    }

    return new NetplayHistory<TState, TInput>(
      this.frame + 1,
      this.state.tick(stateInputs),
      newInputs
    );
  }
}

export class NetplayManager<
  TState extends NetplayState<TState, TInput>,
  TInput extends NetplayInput<TInput>
> {
  history: Array<NetplayHistory<TState, TInput>>;
  maxHistorySize: number;

  // Inputs from other players that have already arrived, but have not been
  // applied due to our simulation being behind.
  future: Map<NetplayPlayer, Array<{ frame: number; input: TInput }>>;

  onRemoteInput(
    frame: number,
    player: NetplayPlayer,
    input: NetplayInput<TInput>
  ) {
    // assert.isTrue(player.isRemotePlayer(), `'player' must be a remote player.`);
    // assert.isNotEmpty(history, `'history' cannot be empty.`);
    //
    // // TODO Handle future inputs
    //
    // for (let i = 0; i < history.length; ++i) {
    //   if (history[i].isPlayerInputPredicted(player)) {
    //     // Assuming that input messages from a given client are ordered, the
    //     // first history with a predicted input for this player is also the
    //     // frame for which we just recieved a message.
    //     assert.isEqual(history[i].frame, frame);
    //     break;
    //   }
    // }
  }

  constructor(
    initialState: TState,
    initialInputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>,
    maxHistorySize: number
  ) {
    this.history = [new NetplayHistory(0, initialState, initialInputs)];
    this.maxHistorySize = maxHistorySize;
  }

  getState() {
    return this.history[this.history.length - 1].state;
  }

  tick(localInput: TInput) {
    assert.isNotEmpty(this.history, `'history' cannot be empty.`);

    // Get the most recent state and the current local input.
    const lastState = this.history[this.history.length - 1];

    // Construct the new map of inputs for this frame.
    const newInputs = new Map();
    for (const [player, input] of lastState.inputs.entries()) {
      if (player.isLocalPlayer()) {
        // Local player gets the local input.
        newInputs.set(player, { input: localInput, isPrediction: false });
      } else {
        if (get(this.future, player).length > 0) {
          // If we have already recieved the player's input (due to our)
          // simulation being behind, then use that input.
          let future = shift(get(this.future, player));
          assert.equal(lastState.frame + 1, future.frame);
          newInputs.set(player, {
            input: future.input,
            isPrediction: false
          });
        } else {
          // Otherwise, set the next input based off of the previous input.
          newInputs.set(player, {
            input: input.input.predictNext(),
            isPrediction: true
          });
        }
      }
    }

    this.history.push(lastState.tick(newInputs));
  }
}
