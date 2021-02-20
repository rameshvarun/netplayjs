import { DefaultInput, DefaultInputReader } from "./defaultinput";
import { NetplayState } from "./types";

import * as log from "loglevel";
import { GameClass } from "./game";
import Peer from "peerjs";

import * as query from "query-string";

export abstract class GameWrapper {
  gameClass: GameClass;

  canvas: HTMLCanvasElement;

  stats: HTMLDivElement;

  inputReader: DefaultInputReader;

  constructor(gameClass: GameClass) {
    this.gameClass = gameClass;

    // Create canvas for game.
    this.canvas = document.createElement("canvas");
    this.canvas.width = gameClass.canvasSize.width;
    this.canvas.height = gameClass.canvasSize.height;

    this.canvas.style.backgroundColor = "black";
    this.canvas.style.position = "absolute";
    this.canvas.style.zIndex = "0";
    this.canvas.style.boxShadow = "0px 0px 10px black";

    this.resize();
    window.addEventListener("resize", () => this.resize());

    document.body.appendChild(this.canvas);

    // Create stats UI
    this.stats = document.createElement("div");
    this.stats.style.zIndex = "1";
    this.stats.style.position = "absolute";
    this.stats.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.stats.style.color = "white";
    this.stats.style.padding = "5px";

    document.body.appendChild(this.stats);

    this.inputReader = new DefaultInputReader(
      this.canvas,
      this.gameClass.pointerLock || false
    );
  }

  /**
   * Calculate a scaling for our canvas so that it fits the whole screen.
   * Center the canvas with an offset.
   */
  calculateLayout(
    container: { width: number; height: number },
    canvas: { width: number; height: number }
  ): { width: number; height: number; left: number; top: number } {
    const widthRatio = container.width / canvas.width;
    const heightRatio = container.height / canvas.height;

    // We are constrained by the height of the canvas.
    const heightLimited = canvas.width * heightRatio >= container.width;

    const ratio = heightLimited ? widthRatio : heightRatio;

    let width = canvas.width * ratio;
    let height = canvas.height * ratio;

    let left = 0;
    let top = 0;

    if (heightLimited) {
      top = container.height / 2 - height / 2;
    } else {
      left = container.width / 2 - width / 2;
    }

    return { width, height, left, top };
  }

  /**
   * Recalculate canvas scaling / offset.
   */
  resize() {
    const layout = this.calculateLayout(
      { width: window.innerWidth, height: window.innerHeight },
      this.gameClass.canvasSize
    );
    log.debug("Calculating new layout: %o", layout);

    this.canvas.style.width = `${layout.width}px`;
    this.canvas.style.height = `${layout.height}px`;

    this.canvas.style.top = `${layout.top}px`;
    this.canvas.style.left = `${layout.left}px`;
  }

  peer?: Peer;

  start() {
    log.info("Creating a PeerJS instance.");

    this.peer = new Peer();
    this.peer.on("error", (err) => console.error(err));

    this.peer!.on("open", (id) => {
      // Try to parse the room from the hash. If we find one,
      // we are a client.
      const parsedHash = query.parse(window.location.hash);
      const isClient = !!parsedHash.room;

      if (isClient) this.startClient(parsedHash.room as string);
      else this.startHost(id);
    });
  }

  abstract startHost(hostID: string);
  abstract startClient(joinID: string);
}
