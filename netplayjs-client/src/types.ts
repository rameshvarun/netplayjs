export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue };
export interface JSONArray extends Array<JSONValue> {}

import * as autoserialize from "./autoserialize";

export abstract class NetplayState<
  TState extends NetplayState<TState, TInput>,
  TInput extends NetplayInput<TInput>
> {
  abstract tick(playerInputs: Map<NetplayPlayer, TInput>): void;

  /**
   * By default, use the auto serializer.
   */
  serialize(): JSONValue {
    return autoserialize.serialize(this);
  };

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: JSONValue): void {
    autoserialize.deserialize(value as JSONObject, this);
  };
}

export abstract class NetplayInput<TInput extends NetplayInput<TInput>> {
  /**
   * By default, the prediction is to just use the same value.
   */
  predictNext(): TInput {
    // @ts-ignore
    return this;
  };

  /**
   * By default, use the auto serializer.
   */
  serialize(): JSONValue {
    return autoserialize.serialize(this);
  };

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: JSONValue): void {
    autoserialize.deserialize(value as JSONObject, this);
  };
}

export interface NetplayPlayer {
  isLocalPlayer(): boolean;
  isRemotePlayer(): boolean;
  isServer(): boolean;
  isClient(): boolean;
  getID(): number;
}

export interface GameType<TState, TInput> {
  /**
   * Given a list of players, return the initial game state.
   */
  constructInitialState(
    players: Array<NetplayPlayer>
  ): TState;

  /**
   * Construct a new input object with a default value. A new object
   * needs to be constructed, since serialized values will be copied into this.
   */
  constructDefaultInput(): TInput;

  /**
   * The game simulation timestep, in milliseconds.
   */
  timestep: number;

  // The dimensions of the rendering canvas.
  canvasWidth: number;
  canvasHeight: number;

  draw(state: TState, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D);

  getInputReader(
    document: HTMLDocument,
    canvas: HTMLCanvasElement
  ): () => TInput;
}
