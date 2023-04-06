import { JsonObject, JsonValue } from "type-fest";
import * as autoserialize from "../serialization/autoserialize";

/**
 * NetplayState is the interface between the netcode
 * and the actual game mechanics. It describes to the
 * netcode how to simulate the game forward and how to
 * save / restore the game for rewinds.
 */
export abstract class NetplayState<TInput extends NetplayInput<TInput>> {
  /**
   * This function describes how a state ticks forward given
   * the player inputs. It's used by netcodes to simulate the
   * game forward, sometimes with predicted inputs
   * and sometimes with actual inputs.
   */
  abstract tick(playerInputs: Map<NetplayPlayer, TInput>): void;

  /**
   * By default, use the auto serializer.
   */
  serialize(): JsonValue {
    return autoserialize.serialize(this);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: JsonValue): void {
    autoserialize.deserialize(value as JsonObject, this);
  }
}

/**
 * NetplayJS games are synchronized by sending inputs across the network.
 * The NetplayInput class describes, abstractly, what each netcode implementation
 */
export abstract class NetplayInput<TInput extends NetplayInput<TInput>> {
  /**
   * For predictive netcodes like rollback, we need to be able
   * to speculatively predict the next input from the current
   * input. By default, though, the prediction is just the same value as
   * the previous frame.
   */
  predictNext(): TInput {
    // @ts-ignore
    return this;
  }

  /**
   * By default, use the auto serializer.
   */
  serialize(): JsonValue {
    return autoserialize.serialize(this);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: JsonValue): void {
    autoserialize.deserialize(value as JsonObject, this);
  }
}

/**
 * A NetplayPlayer object represents one player in a game.
 */
export class NetplayPlayer {
  id: number;
  isLocal: boolean;
  isHost: boolean;

  constructor(id: number, isLocal: boolean, isHost: boolean) {
    this.id = id;
    this.isLocal = isLocal;
    this.isHost = isHost;
  }
  isLocalPlayer(): boolean {
    return this.isLocal;
  }
  isRemotePlayer(): boolean {
    return !this.isLocal;
  }
  isServer(): boolean {
    return this.isHost;
  }
  isClient(): boolean {
    return !this.isHost;
  }
  getID(): number {
    return this.id;
  }
}