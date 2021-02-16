/**
 * This interface represents a player. A player can either be local or remote,
 * a client or a host.
 */
export interface NetplayPlayer {
  isLocalPlayer(): boolean;
  isRemotePlayer(): boolean;
  isHost(): boolean;
  isClient(): boolean;
  getID(): number;
}

/**
 * This interface represents a basic input that is opaque to the netcode. This
 * can only be used for lockstep.
 */
export interface BasicInput {}

/**
 * This interface represents a state that can be ticked forwards.
 */
export interface BasicState<TInput extends BasicInput> {
  tick(playerInputs: Map<NetplayPlayer, BasicInput>): void;
}

/**
 * This interface represents an input that can be predicted forwards from a previous input.
 * You can also compare two inputs to test for equality. This type of input is needed
 * for rollback netcode and backwards reconciliation.
 */
export interface PredictableInput<TInput extends PredictableInput<TInput>>
  extends BasicInput {
  equals(other: TInput): boolean;
  predictNext(): TInput;
}

/**
 * This interface represents a state that, when ticked forward, produces a new state,
 * rather than mutating itself.
 */
export interface RewindableState<
  TState extends RewindableState<TState, TInput>,
  TInput extends PredictableInput<TInput>
> {
  tick(playerInputs: Map<NetplayPlayer, TInput>): TState;
}

/**
 * A serializer for a given type.
 */
export interface Serializer<T> {
  toJSON(val: T): any;
  fromJSON(json: any): T;
}
