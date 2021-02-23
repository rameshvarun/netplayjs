/**
 * Backwards reconciliation is a netcode algorithm that scales effectively to larger player counts.
 * It's the most common algorithm used in first-person shooters.
 *
 * Although it shares some similarities with rollback, there are differences. In rollback, for an N
 * player game, a client might run up to (N - 1) rollback / resimulates, up to a duration of
 * MAX_PREDICTED_FRAMES each. This quickly becomes an issue for larger player counts.
 *
 * Rollback and lockstep also have the problem that when one player fails to send inputs, the game
 * locks. Backwards reconciliation hosts always tick forward at a constant rate. The game only
 * locks when when the host stalls.
 *
 * Backwards reconciliation hosts are very simple. They always tick forward at a constant rate.
 * client inputs either arrive early, at which point they are queued, or they arrive late, at
 * where they are rejected. If an input doesn't arrive in time, a predicted input is used instead.
 * The client is more complicated. It's job
 *
 * Resources:
 * - Quake-style FPS netcode in Unity: https://github.com/minism/fps-netcode
 * - Overwatch Network Architecture: https://www.youtube.com/watch?v=W3aieHjyNvw
 */

import { assert } from "chai";
import { DEV } from "../debugging";
import { JSONValue } from "../json";
import { NetplayInput, NetplayPlayer, NetplayState } from "../types";
import { clone, get, shift } from "../utils";
import EWMASD from "../ewmasd";
import log from "loglevel";

export class BackwardsReconciliationHost<
  TState extends NetplayState<TInput>,
  TInput extends NetplayInput<TInput>
> {
  /** The current state of the match simulation. */
  state: TState;

  /** The frame number that the simulation is on. */
  frame: number = 0;

  /** A list of players in the match. */
  players: Array<NetplayPlayer>;

  /**
   * The inputs from the previous frame that were used to
   * produce the current game state.
   */
  previousInputs: Map<NetplayPlayer, TInput>;

  /**
   * Queued inputs from players where input.frame > this.frame.
   */
  queuedInputs: Map<
    NetplayPlayer,
    Array<{ frame: number; input: TInput; receivedTimestamp: number }>
  >;

  /**
   * A buffer storing a history of timestamps for when a frame was ticked.
   */
  frameTimes: Array<{ frame: number; timestamp: number }>;

  pollInput: () => TInput;

  reportInputLatency: (
    player: NetplayPlayer,
    frame: number,
    accepted: boolean,
    latency: number | null,
  ) => void;

  broadcastStateUpdate: (
    frame: number,
    state: JSONValue,
    inputs: Map<NetplayPlayer, TInput>
  ) => void;

  constructor(
    initialState: TState,
    players: Array<NetplayPlayer>,
    initialInputs: Map<NetplayPlayer, TInput>
  ) {
    this.state = initialState;
    this.players = players;
    this.previousInputs = initialInputs;

    for (let player of players) {
      this.queuedInputs.set(player, []);
    }
  }

  getFrameTime(frame: number): number | null {
    DEV && assert.isBelow(frame, this.frame);
    for (let frameTime of this.frameTimes) {
      if (frameTime.frame === frame) return frameTime.timestamp;
    }
    return null;
  }

  onRemoteInput(frame: number, player: NetplayPlayer, input: TInput) {
    let receivedTimestamp = Date.now();

    if (frame < this.frame) {
      // If this frame arrived late, look up the frame time in the history
      let frameTime = this.getFrameTime(frame);

      // If the frame time is still in the frame time buffer, report the latency.
      // Otherwise the latency is null and the clinet needs to take drastic action.
      let latency = frameTime
        ? frameTime - receivedTimestamp
        : null;
      this.reportInputLatency(player, frame, false, latency);
    } else {
      // This input arrived early, so put it in the queue.
      let queue = get(this.queuedInputs, player);
      queue.push({
        frame: frame,
        input: input,
        receivedTimestamp: receivedTimestamp,
      });
    }
  }

  tick() {
    // This is the time that we start a tick at.
    let tickTimestamp = Date.now();

    // Try to construct the inputs from our state.
    let inputs: Map<NetplayPlayer, TInput> = new Map();
    for (let player of this.players) {
      let queue = get(this.queuedInputs, player);
      if (player.isLocalPlayer()) {
        inputs.set(player, this.pollInput());
      } else if (queue.length > 0 && queue[0].frame === this.frame) {
        // We have an input for this player in the queue.
        let input = shift(queue);
        inputs.set(player, input.input);

        // Report the difference in time between when this input was ticked and when
        // the input arrived. The clients must keep this number positive, AKA
        // inputs are arriving before the server ticks that frame. Otherwise their
        // inputs will be dropped.
        this.reportInputLatency(
          player,
          input.frame,
          true,
          tickTimestamp - input.receivedTimestamp
        );
      } else {
        // The client input has not arrived. Too bad! They get a prediction.
        let input = get(this.previousInputs, player).predictNext();
        inputs.set(player, input);
      }
    }

    // Tick the state forward.
    this.state.tick(inputs);

    // Store the time of when this frame was ticked.
    this.frameTimes.push({
      frame: this.frame,
      timestamp: tickTimestamp,
    });

    // Increment the frame counter.
    this.frame++;

    // The current inputs are now our previous inputs.
    this.previousInputs = inputs;

    // Send out the updated state, plus the associated inputs.
    // This allows clients to predict forwards.
    this.broadcastStateUpdate(
      this.frame,
      this.state.serialize(),
      this.previousInputs
    );
  }
}

