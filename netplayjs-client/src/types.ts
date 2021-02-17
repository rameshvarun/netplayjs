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
  getStateFromJSON(json: any): TState;

  draw(state: TState, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D);

  getInputReader(
    document: HTMLDocument,
    canvas: HTMLCanvasElement
  ): () => TInput;
}
