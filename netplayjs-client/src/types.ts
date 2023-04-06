import { JsonObject, JsonValue } from "type-fest";
import * as autoserialize from "./serialization/autoserialize";

export abstract class NetplayState<TInput extends NetplayInput<TInput>> {
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

export abstract class NetplayInput<TInput extends NetplayInput<TInput>> {
  /**
   * By default, the prediction is to just use the same value.
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