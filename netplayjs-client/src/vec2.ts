import * as serialize from "./serialization/serialize";

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
}

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
