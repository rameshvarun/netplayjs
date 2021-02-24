// import { JSONValue } from "../json";
// import { NetplayInput, NetplayPlayer } from "../types";
// import { get } from "../utils";

// export interface Simulation<TInput extends NetplayInput<TInput>> {
//   tick(playerInputs: Map<NetplayPlayer, TInput>): void;
//   serialize(): JSONValue;
// }

// export interface Viewer {
//   deserialize(value: JSONValue);
// }

// export interface SnapshotPlaybackNetcode {
//     start(): void;
// }

// export class SnapshotPlaybackHost<
//   TState extends Simulation<TInput>,
//   TViewer extends Viewer,
//   TInput extends NetplayInput<TInput>
// > implements SnapshotPlaybackNetcode {
//   /** The current state of the simulation. */
//   state: TState;

//   /** The host's local simulation viewer. */
//   viewer: TViewer;

//   /** The frame number that the simulation is on. */
//   frame: number = 0;

//   /** A list of players in the match. */
//   players: Array<NetplayPlayer>;

//   /** The most recently updated set of inputs from each player. */
//   inputs: Map<NetplayPlayer, TInput>;

//   pollInput: () => TInput;

//   broadcastSnapshot: (frame: number, state: JSONValue) => void;

//   timestep: number;

//   constructor(
//     initialState: TState,
//     viewer: TViewer,
//     players: Array<NetplayPlayer>,
//     initialInputs: Map<NetplayPlayer, TInput>,
//     timestep: number,
//     pollInput: () => TInput,
//     broadcastSnapshot: (frame: number, state: JSONValue) => void
//   ) {
//     this.state = initialState;
//     this.viewer = viewer;
//     this.players = players;
//     this.inputs = initialInputs;
//     this.pollInput = pollInput;
//     this.timestep = timestep;
//     this.broadcastSnapshot = broadcastSnapshot;
//   }

//   getLocalPlayer() {
//     return this.players.filter((p) => p.isLocalPlayer())[0];
//   }

//   tick() {
//     // Update our local input.
//     this.inputs.set(this.getLocalPlayer(), this.pollInput());

//     // Update the state with the most recent inputs.
//     this.state.tick(this.inputs);

//     // Increment the frame counter.
//     this.frame++;

//     // Snapshot the state and send it out.
//     let snapshot = this.state.snapshot();
//     this.broadcastSnapshot(this.frame, snapshot);

//     // Update our local state viewer.
//     this.viewer.loadSnapshot(snapshot);

//     // Replace player inputs with predictions.
//     for (let player of this.players) {
//       let prediction = get(this.inputs, player).predictNext();
//       this.inputs.set(player, prediction);
//     }
//   }

//   start() {
//     setInterval(() => {
//       this.tick();
//     }, this.timestep);
//   }
// }
