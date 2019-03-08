import { get, shift } from "./utils";

const dev = process.env.NODE_ENV === "development";
const log = dev && require("loglevel");
const assert = dev && require("chai").assert;

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
  maxPredictedFrames: number;

  // Inputs from other players that have already arrived, but have not been
  // applied due to our simulation being behind.
  future: Map<NetplayPlayer, Array<{ frame: number; input: TInput }>>;

  isServer: boolean;

  onStateSync(frame: number, state: TState) {
    dev && assert.isFalse(this.isServer, "Only clients recieve state syncs.");

    // Cleanup states that we don't need anymore because we have the definitive
    // server state. We have to leave at least one state in order to simulate
    // on the next local tick.
    let cleanedUpStates = 0;
    while (this.history.length > 1) {
      dev && assert.isTrue(this.history[0].allInputsSynced());
      if (this.history[0].frame < frame) {
        shift(this.history);
        cleanedUpStates++;
      } else break;
    }
    dev && log.trace(`Cleaned up ${cleanedUpStates} states.`);

    // Update the first state with the definitive server state.
    dev && assert.equal(this.history[0].frame, frame);
    this.history[0].state = state;

    // Resimulate up to the current point.
    for (let i = 1; i < this.history.length; ++i) {
      let currentState = this.history[i];
      let previousState = this.history[i - 1];

      let stateInputs = new Map<NetplayPlayer, TInput>();
      for (const [player, { input }] of currentState.inputs.entries()) {
        stateInputs.set(player, input);
      }
      currentState.state = previousState.state.tick(stateInputs);
    }
    dev &&
      log.trace(
        `Resimulated ${this.history.length - 1} states after state sync.`
      );
  }

  onRemoteInput(frame: number, player: NetplayPlayer, input: TInput) {
    dev &&
      assert.isTrue(
        player.isRemotePlayer(),
        `'player' must be a remote player.`
      );
    dev && assert.isNotEmpty(this.history, `'history' cannot be empty.`);

    // If this input is for a frame that we haven't even simulated, we need to
    // store it in a queue to pull during our next tick.
    if (frame > this.history[this.history.length - 1].frame) {
      get(this.future, player).push({ frame: frame, input: input });
      return; // Skip rest of logic in this function.
    }

    // Find the first index where the input for this player is a prediction.
    let firstPrediction: number | null = null;
    for (let i = 0; i < this.history.length; ++i) {
      if (this.history[i].isPlayerInputPredicted(player)) {
        // Assuming that input messages from a given client are ordered, the
        // first history with a predicted input for this player is also the
        // frame for which we just recieved a message.
        dev && assert.equal(this.history[i].frame, frame);
        firstPrediction = i;
        break;
      }
    }
    dev && assert.exists(firstPrediction);

    // Rollback and resimulate state.
    for (let i = firstPrediction!; i < this.history.length; ++i) {
      let currentState = this.history[i];
      let previousState = this.history[i - 1];

      let currentPlayerInput = get(currentState.inputs, player);
      let previousPlayerInput = get(previousState.inputs, player);

      dev && assert.isTrue(currentPlayerInput.isPrediction);

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

    dev &&
      log.trace(
        `Resimulated ${this.history.length -
          firstPrediction!} states after rollback.`
      );

    // If this is the server, we can cleanup states for which input has been synced.
    if (this.isServer) {
      let cleanedUpStates = 0;
      while (this.history.length >= 2) {
        let firstState = this.history[0];
        let nextState = this.history[1];

        dev && assert.isTrue(firstState.allInputsSynced());
        if (nextState.allInputsSynced()) {
          let syncedState = shift(this.history);
          cleanedUpStates++;
          this.broadcastState!(syncedState.frame, syncedState.state);
        } else break;
      }
      dev && log.trace(`Cleaned up ${cleanedUpStates} states.`);
    }
  }

  broadcastInput: (frame: number, TInput) => void;
  broadcastState?: (frame: number, TState) => void;
  pingMeasure: any;

  constructor(
    isServer: boolean,
    initialState: TState,
    initialInputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>,
    maxPredictedFrames: number,
    pingMeasure: any,
    broadcastInput: (frame: number, TInput) => void,
    broadcastState?: (frame, TState) => void
  ) {
    this.isServer = isServer;
    this.history = [new NetplayHistory(0, initialState, initialInputs)];
    this.maxPredictedFrames = maxPredictedFrames;
    this.broadcastInput = broadcastInput;
    this.pingMeasure = pingMeasure;

    this.future = new Map();
    for (let player of initialInputs.keys()) {
      this.future.set(player, []);
    }

    if (isServer) {
      dev && assert.exists(broadcastState);
      this.broadcastState = broadcastState;
    }
  }

  getState() {
    return this.history[this.history.length - 1].state;
  }

  currentFrame(): number {
    dev && assert.isNotEmpty(this.history, `'history' cannot be empty.`);
    return this.history[this.history.length - 1].frame;
  }

  largestFutureSize(): number {
    return Math.max(...Array.from(this.future.values()).map(a => a.length));
  }

  // Returns the number of frames for which at least one player's input is predicted.
  predictedFrames(): number {
    for (let i = 0; i < this.history.length; ++i) {
      if (!this.history[i].allInputsSynced()) {
        return this.history.length - i;
      }
    }
    return 0;
  }

  // Whether or not we should stall. The general goal of stalling is (1) slow
  // down when our peer's game loop is slowing down. This occurs when the peer
  // is simply a slow CPU, or when the browser throttles the tab. (2) slow
  // down the game when latency is too high to make the game playable.
  shouldStall(): boolean {
    // If we are predicting too many frames, then we have to stall - this
    // condition should only be reached if latency is really bad - consider
    // 3G or other mobile connections.
    if (this.predictedFrames() > this.maxPredictedFrames) return true;

    // Now, let's say we are predicting frames, however the number of frames
    // predicted is greater than what we would expect just from the latency.
    // This means that the other player is running slow, which is very common
    // due to browser throttling of requestAnimationFrame. We should stall in
    // this case.
    return (
      this.predictedFrames() * (1000.0 / 60.0) >
      (this.pingMeasure.average() + this.pingMeasure.stddev()) / 2
    );
  }

  tick(localInput: TInput) {
    dev && assert.isNotEmpty(this.history, `'history' cannot be empty.`);

    // If we should stall, then don't peform a tick at all.
    if (this.shouldStall()) return;

    // Get the most recent state and the current local input.
    const lastState = this.history[this.history.length - 1];

    // Construct the new map of inputs for this frame.
    const newInputs = new Map();
    for (const [player, input] of lastState.inputs.entries()) {
      if (player.isLocalPlayer()) {
        // Local player gets the local input.
        newInputs.set(player, { input: localInput, isPrediction: false });
        this.broadcastInput(lastState.frame + 1, localInput);
      } else {
        if (get(this.future, player).length > 0) {
          // If we have already recieved the player's input (due to our)
          // simulation being behind, then use that input.
          let future = shift(get(this.future, player));
          dev && assert.equal(lastState.frame + 1, future.frame);
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
