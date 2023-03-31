import { deserialize, serialize } from "./autoserialize";
import { Vec2 } from "../vec2";

class TestClass {
  a: string = "test";
  b: number = 3;
  c: Array<number> = [4, 5];
  d: any = { test: "test", nested: [null, {}, 3] };
}

class TestClassWithVec {
  vec: Vec2 = new Vec2(10, 11);
}

test("Serialize TestClass", () => {
  let test = new TestClass();
  expect(serialize(test)).toMatchInlineSnapshot(`
    Object {
      "a": "test",
      "b": 3,
      "c": Array [
        4,
        5,
      ],
      "d": Object {
        "nested": Array [
          null,
          Object {},
          3,
        ],
        "test": "test",
      },
    }
  `);
});

test("Deserialize TestClass", () => {
  let test = new TestClass();

  let serialized = { a: "test-2", b: 4, c: [1, 2], vec: { x: 20, y: 21 } };
  deserialize(serialized, test);

  expect(test).toBeInstanceOf(TestClass);

  expect(test.a).toBe("test-2");
  expect(test.b).toBe(4);
  expect(test.c).toEqual([1, 2]);

  // Mutating the serialized value doesn't change the already deserialized object.
  serialized.c[0] = 5;
  expect(test.c).toEqual([1, 2]);
});

test("Serialize TestClassWithVec", () => {
  let test = new TestClassWithVec();

  const serialized = serialize(test);
  expect(serialized).toMatchInlineSnapshot(`
    Object {
      "vec": Object {
        "__type": "netplayjs.Vec2",
        "data": Array [
          10,
          11,
        ],
      },
    }
  `);

  test.vec.x = 100;
  test.vec.y = 150;

  deserialize(serialized, test);

  expect(test.vec).toBeInstanceOf(Vec2);
});
