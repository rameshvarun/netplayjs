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

  anyInputPredicted(): boolean {
    for (const [player, { isPrediction }] of this.inputs.entries()) {
      if (isPrediction) return true;
    }
    return false;
  }

  allInputsSynced(): boolean {
    return !this.anyInputPredicted();
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

  onRemoteInput(frame: number, player: NetplayPlayer, input: TInput) {
    assert.isTrue(player.isRemotePlayer(), `'player' must be a remote player.`);
    assert.isNotEmpty(this.history, `'history' cannot be empty.`);

    // TODO Handle future inputs

    // Find the first index where the input for this player is a prediction.
    let firstPrediction = 0;
    for (let i = 0; i < this.history.length; ++i) {
      if (this.history[i].isPlayerInputPredicted(player)) {
        // Assuming that input messages from a given client are ordered, the
        // first history with a predicted input for this player is also the
        // frame for which we just recieved a message.
        assert.equal(this.history[i].frame, frame);
        firstPrediction = i;
        break;
      }
    }

    // Rollback and resimulate state.
    for (let i = firstPrediction; i < this.history.length; ++i) {
      let currentState = this.history[i];
      let previousState = this.history[i - 1];

      let currentPlayerInput = get(currentState.inputs, player);
      let previousPlayerInput = get(previousState.inputs, player);

      assert.isTrue(currentPlayerInput.isPrediction);

      if (i === firstPrediction) {
        currentPlayerInput.isPrediction = false;
        currentPlayerInput.input = input;
      } else {
        currentPlayerInput.input = previousPlayerInput.input.predictNext();
      }

      let stateInputs = new Map<NetplayPlayer, TInput>();
      for (const [player, { input }] of currentState.inputs.entries()) {
        stateInputs.set(player, input);
      }
      currentState.state = previousState.state.tick(stateInputs);
    }

    // Cleanup states that are no longer needed.
    while (this.history.length >= 2) {
      let firstState = this.history[0];
      let nextState = this.history[1];

      assert.isTrue(firstState.allInputsSynced());
      if (nextState.allInputsSynced()) shift(this.history);
      else break;
    }
  }

  constructor(
    initialState: TState,
    initialInputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>,
    maxHistorySize: number
  ) {
    this.history = [new NetplayHistory(0, initialState, initialInputs)];
    this.maxHistorySize = maxHistorySize;

    this.future = new Map();
    for (let player of initialInputs.keys()) {
      this.future.set(player, []);
    }
  }

  getState() {
    return this.history[this.history.length - 1].state;
  }

  currentFrame(): number {
    assert.isNotEmpty(this.history, `'history' cannot be empty.`);
    return this.history[this.history.length - 1].frame;
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
