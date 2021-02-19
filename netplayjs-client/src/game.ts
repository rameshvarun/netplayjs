import { DefaultInput } from "./defaultinput";
import { NetplayState } from "./types";

export type GameClass = {
    new (): Game;
    timestep: number;

    /**
     * Canvases need to have a fixed pixel size. This allows us to normalize
     * mouse position and touches across the network.
     */
    canvasSize: { width: number; height: number };
  };

  export abstract class Game extends NetplayState<DefaultInput> {
    abstract draw(canvas: HTMLCanvasElement);
  }
