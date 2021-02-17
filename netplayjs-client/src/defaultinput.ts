import { NetplayInput } from "./types";

export class DefaultInput extends NetplayInput<DefaultInput> {
    pressed: {[key: string]: boolean} = {};
}

export function getDefaultInputReader(document): () => DefaultInput {
    const PRESSED_KEYS = {};
    document.addEventListener(
        "keydown",
        event => {
        PRESSED_KEYS[event.key] = true;
        },
        false
    );
    document.addEventListener(
        "keyup",
        event => {
        PRESSED_KEYS[event.key] = false;
        },
        false
    );

    return () => {
        let input = new DefaultInput();
        for (let key in PRESSED_KEYS) {
            if (PRESSED_KEYS[key]) input.pressed[key] = true;
        }
        return input;
      };
}
