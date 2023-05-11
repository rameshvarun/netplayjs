import { Class, JsonValue } from "type-fest";

type CustomType = {
  klass: Class;
  typeName: string;
  serializer: (data: any) => JsonValue;
  deserializer: (data: JsonValue) => any;
};

export const CUSTOM_TYPES: Array<CustomType> = [];

export function registerCustomType<T>(
  klass: Class<T>,
  typeName: string,
  serializer: (value: T) => JsonValue,
  deserializer: (data: any) => T
) {
  CUSTOM_TYPES.push({
    klass,
    typeName,
    serializer,
    deserializer,
  });
}

registerCustomType(Map, "Map", (map: Map<any, any>) => {
  let result: Array<[any, any]> = [];
  for (let [key, value] of map.entries()) {
    result.push([serialize(key), serialize(value)]);
  }
  return result;
}, (data: any) => {
  const result = new Map();
  for (let [key, value] of data) {
    result.set(deserialize(key), deserialize(value));
  }
  return result;
});

registerCustomType(Set, "Set", (set: Set<any>) => {
  let result: Array<any> = [];
  for (let value of set.values()) {
    result.push(serialize(value));
  }
  return result;
}, (data: any) => {
  const result = new Set();
  for (let value of data) {
    result.add(deserialize(value));
  }
  console.log(result);
  return result;
});

export function serialize(data: any): any {
  if (
    typeof data === "number" ||
    typeof data === "string" ||
    typeof data === "boolean" ||
    data === null
  ) {
    // Primitives are returned as-is.
    return data;
  } else if (data === undefined) {
    // JSON can't actually represent undefined, so we
    // need a special object here.
    return { __type: "undefined" };
  } else if (Array.isArray(data)) {
    // Duplicate the array and serialize each element.
    return data.map(serialize);
  } else if (typeof data === "object") {
    // Check if this object can be handled using a registered serializer.
    for (let customType of CUSTOM_TYPES) {
      if (data instanceof customType.klass) {
        return {
          __type: customType.typeName,
          data: customType.serializer(data),
        };
      }
    }

    // Object fallback - serialize each property of the object.
    const result = {};
    for (let key of Object.keys(data)) {
      result[key] = serialize(data[key]);
    }
    return result;
  } else {
    throw new Error("Failed to serialize unknown type.");
  }
}

export function deserialize(data: JsonValue): any {
  if (
    typeof data === "number" ||
    typeof data === "string" ||
    typeof data === "boolean" ||
    data === null
  ) {
    // Primitives are returned as-is.
    return data;
  } else if (Array.isArray(data)) {
    // Duplicate the array and deserialize each element.
    return data.map(deserialize);
  } else if (typeof data === "object") {
    if (data.__type) {
      // Built-in special case for undefined.
      if (data.__type === "undefined") return undefined;

      // Try decoding using custom types.
      for (let customType of CUSTOM_TYPES) {
        if (data.__type === customType.typeName) {
          return customType.deserializer(data.data);
        }
      }
    } else {
      // Fallback object decoder.
      const result = {};
      for (let key of Object.keys(data)) {
        result[key] = deserialize(data[key]);
      }
      return result;
    }
  } else {
    throw new Error("Failed to deserialize unknown type.");
  }
}
