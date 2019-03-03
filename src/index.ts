import {NetplayState, NetplayInput, NetplayPlayer} from './netplay';

class PongState implements NetplayState<PongInput> {
  leftPaddle: number;
  rightPaddle: number;

  // ballPosition: [number, number];
  // ballVelocity: [number, number];
  //
  // score: number;

  tick(playerInputs: Map<NetplayPlayer, PongInput>): NetplayState<PongInput> {
    let newLeftPaddle = this.leftPaddle;
    let newRightPaddle = this.rightPaddle;

    for(const [player, input] of playerInputs.entries()) {
      if (player.getID() == 0) {
        newLeftPaddle += input.delta();
      }
      else if (player.getID() == 1) {
        newRightPaddle += input.delta();
      }
    }

    return new PongState(newLeftPaddle, newRightPaddle);
  }

  constructor(leftPaddle: number, rightPaddle: number) {
    this.leftPaddle = leftPaddle;
    this.rightPaddle = rightPaddle;
  }
}


class PongInput implements NetplayInput {
  constructor(direction: "up" | "down") {
    this.direction = direction;
  }

  predictNext(): NetplayInput {
      return new PongInput(this.direction);
  }
  equals(other: NetplayInput): boolean {
      return other instanceof PongInput && other.direction == this.direction;
  }

  delta() {
    if (this.direction == "up") return -1;
    else return 1;
  }

  direction: "up" | "down";
}


const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

var ctx = canvas.getContext('2d');
