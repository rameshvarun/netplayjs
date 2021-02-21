import { NetplayInput } from "./types";
import * as utils from "./utils";
import { TouchControl } from "./touchcontrols";

export class DefaultInput extends NetplayInput<DefaultInput> {
  pressed: { [key: string]: boolean } = {};

  mousePosition?: { x: number; y: number };
  mouseDelta?: { x: number; y: number };

  touches: Array<{ x: number; y: number }> = [];

  touchControls?: { [name: string]: any };
}

export class DefaultInputReader {
  canvas: HTMLCanvasElement;

  PRESSED_KEYS = {};

  mousePosition: { x: number; y: number } | null = null;
  mouseDelta: { x: number; y: number } | null = null;
  touches: Array<{ x: number; y: number }> = [];

  touchControls: { [name: string]: TouchControl };

  projectClientPosition(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scale = {
      x: this.canvas.width / rect.width,
      y: this.canvas.height / rect.height,
    };

    return {
      x: (clientX - rect.left) * scale.x,
      y: (clientY - rect.top) * scale.y,
    };
  }

  constructor(
    canvas: HTMLCanvasElement,
    pointerLock: boolean,
    touchControls: { [name: string]: TouchControl }
  ) {
    this.canvas = canvas;
    this.touchControls = touchControls;

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

    canvas.addEventListener(
      "mouseenter",
      (e) => this.updateMousePosition(e),
      false
    );

    canvas.addEventListener(
      "mousemove",
      (e) => this.updateMousePosition(e),
      false
    );

    canvas.addEventListener(
      "mouseleave",
      (e) => {
        this.mousePosition = null;
      },
      false
    );

    canvas.addEventListener("touchstart", (e) => this.updateTouches(e), false);
    canvas.addEventListener("touchmove", (e) => this.updateTouches(e), false);
    canvas.addEventListener("touchend", (e) => this.updateTouches(e), false);

    canvas.addEventListener("mousedown", () => {
      if (pointerLock) {
        canvas.requestPointerLock();
      }
    });
  }

  updateMousePosition(event: MouseEvent) {
    this.mousePosition = this.projectClientPosition(
      event.clientX,
      event.clientY
    );
    this.mouseDelta = { x: event.movementX, y: event.movementY };
  }

  updateTouches(event: TouchEvent) {
    this.touches.length = event.targetTouches.length;
    for (let i = 0; i < event.targetTouches.length; ++i) {
      this.touches[i] = this.projectClientPosition(
        event.targetTouches[i].clientX,
        event.targetTouches[i].clientY
      );
    }
  }

  getInput(): DefaultInput {
    let input = new DefaultInput();

    for (let key in this.PRESSED_KEYS) {
      if (this.PRESSED_KEYS[key]) input.pressed[key] = true;
    }
    if (this.mousePosition)
      input.mousePosition = utils.clone(this.mousePosition);
    if (this.mouseDelta) input.mouseDelta = utils.clone(this.mouseDelta);
    input.touches = utils.clone(this.touches);

    for (let [name, control] of Object.entries(this.touchControls)) {
      input.touchControls = input.touchControls || {};
      input.touchControls[name] = utils.clone(control.getValue());
    }

    return input;
  }
}
