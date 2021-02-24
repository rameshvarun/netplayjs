import { NetplayPlayer, DefaultInput, Game, RollbackWrapper } from "netplayjs";

export class SimpleGame extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: 600, height: 300 };

  aPos: { x: number; y: number } = { x: 100, y: 150 };
  bPos: { x: number; y: number } = { x: 500, y: 150 };

  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
    for (const [player, input] of playerInputs.entries()) {
      const vel = {
        x:
          (input.pressed["ArrowLeft"] ? -1 : 0) +
          (input.pressed["ArrowRight"] ? 1 : 0),
        y:
          (input.pressed["ArrowDown"] ? -1 : 0) +
          (input.pressed["ArrowUp"] ? 1 : 0),
      };
      if (player.getID() == 0) {
        this.aPos.x += vel.x * 5;
        this.aPos.y -= vel.y * 5;
      } else if (player.getID() == 1) {
        this.bPos.x += vel.x * 5;
        this.bPos.y -= vel.y * 5;
      }
    }
  }

  draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circles for the characters.
    ctx.fillStyle = "red";
    ctx.fillRect(this.aPos.x - 5, this.aPos.y - 5, 10, 10);

    ctx.fillStyle = "blue";
    ctx.fillRect(this.bPos.x - 5, this.bPos.y - 5, 10, 10);
  }
}

new RollbackWrapper(SimpleGame).start();
