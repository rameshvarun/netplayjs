import {
  NetplayPlayer,
  Game,
  DefaultInput,
  RollbackWrapper,
} from "netplayjs/src/index";

const [PONG_WIDTH, PONG_HEIGHT] = [600, 300];
const [PADDLE_WIDTH, PADDLE_HEIGHT] = [10, 100];
const [BALL_WIDTH, BALL_HEIGHT] = [10, 10];

const LEFT_PADDLE_X = 0 + 100;
const RIGHT_PADDLE_X = PONG_WIDTH - 100 - PADDLE_WIDTH;

const PADDLE_MOVE_SPEED = 300;
const BALL_MOVE_SPEED = 300;

/** Clamps a value between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Check if two rectangles A and B overlap. */
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

export class Pong extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: PONG_WIDTH, height: PONG_HEIGHT };

  leftPaddle: number = PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2;
  rightPaddle: number = PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2;

  ballPosition: [number, number] = [
    PONG_WIDTH / 2 - BALL_WIDTH / 2,
    PONG_HEIGHT / 2 - BALL_HEIGHT / 2,
  ];
  ballVelocity: [number, number] = [BALL_MOVE_SPEED, 0];

  leftScore: number = 0;
  rightScore: number = 0;

  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
    // The delta time in seconds.
    let dt = Pong.timestep / 1000;

    // Move paddles up and down.
    for (const [player, input] of playerInputs.entries()) {
      const direction =
        (input.keysHeld["ArrowDown"] ? 1 : 0) +
        (input.keysHeld["ArrowUp"] ? -1 : 0);

      let paddlePos: number | null = null;
      if (input.touches.length > 0) {
        paddlePos = input.touches[0].y - PADDLE_HEIGHT / 2;
      } else if (input.mousePosition) {
        paddlePos = input.mousePosition.y - PADDLE_HEIGHT / 2;
      }

      if (player.getID() == 0) {
        if (paddlePos) this.leftPaddle = paddlePos;
        else this.leftPaddle += direction * PADDLE_MOVE_SPEED * dt;
      } else if (player.getID() == 1) {
        if (paddlePos) this.rightPaddle = paddlePos;
        else this.rightPaddle += direction * PADDLE_MOVE_SPEED * dt;
      }
    }

    // Clamp paddles onto the screen.
    this.leftPaddle = clamp(this.leftPaddle, 0, PONG_HEIGHT - PADDLE_HEIGHT);
    this.rightPaddle = clamp(this.rightPaddle, 0, PONG_HEIGHT - PADDLE_HEIGHT);

    // Apply ball velocity.
    this.ballPosition[0] += this.ballVelocity[0] * dt;
    this.ballPosition[1] += this.ballVelocity[1] * dt;

    // Bounce ball on bottom / top of screen.
    if (this.ballPosition[1] < 0) {
      this.ballPosition[1] = 0;
      this.ballVelocity[1] = -this.ballVelocity[1];
    }
    if (this.ballPosition[1] > PONG_HEIGHT - BALL_HEIGHT) {
      this.ballPosition[1] = PONG_HEIGHT - BALL_HEIGHT;
      this.ballVelocity[1] = -this.ballVelocity[1];
    }

    if (
      rectOverlap(
        this.ballPosition[0],
        this.ballPosition[0] + BALL_WIDTH,
        this.ballPosition[1],
        this.ballPosition[1] + BALL_HEIGHT,
        LEFT_PADDLE_X,
        LEFT_PADDLE_X + PADDLE_WIDTH,
        this.leftPaddle,
        this.leftPaddle + PADDLE_HEIGHT
      )
    ) {
      let offset =
        (this.ballPosition[1] +
          BALL_HEIGHT / 2 -
          (this.leftPaddle + PADDLE_HEIGHT / 2)) /
        PADDLE_HEIGHT;

      this.ballVelocity[0] = -this.ballVelocity[0];
      this.ballVelocity[1] = BALL_MOVE_SPEED * Math.sin(2 * offset);
      this.ballPosition[0] = LEFT_PADDLE_X + PADDLE_WIDTH;
    }

    if (
      rectOverlap(
        this.ballPosition[0],
        this.ballPosition[0] + BALL_WIDTH,
        this.ballPosition[1],
        this.ballPosition[1] + BALL_HEIGHT,
        RIGHT_PADDLE_X,
        RIGHT_PADDLE_X + PADDLE_WIDTH,
        this.rightPaddle,
        this.rightPaddle + PADDLE_HEIGHT
      )
    ) {
      let offset =
        (this.ballPosition[1] +
          BALL_HEIGHT / 2 -
          (this.rightPaddle + PADDLE_HEIGHT / 2)) /
        PADDLE_HEIGHT;

      this.ballVelocity[0] = -this.ballVelocity[0];
      this.ballVelocity[1] = BALL_MOVE_SPEED * Math.sin(2 * offset);
      this.ballPosition[0] = RIGHT_PADDLE_X - BALL_WIDTH;
    }

    if (this.ballPosition[0] > PONG_WIDTH) {
      this.leftScore += 1;
      this.ballPosition = [
        PONG_WIDTH / 2 - BALL_WIDTH / 2,
        PONG_HEIGHT / 2 - BALL_HEIGHT / 2,
      ];
      this.ballVelocity = [-BALL_MOVE_SPEED, 0];
    }
    if (this.ballPosition[0] < -BALL_HEIGHT) {
      this.rightScore += 1;
      this.ballPosition = [
        PONG_WIDTH / 2 - BALL_WIDTH / 2,
        PONG_HEIGHT / 2 - BALL_HEIGHT / 2,
      ];
      this.ballVelocity = [BALL_MOVE_SPEED, 0];
    }
  }

  draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw paddles.
    ctx.fillStyle = "white";
    ctx.fillRect(LEFT_PADDLE_X, this.leftPaddle, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = "white";
    ctx.fillRect(RIGHT_PADDLE_X, this.rightPaddle, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball.
    ctx.fillStyle = "white";
    ctx.fillRect(
      this.ballPosition[0],
      this.ballPosition[1],
      BALL_WIDTH,
      BALL_HEIGHT
    );

    // Draw scores.
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

new RollbackWrapper(Pong).start();
