import { DefaultInput, DefaultInputReader } from "./defaultinput";
import { NetplayPlayer, NetplayState } from "./types";

import { Game, GameClass } from "./game";

export class TestWrapper {
  gameClass: GameClass;

  game: Game;

  /** The canvas that the game will be rendered onto. */
  canvas: HTMLCanvasElement;

  inputReader: DefaultInputReader;

  players = [
    new NetplayPlayer(0, true, true),
    new NetplayPlayer(1, false, false),
  ];

  constructor(gameClass: GameClass) {
    this.gameClass = gameClass;

    // Create canvas for game.
    this.canvas = document.createElement("canvas");
    this.canvas.width = gameClass.canvasSize.width;
    this.canvas.height = gameClass.canvasSize.height;

    this.canvas.style.backgroundColor = "black";
    document.body.appendChild(this.canvas);

    if (
      this.gameClass.touchControls &&
      window.navigator.userAgent.toLowerCase().includes("mobile")
    ) {
      for (let [name, control] of Object.entries(
        this.gameClass.touchControls
      )) {
        control.show();
      }
    }

    this.inputReader = new DefaultInputReader(
      this.canvas,
      this.gameClass.pointerLock || false,
      this.gameClass.touchControls || {}
    );

    this.game = new this.gameClass(this.canvas, this.players);
  }

  start() {
    setInterval(() => {
      let inputs = new Map();
      for (let player of this.players) {
        if (player.isLocalPlayer()) {
          inputs.set(player, this.inputReader.getInput());
        } else {
          inputs.set(player, new DefaultInput());
        }
      }
      this.game.tick(inputs);
    }, this.gameClass.timestep);

    let animate = (timestamp) => {
      // Draw state to canvas.
      this.game!.draw(this.canvas);

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}
