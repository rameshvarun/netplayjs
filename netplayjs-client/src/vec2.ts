import * as serialize from "./serialization/serialize";

/**
 * A helper class representing a Vec2. Most games are going
 * to be using the Vector class provided by their game framework,
 * so this is mostly for internal use + demos.
 */
export class Vec2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  multiplyScalar(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }
}

// Register Vec2 class with serializer.
serialize.registerCustomType(
  Vec2,
  "netplayjs.Vec2",
  (data: Vec2) => {
    return [data.x, data.y];
  },
  (data) => {
    return new Vec2(data[0], data[1]);
  }
);
