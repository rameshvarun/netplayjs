import { deserialize, serialize } from "./autoserialize";

class Vector {
  x: number = 10;
  y: number = 11;
}

class TestClass {
  a: string = "test";
  b: number = 3;

  c: Array<number> = [4, 5];

  vec: Vector = new Vector();
}

test("Serialize", () => {
  let test = new TestClass();
  expect(serialize(test)).toStrictEqual({
    a: "test",
    b: 3,
    c: [4, 5],
    vec: { x: 10, y: 11 },
  });
});

test("Deserialize", () => {
  let test = new TestClass();

  let serialized = { a: "test-2", b: 4, c: [1, 2], vec: { x: 20, y: 21 } };
  deserialize(serialized, test);

  expect(test).toBeInstanceOf(TestClass);

  expect(test.a).toBe("test-2");
  expect(test.b).toBe(4);
  expect(test.c).toEqual([1, 2]);

  expect(test.vec.x).toEqual(20);
  expect(test.vec.y).toEqual(21);

  // Mutating the serialized value doesn't change the already deserialized object.
  serialized.c[0] = 5;
  expect(test.c).toEqual([1, 2]);

  // Preserve class of deserialized object
  expect(test.vec).toBeInstanceOf(Vector);
});
