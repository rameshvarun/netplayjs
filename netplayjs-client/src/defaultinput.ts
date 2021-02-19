import { NetplayInput } from "./types";

export class DefaultInput extends NetplayInput<DefaultInput> {
  pressed: { [key: string]: boolean } = {};
}

export class DefaultInputReader {
  PRESSED_KEYS = {};

  constructor() {
    document.addEventListener(
      "keydown",
      (event) => {
        this.PRESSED_KEYS[event.key] = true;
      },
      false
    );
    document.addEventListener(
      "keyup",
      (event) => {
        this.PRESSED_KEYS[event.key] = false;
      },
      false
    );
  }

  getInput(): DefaultInput {
    let input = new DefaultInput();
    for (let key in this.PRESSED_KEYS) {
      if (this.PRESSED_KEYS[key]) input.pressed[key] = true;
    }
    return input;
  }
}
