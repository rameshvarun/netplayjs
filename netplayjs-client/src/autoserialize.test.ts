import {deserialize, serialize} from "./autoserialize";

class TestClass {
    a: string = 'test';
    b: number = 3;

    c: Array<number> = [4, 5]
}

test("serialize", () => {
    let test = new TestClass();
    expect(serialize(test)).toStrictEqual({
        a: 'test',
        b: 3,
        c: [4, 5]
    });
});


test("deserialize", () => {
    let test = new TestClass();

    let serialized = { a: 'test-2', b: 4, c: [1, 2]};
    deserialize(serialized, test);

    expect(test.a).toBe('test-2');
    expect(test.b).toBe(4);
    expect(test.c).toEqual([1, 2]);

    // Mutating the serialized value doesn't change the already deserialized object.
    serialized.c[0] = 5;
    expect(test.c).toEqual([1, 2]);
});
