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

  getPlayers(instanceID: number, numPlayers: number): Array<NetplayPlayer> {
    let players: NetplayPlayer[] = [];
    for (let i = 0; i < numPlayers; ++i) {
      players.push(new NetplayPlayer(i, i == instanceID, i == 0));
    }
    return players;
  }

  constructor(gameClass: GameClass) {
    this.gameClass = gameClass;

    let numPlayers = 2;
    if (typeof gameClass.numPlayers == "number") {
      numPlayers = gameClass.numPlayers;
    } else if (typeof gameClass.numPlayers == "object") {
      numPlayers = parseInt(prompt(`How many players should there be?`)!);
      if (
        numPlayers > gameClass.numPlayers.max ||
        numPlayers < gameClass.numPlayers.min
      ) {
        alert(`Invalid number of players.`);
        numPlayers = gameClass.numPlayers.max;
      }
    }

    document.body.style.padding = "5px";

    for (let i = 0; i < numPlayers; ++i) {
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
      const players = this.getPlayers(i, numPlayers);
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
