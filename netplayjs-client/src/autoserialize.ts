import { JSONObject, JSONValue } from "./json";

export function serialize(data: any): JSONValue {
  return JSON.parse(JSON.stringify(data)) as JSONValue;
}

export function deserialize(source: JSONObject, dest: Object): void {
  // Deep copy hack.
  let copy = JSON.parse(JSON.stringify(source));

  // Copy values into source.
  for (const [key, value] of Object.entries(copy)) {
    dest[key] = copy[key];
  }
}
