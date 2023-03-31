import { JsonObject } from "type-fest";
import * as s from "./serialize";

export function serialize(data: object): JsonObject {
  const result = {};
  for (let key of Object.keys(data)) {
    result[key] = s.serialize(data[key]);
  }
  return result;
}

export function deserialize(source: JsonObject, dest: Object): void {
  for (const [key, value] of Object.entries(source)) {
    dest[key] = s.deserialize(source[key]);
  }
}
