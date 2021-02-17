export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue };
export interface JSONArray extends Array<JSONValue> {}

export abstract class NetplayState<
  TState extends NetplayState<TState, TInput>,
  TInput extends NetplayInput<TInput>
> {
  abstract tick(playerInputs: Map<NetplayPlayer, TInput>): void;

  abstract serialize(): JSONValue;
  abstract deserialize(value: JSONValue): void;
}

export abstract class NetplayInput<TInput extends NetplayInput<TInput>> {
  abstract predictNext(): TInput;
  abstract serialize(): JSONValue;
}

export interface NetplayPlayer {
  isLocalPlayer(): boolean;
  isRemotePlayer(): boolean;
  isServer(): boolean;
  isClient(): boolean;
  getID(): number;
}

export interface GameType<TState, TInput> {
  // Given a list of players, return the initial game state and initial inputs.
  getInitialStateAndInputs(
    players: Array<NetplayPlayer>
  ): [TState, Map<NetplayPlayer, TInput>];

  // The game simulation timestep, in milliseconds.
  timestep: number;

  // The dimensions of the rendering canvas.
  canvasWidth: number;
  canvasHeight: number;

  getInputFromJSON(json: any): TInput;

  draw(state: TState, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D);

  getInputReader(
    document: HTMLDocument,
    canvas: HTMLCanvasElement
  ): () => TInput;
}
