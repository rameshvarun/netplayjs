import { DefaultInput, DefaultInputReader } from "../defaultinput";
import { NetplayPlayer, NetplayState } from "../types";

import { Game, GameClass } from "../game";

type GameInstance = {
  canvas: HTMLCanvasElement;
  game: Game;
  inputReader: DefaultInputReader;
  players: Array<NetplayPlayer>;
};

export class LocalWrapper {
  gameClass: GameClass;

  instances: Array<GameInstance> = [];

  getPlayers(instanceID: number): Array<NetplayPlayer> {
    if (instanceID == 0) {
      return [
        new NetplayPlayer(0, true, true),
        new NetplayPlayer(1, false, false),
      ];
    } else {
      return [
        new NetplayPlayer(0, false, true),
        new NetplayPlayer(1, true, false),
      ];
    }
  }

  constructor(gameClass: GameClass) {
    this.gameClass = gameClass;

    document.body.style.padding = "5px";

    for (let i = 0; i < 2; ++i) {
      // Create canvas for game.
      const canvas = document.createElement("canvas");
      canvas.width = gameClass.canvasSize.width;
      canvas.height = gameClass.canvasSize.height;
      canvas.tabIndex = 0;

      canvas.style.backgroundColor = "black";
      canvas.style.boxShadow = "0px 0px 10px black";
      canvas.style.margin = "5px";
      document.body.appendChild(canvas);

      // Create input reader.
      const inputReader = new DefaultInputReader(
        canvas,
        canvas,
        this.gameClass.pointerLock || false,
        {}
      );

      // Create game.
      const players = this.getPlayers(i);
      const game = new this.gameClass(canvas, players);
      this.instances.push({
        canvas,
        inputReader,
        game,
        players,
      });
    }
  }

  start() {
    let lastTimestamp = performance.now();
    let animate = (timestamp) => {
      if (timestamp >= lastTimestamp + this.gameClass.timestep) {
        // Query each of our input readers.
        let instanceInputs = this.instances.map((inst) =>
          inst.inputReader.getInput()
        );

        for (let instance of this.instances) {
          let inputs = new Map();
          instance.players.forEach((player, i) => {
            inputs.set(player, instanceInputs[i]);
          });

          // Tick game state forward.
          instance.game.tick(inputs);

          // Draw state to canvas.
          instance.game.draw(instance.canvas);
        }
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}
