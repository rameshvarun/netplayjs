import {
  NetplayState,
  NetplayInput,
  NetplayPlayer,
  NetplayManager
} from "./netplay";

const PONG_WIDTH = 600;
const PONG_HEIGHT = 300;

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;

const LEFT_PADDLE_X = 0 + 100;
const RIGHT_PADDLE_X = PONG_WIDTH - 100 - PADDLE_WIDTH;

const PADDLE_MOVE_SPEED = 5;

const BALL_WIDTH = 10;
const BALL_HEIGHT = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function rectOverlap(
  aLeft: number,
  aRight: number,
  aTop: number,
  aBottom: number,
  bLeft: number,
  bRight: number,
  bTop: number,
  bBottom: number
) {
  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

class PongState implements NetplayState<PongState, PongInput> {
  leftPaddle: number;
  rightPaddle: number;

  ballPosition: [number, number];
  ballVelocity: [number, number];

  leftScore: number;
  rightScore: number;

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

    let newBallPosition: [number, number] = [
      this.ballPosition[0] + this.ballVelocity[0],
      this.ballPosition[1] + this.ballVelocity[1]
    ];

    let newBallVelocity: [number, number] = [
      this.ballVelocity[0],
      this.ballVelocity[1]
    ];

    if (newBallPosition[1] < 0) {
      newBallPosition[1] = 0;
      newBallVelocity[1] = -newBallVelocity[1];
    }

    if (newBallPosition[1] > PONG_HEIGHT - BALL_HEIGHT) {
      newBallPosition[1] = PONG_HEIGHT - BALL_HEIGHT;
      newBallVelocity[1] = -newBallVelocity[1];
    }

    if (
      rectOverlap(
        newBallPosition[0],
        newBallPosition[0] + BALL_WIDTH,
        newBallPosition[1],
        newBallPosition[1] + BALL_HEIGHT,
        LEFT_PADDLE_X,
        LEFT_PADDLE_X + PADDLE_WIDTH,
        newLeftPaddle,
        newLeftPaddle + PADDLE_HEIGHT
      )
    ) {
      let offset =
        (newBallPosition[1] +
          BALL_HEIGHT / 2 -
          (newLeftPaddle + PADDLE_HEIGHT / 2)) /
        PADDLE_HEIGHT;

      newBallVelocity[0] = -newBallVelocity[0];
      newBallVelocity[1] = 5 * Math.sin(2 * offset);
      newBallPosition[0] = LEFT_PADDLE_X + PADDLE_WIDTH;
    }

    if (
      rectOverlap(
        newBallPosition[0],
        newBallPosition[0] + BALL_WIDTH,
        newBallPosition[1],
        newBallPosition[1] + BALL_HEIGHT,
        RIGHT_PADDLE_X,
        RIGHT_PADDLE_X + PADDLE_WIDTH,
        newRightPaddle,
        newRightPaddle + PADDLE_HEIGHT
      )
    ) {
      let offset =
        (newBallPosition[1] +
          BALL_HEIGHT / 2 -
          (newRightPaddle + PADDLE_HEIGHT / 2)) /
        PADDLE_HEIGHT;

      newBallVelocity[0] = -newBallVelocity[0];
      newBallVelocity[1] = 5 * Math.sin(2 * offset);
      newBallPosition[0] = RIGHT_PADDLE_X - BALL_WIDTH;
    }

    let newLeftScore = this.leftScore;
    let newRightScore = this.rightScore;
    if (newBallPosition[0] > PONG_WIDTH) {
      newLeftScore += 1;
      newBallPosition = [
        PONG_WIDTH / 2 - BALL_WIDTH / 2,
        PONG_HEIGHT / 2 - BALL_HEIGHT / 2
      ];
      newBallVelocity = [-5, 0];
    }
    if (newBallPosition[0] < -BALL_HEIGHT) {
      newRightScore += 1;
      newBallPosition = [
        PONG_WIDTH / 2 - BALL_WIDTH / 2,
        PONG_HEIGHT / 2 - BALL_HEIGHT / 2
      ];
      newBallVelocity = [5, 0];
    }

    return new PongState(
      newLeftPaddle,
      newRightPaddle,
      newBallPosition,
      newBallVelocity,
      newLeftScore,
      newRightScore
    );
  }

  constructor(
    leftPaddle: number,
    rightPaddle: number,
    ballPosition: [number, number],
    ballVelocity: [number, number],
    leftScore: number,
    rightScore: number
  ) {
    this.leftPaddle = leftPaddle;
    this.rightPaddle = rightPaddle;

    this.ballPosition = ballPosition;
    this.ballVelocity = ballVelocity;

    this.leftScore = leftScore;
    this.rightScore = rightScore;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillRect(LEFT_PADDLE_X, this.leftPaddle, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = "white";
    ctx.fillRect(RIGHT_PADDLE_X, this.rightPaddle, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = "white";
    ctx.fillRect(
      this.ballPosition[0],
      this.ballPosition[1],
      BALL_WIDTH,
      BALL_HEIGHT
    );

    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      this.leftScore.toString(),
      PONG_WIDTH * 0.3,
      PONG_HEIGHT * 0.2
    );
    ctx.fillText(
      this.rightScore.toString(),
      PONG_WIDTH * 0.7,
      PONG_HEIGHT * 0.2
    );
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

const canvas1 = document.createElement("canvas");
canvas1.width = PONG_WIDTH;
canvas1.height = PONG_HEIGHT;
document.body.appendChild(canvas1);
const ctx1 = canvas1.getContext("2d")!;

const canvas2 = document.createElement("canvas");
canvas2.width = PONG_WIDTH;
canvas2.height = PONG_HEIGHT;
document.body.appendChild(canvas2);
const ctx2 = canvas2.getContext("2d")!;

const stats = document.createElement("div");
document.body.appendChild(stats);

const PRESSED_KEYS = {};
document.addEventListener(
  "keydown",
  event => {
    PRESSED_KEYS[event.keyCode] = true;
  },
  false
);
document.addEventListener(
  "keyup",
  event => {
    PRESSED_KEYS[event.keyCode] = false;
  },
  false
);

let initialState = new PongState(
  PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  [PONG_WIDTH / 2 - BALL_WIDTH / 2, PONG_HEIGHT / 2 - BALL_HEIGHT / 2],
  [5, 0],
  0,
  0
);

let initialInputs1 = new Map<
  NetplayPlayer,
  { input: PongInput; isPrediction: boolean }
>();
let world1players = [
  {
    getID() {
      return 0;
    },
    isLocalPlayer() {
      return true;
    },
    isRemotePlayer() {
      return false;
    },
    isServer() {
      return true;
    },
    isClient() {
      return false;
    }
  },
  {
    getID() {
      return 1;
    },
    isLocalPlayer() {
      return false;
    },
    isRemotePlayer() {
      return true;
    },
    isServer() {
      return false;
    },
    isClient() {
      return true;
    }
  }
];
initialInputs1.set(world1players[0], {
  input: new PongInput("none"),
  isPrediction: false
});
initialInputs1.set(world1players[1], {
  input: new PongInput("none"),
  isPrediction: false
});

let netplayManager1 = new NetplayManager(initialState, initialInputs1, 10);

let initialInputs2 = new Map<
  NetplayPlayer,
  { input: PongInput; isPrediction: boolean }
>();
let world2players = [
  {
    getID() {
      return 0;
    },
    isLocalPlayer() {
      return false;
    },
    isRemotePlayer() {
      return true;
    },
    isServer() {
      return true;
    },
    isClient() {
      return false;
    }
  },
  {
    getID() {
      return 1;
    },
    isLocalPlayer() {
      return true;
    },
    isRemotePlayer() {
      return false;
    },
    isServer() {
      return false;
    },
    isClient() {
      return true;
    }
  }
];
initialInputs2.set(world2players[0], {
  input: new PongInput("none"),
  isPrediction: false
});
initialInputs2.set(world2players[1], {
  input: new PongInput("none"),
  isPrediction: false
});

let netplayManager2 = new NetplayManager(initialState, initialInputs2, 10);

const TIMESTEP = 1000 / 60;
const SIMULATED_LATENCY = 70;

let lastFrameTime = 0;
function main(timestamp) {
  if (timestamp > lastFrameTime + TIMESTEP) {
    lastFrameTime = timestamp;

    // Get local input.
    let input1 = new PongInput("none");
    let input1frame = netplayManager1.currentFrame() + 1;
    if (PRESSED_KEYS[38]) input1 = new PongInput("up");
    if (PRESSED_KEYS[40]) input1 = new PongInput("down");

    let input2 = new PongInput("none");
    let input2frame = netplayManager2.currentFrame() + 1;
    if (PRESSED_KEYS[87]) input2 = new PongInput("up");
    if (PRESSED_KEYS[83]) input2 = new PongInput("down");

    // Tick state forward.
    netplayManager1.tick(input1);
    netplayManager2.tick(input2);

    // Simulated packet transfer.
    setTimeout(() => {
      netplayManager1.onRemoteInput(input2frame, world1players[1], input2);
      netplayManager2.onRemoteInput(input1frame, world2players[0], input1);
    }, SIMULATED_LATENCY);

    // Draw state to canvas.
    netplayManager1.getState().draw(canvas1, ctx1);
    netplayManager2.getState().draw(canvas2, ctx2);

    // Update stats
    stats.innerHTML = `
    <div>Simulated Latency: ${SIMULATED_LATENCY}</div>
    <div>Timestep: ${TIMESTEP}</div>
    <div>(Player 1) History Size: ${netplayManager1.history.length}</div>
    <div>(Player 2) History Size: ${netplayManager2.history.length}</div>
    `;
  }

  requestAnimationFrame(main);
}
requestAnimationFrame(main);
