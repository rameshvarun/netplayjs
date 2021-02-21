import { DefaultInput, DefaultInputReader } from "./defaultinput";
import { NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { GameClass } from "./game";
import Peer from "peerjs";

import * as query from "query-string";
import { doc } from "prettier";
import * as QRCode from "qrcode";
import { assert } from "chai";

export abstract class GameWrapper {
  gameClass: GameClass;

  /** The canvas that the game will be rendered onto. */
  canvas: HTMLCanvasElement;

  /** The network stats UI. */
  stats: HTMLDivElement;

  /** The floating menu used to select a match. */
  menu: HTMLDivElement;

  inputReader: DefaultInputReader;

  stateSyncPeriod: number;

  isChannelOrdered(channel: RTCDataChannel) {
    return channel.ordered;
  }

  isChannelReliable(channel: RTCDataChannel) {
    return (
      channel.maxPacketLifeTime === null && channel.maxRetransmits === null
    );
  }

  checkChannel(channel: RTCDataChannel) {
    assert.isTrue(
      this.isChannelOrdered(channel),
      "Data Channel must be ordered."
    );
    assert.isTrue(this.isChannelReliable(channel), "Channel must be reliable.");
  }

  constructor(gameClass: GameClass) {
    this.gameClass = gameClass;

    this.stateSyncPeriod = this.gameClass.stateSyncPeriod || 1;

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
    this.stats.style.display = "none";

    document.body.appendChild(this.stats);

    // Create menu UI
    this.menu = document.createElement("div");
    this.menu.style.zIndex = "1";
    this.menu.style.position = "absolute";
    this.menu.style.backgroundColor = "white";
    this.menu.style.padding = "5px";
    this.menu.style.left = "50%";
    this.menu.style.top = "50%";
    this.menu.style.boxShadow = "0px 0px 10px black";
    this.menu.style.transform = "translate(-50%, -50%)";

    document.body.appendChild(this.menu);

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
    this.menu.innerHTML = "Connecting to PeerJS...";

    this.peer = new Peer();
    this.peer.on("error", (err) => console.error(err));

    this.peer!.on("open", (id) => {
      // Try to parse the room from the hash. If we find one,
      // we are a client.
      const parsedHash = query.parse(window.location.hash);
      const isClient = !!parsedHash.room;

      if (isClient) {
        // We are a client, so connect to the room from the hash.
        this.menu.style.display = "none";

        log.info(`Connecting to room ${parsedHash.room}.`);

        const conn = this.peer!.connect(parsedHash.room as string, {
          serialization: "json",
          reliable: true,
          // @ts-ignore
          _payload: {
            // This is a hack to get around a bug in PeerJS
            originator: true,
            reliable: true,
          },
        });

        conn.on("error", (err) => console.error(err));

        // Construct the players array.
        const players = [
          new NetplayPlayer(0, false, true), // Player 0 is our peer, the host.
          new NetplayPlayer(1, true, false), // Player 1 is us, a client
        ];

        this.startClient(players, conn);
      } else {
        // We are host, so we need to show a join link.
        log.info("Showing join link.");

        // Show the join link.
        let joinURL = `${window.location.href}#room=${id}`;
        this.menu.innerHTML = `<div>Join URL (Open in a new window or send to a friend): <a href="${joinURL}">${joinURL}<div>`;

        // Add a QR code for joining.
        const qrCanvas = document.createElement("canvas");
        this.menu.appendChild(qrCanvas);
        QRCode.toCanvas(qrCanvas, joinURL);

        // Construct the players array.
        const players: Array<NetplayPlayer> = [
          new NetplayPlayer(0, true, true), // Player 0 is us, acting as a host.
          new NetplayPlayer(1, false, false), // Player 1 is our peer, acting as a client.
        ];

        // Wait for a connection from a client.
        this.peer!.on("connection", (conn) => {
          // Make the menu disappear.
          this.menu.style.display = "none";
          conn.on("error", (err) => console.error(err));

          this.startHost(players, conn);
        });
      }
    });
  }

  formatRTCStats(stats: RTCStatsReport): string {
    let output = "";
    stats.forEach((report) => {
      output += `<details>`;
      output += `<summary>${report.type}</summary>`;

      Object.keys(report).forEach((key) => {
        if (key !== "type") {
          output += `<div>${key}: ${report[key]}</div> `;
        }
      });

      output += `</details>`;
    });
    return output;
  }

  rtcStats: string = "";
  watchRTCStats(connection: RTCPeerConnection) {
    setInterval(() => {
      connection
        .getStats()
        .then((stats) => (this.rtcStats = this.formatRTCStats(stats)));
    }, 1000);
  }

  abstract startHost(players: Array<NetplayPlayer>, conn: Peer.DataConnection);
  abstract startClient(
    players: Array<NetplayPlayer>,
    conn: Peer.DataConnection
  );
}
