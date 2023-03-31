import {
  NetplayPlayer,
  DefaultInput,
  Game,
  RollbackWrapper,
  Vec2,
} from "netplayjs/src/index";

export class SimpleGame extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: 600, height: 300 };

  aPos: Vec2 = new Vec2(100, 150);
  bPos: Vec2 = new Vec2(500, 150);

  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
    for (const [player, input] of playerInputs.entries()) {
      const vel = input.arrowKeys().multiplyScalar(5);

      if (player.getID() == 0) {
        this.aPos.x += vel.x;
        this.aPos.y -= vel.y;
      } else if (player.getID() == 1) {
        this.bPos.x += vel.x;
        this.bPos.y -= vel.y;
      }
    }
  }

  draw(canvas: HTMLCanvasElement) {
    // Fill in a black background.
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw squares for the characters.
    ctx.fillStyle = "red";
    ctx.fillRect(this.aPos.x - 5, this.aPos.y - 5, 10, 10);
    ctx.fillStyle = "blue";
    ctx.fillRect(this.bPos.x - 5, this.bPos.y - 5, 10, 10);
  }
}

new RollbackWrapper(SimpleGame).start();
