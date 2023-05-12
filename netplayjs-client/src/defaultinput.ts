import { NetplayInput } from "./netcode/types";
import * as utils from "./utils";
import { TouchControl } from "./touchcontrols";
import { Vec2 } from "./vec2";

type GamepadButton = {
  /** Was this Gamepad button pressed on this frame? */
  pressed: boolean;

  /** Was this Gamepad button released on this frame? */
  released: boolean;

  /** Is this Gamepad button currently held down? */
  held: boolean;
}

export class DefaultInput extends NetplayInput {
  keysPressed: { [key: string]: boolean } = {};
  keysHeld: { [key: string]: boolean } = {};
  keysReleased: { [key: string]: boolean } = {};

  mousePosition?: { x: number; y: number };

  touches: Array<{ x: number; y: number }> = [];

  gamepads: Array<{
    axes: Array<number>;
    buttons: Array<GamepadButton>;
  }> = [];

  touchControls?: { [name: string]: any };

  /** Helper function to return arrow keys as a Vec2. */
  arrowKeys(): Vec2 {
    return new Vec2(
      (this.keysHeld.ArrowLeft ? -1 : 0) + (this.keysHeld.ArrowRight ? 1 : 0),
      (this.keysHeld.ArrowDown ? -1 : 0) + (this.keysHeld.ArrowUp ? 1 : 0)
    );
  }

  /** Helper function to return WASD keys as a Vec2. */
  wasd(): Vec2 {
    return new Vec2(
      (this.keysHeld.a ? -1 : 0) + (this.keysHeld.d ? 1 : 0),
      (this.keysHeld.s ? -1 : 0) + (this.keysHeld.w ? 1 : 0)
    );
  }
}

export class DefaultInputReader {
  canvas: HTMLCanvasElement;
  canvasSize: { width: number; height: number };

  keysPressed: { [key: string]: boolean } = {};
  keysHeld: { [key: string]: boolean } = {};
  keysReleased: { [key: string]: boolean } = {};

  mousePosition: { x: number; y: number } | null = null;
  mouseDelta: { x: number; y: number } | null = null;
  touches: Array<{ x: number; y: number }> = [];

  touchControls: { [name: string]: TouchControl };

  /**
   * We need to track the previous state of GamePads
   * so that we can determine the frame that the button
   * was pressed or released.
   */
  previousGamepadState: Map<number, {
    /** Whether or not the button was held on the previous frame. */
    buttons: Array<boolean>;
  }> = new Map();

  getCanvasScale(): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: this.canvasSize.width / rect.width,
      y: this.canvasSize.height / rect.height,
    };
  }

  projectClientPosition(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.getCanvasScale();

    return {
      x: (clientX - rect.left) * scale.x,
      y: (clientY - rect.top) * scale.y,
    };
  }

  constructor(
    root: HTMLElement = document.body,
    canvas: HTMLCanvasElement,
    canvasSize: { width: number; height: number },
    pointerLock: boolean = false,
    preventContextMenu: boolean = false,
    touchControls: { [name: string]: TouchControl } = {}
  ) {
    this.canvas = canvas;
    this.canvasSize = canvasSize;
    this.touchControls = touchControls;

    root.addEventListener(
      "keydown",
      (event) => {
        if (event.repeat) return;
        this.keysHeld[event.key] = true;
        this.keysPressed[event.key] = true;
      },
      false
    );
    root.addEventListener(
      "keyup",
      (event) => {
        this.keysHeld[event.key] = false;
        this.keysReleased[event.key] = true;
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

    canvas.addEventListener("contextmenu", (e) => {
      if (preventContextMenu) e.preventDefault();
    });
  }

  updateMousePosition(event: MouseEvent) {
    if (document.pointerLockElement === this.canvas) {
      if (!this.mousePosition) {
        // If we are pointer locked, the first position is projected onto the canvas.
        this.mousePosition = this.projectClientPosition(
          event.clientX,
          event.clientY
        );
      } else {
        // Subsequent positions are delta based off of our relative movement.
        const scale = this.getCanvasScale();
        this.mousePosition.x += event.movementX * scale.x;
        this.mousePosition.y += event.movementY * scale.y;
      }
    } else {
      // If we aren't pointer locked, just project the position onto the canvas.
      this.mousePosition = this.projectClientPosition(
        event.clientX,
        event.clientY
      );
    }
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

    for (let key in this.keysPressed) {
      if (this.keysPressed[key]) {
        input.keysPressed[key] = true;

        // A pressed key is also a held key.
        // This helps with the edge case where a
        // key is pressed and released between the frames.
        input.keysHeld[key] = true;
      }
    }
    for (let key in this.keysHeld) {
      if (this.keysHeld[key]) input.keysHeld[key] = true;
    }
    for (let key in this.keysReleased) {
      if (this.keysReleased[key]) input.keysReleased[key] = true;
    }

    if (this.mousePosition)
      input.mousePosition = utils.clone(this.mousePosition);
    input.touches = utils.clone(this.touches);

    for (let [name, control] of Object.entries(this.touchControls)) {
      input.touchControls = input.touchControls || {};
      input.touchControls[name] = utils.clone(control.getValue());
    }

    // Processing GamePad inputs.
    if (navigator.getGamepads) {
      navigator.getGamepads().forEach((gamepad, gi) => {
        // Ignore null gamepads.
        if (!gamepad) return null;

        // Get the previous state of this GamePad so that we can determine
        // pressed and released states.
        const previousState = this.previousGamepadState.get(gi) || {
          buttons: gamepad.buttons.map(() => false),
        };

        const buttons: Array<GamepadButton> = gamepad.buttons.map((button, bi) => {
          const held = button.pressed;
          const pressed = !previousState.buttons[bi] && held;
          const released = previousState.buttons[bi] && !held;
          return {
            held,
            pressed,
            released,
          };
        });

        input.gamepads.push({
          axes: utils.clone(gamepad.axes),
          buttons: buttons,
        });

        // Update the previous state of this GamePad.
        this.previousGamepadState.set(gi, {
          buttons: gamepad.buttons.map((button) => button.pressed),
        });
      });
    }

    // Clear the pressed and released keys.
    this.keysPressed = {};
    this.keysReleased = {};

    return input;
  }
}
