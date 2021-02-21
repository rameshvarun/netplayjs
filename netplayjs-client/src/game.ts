import { DefaultInput } from "./defaultinput";
import { NetplayPlayer, NetplayState } from "./types";
import { TouchControl } from "./touchcontrols";

export type GameClass = {
  new (canvas: HTMLCanvasElement, players: Array<NetplayPlayer>): Game;
  timestep: number;

  /**
   * Canvases need to have a fixed pixel size. This allows us to normalize
   * mouse position and touches across the network.
   */
  canvasSize: { width: number; height: number };

  /**
   * Whether or not we should lock the pointer when the user clicks on the
   * canvas. Use this for games like FPSs.
   */
  pointerLock?: boolean;

  /**
   * A list of all the touch controls needed for this game. These will
   * only be shown on mobile.
   */
  touchControls?: { [name: string]: TouchControl };

  /**
   * How often should the state be synced. By default this happens
   * every frame. Set to zero to indicate that the state is deterministic
   * and doesn't need to be synced.
   */
  stateSyncPeriod?: number;
};

export abstract class Game extends NetplayState<DefaultInput> {
  abstract draw(canvas: HTMLCanvasElement);
}