class RewindHistory<TInput extends NetplayInput<TInput>> {
  /**
   * The frame number that this history entry represents.
   */
  frame: number;

  /**
   * The serialized state of the game at this frame.
   */
  state: JSONValue;

  /**
   * These inputs represent the set of inputs that produced this state
   * from the previous state.
   * Eg: history[n].state = history[n - 1].state.tick(history[n].inputs)
   */
  inputs: Map<NetplayPlayer, TInput>;

  constructor(
    frame: number,
    state: JSONValue,
    inputs: Map<NetplayPlayer, TInput>
  ) {
    this.frame = frame;
    this.state = state;
    this.inputs = inputs;
  }
}

export class BackwardsReconciliationClient<
  TState extends NetplayState<TInput>,
  TInput extends NetplayInput<TInput>
> {
  /**
   * The rewind history buffer. This is simplified from rollback in that
   * it maintains two invariants.
   * 1. history[0] is always the last authoritative frame from the server.
   * 2. history[n] where n > 1 is always a client-side predicted frame.
   * Also, the rewind buffer doesn't actually need to store the state,
   * since any time we rewind, we just received an authoritative sync.
   */
  history: Array<RewindHistory<TInput>>;

  /** The current state of the match simulation. */
  state: TState;

  /** The timestep of our game. */
  timestep: number;

  /**
   * A measure of the latency, as measured by time_frame_ticked - time_input_received.
   * This is reported by the server back to the client. Our goal is to keep this above
   * a given buffer value.
   */
  inputLatency: EWMASD = new EWMASD(0.2);

  players: Array<NetplayPlayer>;

  pollInput: () => TInput;
  sendInput: (frame: number, input: TInput) => void;

  latencyBuffer: number = 1000 / 60;

  getTimescaleRatio(): number {
    return 1;
  }

  onInputLatencyReport(frame: number, latency: number | null) {
    if (latency) {
      this.inputLatency.update(latency);

      // If we are behind, immediately tick forward.
    } else {
      // Trigger a reset?
    }
  }

  onStateUpdate(
    frame: number,
    state: JSONValue,
    inputs: Map<NetplayPlayer, TInput>
  ) {
    // Assuming invariant that history[0] is last authoritative frame, the
    // next authoritative frame must be received after.
    DEV && assert.isAbove(frame, this.history[0].frame);

    // Get the most recent state.
    const lastState = this.history[this.history.length - 1];

    if (frame > lastState.frame) {
      // We haven't even simulated this state. We are way behind and
      // need to trigger a full reset.

      // Reset the history.
      this.history = [new RewindHistory(frame, state, inputs)];

      // Reset to the authoritative state.
      this.state.deserialize(state);
    } else {
      // We have simulated this state. We need to rewind to this state and replay.

      // Drop all old states.
      while (this.history[0].frame < frame) shift(this.history);
      DEV && assert.isNotEmpty(this.history);

      // Update history[0] with the authritative state.
      DEV && assert.equal(this.history[0].frame, frame);
      this.history[0].state = state;
      this.history[0].inputs = inputs;

      // Rewind the state.
      this.state.deserialize(this.history[0].state);

      // Resimulate forward.
      for (let i = 1; i < this.history.length; ++i) {
        const previousState = this.history[i - 1];
        const currentState = this.history[i];

        // Inputs from remote players have to be re-predicted.
        // Our local inputs remain the same.
        for (let player of this.players) {
          if (player.isRemotePlayer()) {
            let previousInput = get(previousState.inputs, player);
            currentState.inputs.set(player, previousInput.predictNext());
          }
        }

        this.state.tick(currentState.inputs);
        this.history[i].state = this.state.serialize();
      }

      DEV &&
        log.debug(
          `Resimulated ${this.history.length - 1} states after state sync.`
        );
    }
  }

  tick() {
    // Get the most recent state.
    const lastState = this.history[this.history.length - 1];

    // Construct the new map of inputs for this frame.
    const inputs: Map<NetplayPlayer, TInput> = new Map();

    for (const player of this.players) {
      if (player.isLocalPlayer()) {
        // Local player gets the local input.
        let localInput = this.pollInput();
        inputs.set(player, localInput);

        // Send the input to the server.
        // TODO: verify that this is the correct frame number.
        this.sendInput(lastState.frame, localInput);
      } else {
        // Every other player get a predicted input.
        let input = get(lastState.inputs, player).predictNext();
        inputs.set(player, input);
      }
    }

    this.state.tick(inputs);

    // Add a history entry into our rewind buffer.
    this.history.push(
      new RewindHistory(
        lastState.frame + 1,
        clone(this.state.serialize()),
        inputs
      )
    );
  }

  start() {
    // Accumulate time and drain that time as we simulate frames.
    let accumulator = 0;
    setInterval(() => {
      // Handle speed up / slow down by increasing the accumulator faster / slower.
      accumulator += this.timestep * this.getTimescaleRatio();

      while (accumulator >= this.timestep) {
        this.tick();
        accumulator -= this.timestep;
      }
    }, this.timestep);
  }
}
