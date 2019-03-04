import {
  NetplayState,
  NetplayInput,
  NetplayPlayer,
  NetplayManager
} from "./netplay";

const PONG_WIDTH = 600;
const PONG_HEIGHT = 400;

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;

const LEFT_PADDLE_X = 0 + 100;
const RIGHT_PADDLE_X = PONG_WIDTH - 100 - PADDLE_WIDTH;

const PADDLE_MOVE_SPEED = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
};

class PongState implements NetplayState<PongState, PongInput> {
  leftPaddle: number;
  rightPaddle: number;

  // ballPosition: [number, number];
  // ballVelocity: [number, number];
  //
  // score: number;

  tick(playerInputs: Map<NetplayPlayer, PongInput>): PongState {
    let newLeftPaddle = this.leftPaddle;
    let newRightPaddle = this.rightPaddle;

    for (const [player, input] of playerInputs.entries()) {
      if (player.getID() == 0) {
        newLeftPaddle += input.delta() * PADDLE_MOVE_SPEED;
      } else if (player.getID() == 1) {
        newRightPaddle += input.delta() * PADDLE_MOVE_SPEED;
      }
    }

    newLeftPaddle = clamp(newLeftPaddle, 0, PONG_HEIGHT - PADDLE_HEIGHT);
    newRightPaddle = clamp(newRightPaddle, 0, PONG_HEIGHT - PADDLE_HEIGHT);


    return new PongState(newLeftPaddle, newRightPaddle);
  }

  constructor(leftPaddle: number, rightPaddle: number) {
    this.leftPaddle = leftPaddle;
    this.rightPaddle = rightPaddle;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillRect(LEFT_PADDLE_X, this.leftPaddle, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = "white";
    ctx.fillRect(RIGHT_PADDLE_X, this.rightPaddle, PADDLE_WIDTH, PADDLE_HEIGHT);
  }
}

class PongInput implements NetplayInput<PongInput> {
  direction: "up" | "down" | "none";

  constructor(direction: "up" | "down" | "none") {
    this.direction = direction;
  }

  predictNext(): PongInput {
    return new PongInput(this.direction);
  }

  equals(other: PongInput): boolean {
    return other instanceof PongInput && other.direction == this.direction;
  }

  delta(): number {
    if (this.direction == "up") return -1;
    else if (this.direction == "down") return 1;
    else return 0;
  }
}

const canvas = document.createElement("canvas");
canvas.width = PONG_WIDTH;
canvas.height = PONG_HEIGHT;
document.body.appendChild(canvas);

const PRESSED_KEYS = {};

document.addEventListener('keydown', (event) => {
  PRESSED_KEYS[event.keyCode] = true;
}, false);
document.addEventListener('keyup', (event) => {
  PRESSED_KEYS[event.keyCode] = false;
}, false);

const ctx = canvas.getContext("2d")!;
let initialState = new PongState(
  PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2
);
let initialInputs = new Map<NetplayPlayer, { input: PongInput; isPrediction: boolean }>();
initialInputs.set({
  getID() { return 0; },
  isLocalPlayer() { return true; },
  isRemotePlayer() { return false; },
  isServer() { return true; },
  isClient() { return false; },
}, { input: new PongInput("none"), isPrediction: false });
let netplayManager = new NetplayManager(initialState, initialInputs, 10);

const TIMESTEP = 1000 / 60;

let lastFrameTime = 0;
function main(timestamp) {
  if (timestamp > lastFrameTime + TIMESTEP) {
    lastFrameTime = timestamp;

    // Get local input.
    let input = new PongInput("none");
    if (PRESSED_KEYS[38]) input = new PongInput("up");
    if (PRESSED_KEYS[40]) input = new PongInput("down");

    // Tick state forward.
    netplayManager.tick(input);

    // Draw state to canvas.
    netplayManager.getState().draw(canvas, ctx);
  }

  requestAnimationFrame(main);
}
requestAnimationFrame(main);
