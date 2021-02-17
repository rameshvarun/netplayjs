import { NetplayState, NetplayInput, NetplayPlayer, JSONValue } from "netplayjs";
import { GameType } from "netplayjs";
import { assert } from "chai";

export class SimpleGameState extends NetplayState<SimpleGameState, SimpleGameInput> {
  aPos: {x: number; y: number} = {x: 100, y: 150};
  bPos: {x: number; y: number} = {x: 500, y: 150};

  tick(playerInputs: Map<NetplayPlayer, SimpleGameInput>): void {
    // Move paddles up and down.
    for (const [player, input] of playerInputs.entries()) {
      if (player.getID() == 0) {
        this.aPos.x += input.x * 5;
        this.aPos.y -= input.y * 5;
      } else if (player.getID() == 1) {
        this.bPos.x += input.x * 5;
        this.bPos.y -= input.y * 5;
      }
    }
  }
}

export class SimpleGameInput extends NetplayInput<SimpleGameInput> {
  x: number = 0;
  y: number = 0;
}

export var SimpleGameType: GameType<SimpleGameState, SimpleGameInput> = {
  timestep: 1000 / 60,

  canvasWidth: 600,
  canvasHeight: 300,

  constructInitialState(players: Array<NetplayPlayer>): SimpleGameState {
    return new SimpleGameState();
  },

  constructDefaultInput(): SimpleGameInput {
    return new SimpleGameInput();
  },

  draw(
    state: SimpleGameState,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circles for the characters.
    ctx.fillStyle = "red";
    ctx.fillRect(state.aPos.x - 5, state.aPos.y - 5, 10, 10);

    ctx.fillStyle = "blue";
    ctx.fillRect(state.bPos.x - 5, state.bPos.y - 5, 10, 10);
  },

  getInputReader(document, canvas): () => SimpleGameInput {
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
      let input = new SimpleGameInput();
      if (PRESSED_KEYS["ArrowUp"])
        input.y = 1;
      if (PRESSED_KEYS["ArrowDown"])
        input.y = -1
      if (PRESSED_KEYS["ArrowRight"])
        input.x = 1;
      if (PRESSED_KEYS["ArrowLeft"])
        input.x = -1
      return input;
    };
  }
};
