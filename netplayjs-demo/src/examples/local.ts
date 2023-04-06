import {
  LocalWrapper,
  Vec2,
  Game,
  NetplayPlayer,
  DefaultInput,
} from "netplayjs/src/index";

const COLORS = ["red", "blue", "green", "yellow", "orange", "purple"];

export class SimpleGame extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: 600, height: 300 };
  static numPlayers = { min: 2, max: 6 };

  playerStates: Array<{ pos: Vec2; color: string }> = [];

  constructor(canvas: HTMLCanvasElement, players: Array<NetplayPlayer>) {
    super();

    const xStart = 100;
    const xEnd = 500;
    const range = xEnd - xStart;
    const increments = range / (players.length - 1);

    for (let player of players) {
      this.playerStates.push({
        pos: new Vec2(player.getID() * increments + xStart, 150),
        color: COLORS[player.getID() % COLORS.length],
      });
    }
  }

  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
    for (const [player, input] of playerInputs.entries()) {
      const vel = input.arrowKeys().multiplyScalar(5);

      this.playerStates[player.getID()].pos.x += vel.x;
      this.playerStates[player.getID()].pos.y -= vel.y;
    }
  }

  draw(canvas: HTMLCanvasElement) {
    // Fill in a black background.
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw squares for the characters.
    for (let player of this.playerStates) {
      ctx.fillStyle = player.color;
      ctx.fillRect(player.pos.x - 5, player.pos.y - 5, 10, 10);
    }
  }
}

new LocalWrapper(SimpleGame).start();
