import { NetplayState, NetplayInput, NetplayPlayer } from "./netplay";

export const PONG_WIDTH = 600;
export const PONG_HEIGHT = 300;

export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 100;

export const LEFT_PADDLE_X = 0 + 100;
export const RIGHT_PADDLE_X = PONG_WIDTH - 100 - PADDLE_WIDTH;

export const PADDLE_MOVE_SPEED = 5;

export const BALL_WIDTH = 10;
export const BALL_HEIGHT = 10;


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

export class PongState implements NetplayState<PongState, PongInput> {
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

  static getInitialState() {
    return new PongState(
      PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      [PONG_WIDTH / 2 - BALL_WIDTH / 2, PONG_HEIGHT / 2 - BALL_HEIGHT / 2],
      [5, 0],
      0,
      0
    );
  }
}

export class PongInput implements NetplayInput<PongInput> {
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
