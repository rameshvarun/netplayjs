import { DefaultInput } from "./defaultinput";
import { NetplayPlayer, NetplayState } from "./netcode/types";
import { TouchControl } from "./touchcontrols";

export type GameClass = {
  new (canvas: HTMLCanvasElement, players: Array<NetplayPlayer>): Game;

  /**
   * The length of a single timestep in milliseconds.
   */
  timestep: number;

  /**
   * NOT SUPPORTED YET.
   */
  numPlayers?: number | { min: number; max: number };

  /**
   * Canvases need to have a fixed pixel size. This allows us to normalize
   * mouse position and touches across the network.
   */
  canvasSize: { width: number; height: number };

  /**
   * Should we scale up the canvas with the device pixel ratio?
   * If enabled, it is up to the game code to draw correctly
   * using window.devicePixelRatio.
   */
  highDPI?: boolean;

  /**
   * Whether or not we should lock the pointer when the user clicks on the
   * canvas. Use this for games like FPSs.
   */
  pointerLock?: boolean;

  /**
   * Whether or not we should prevent the context menu from appearing when
   * the user right clicks on the canvas.
   */
  preventContextMenu?: boolean;

  /**
   * A list of all the touch controls needed for this game. These will
   * only be shown on mobile.
   */
  touchControls?: { [name: string]: TouchControl };

  /**
   * Is the game deterministic? By default, we assume no. If this is true,
   * certain netcode algorithms can perform more efficiently.
   */
  deterministic?: boolean;
};

export abstract class Game extends NetplayState<DefaultInput> {
  abstract draw(canvas: HTMLCanvasElement);
}
