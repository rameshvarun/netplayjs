import { DefaultInput, DefaultInputReader } from "../defaultinput";
import { NetplayPlayer, NetplayState } from "../netcode/types";

import * as log from "loglevel";
import { GameClass } from "../game";

import { assert } from "chai";

import { DEFAULT_SERVER_URL, MatchmakingClient } from "../matchmaking/client";
import { PeerConnection } from "../matchmaking/peerconnection";

import * as utils from "../utils";
import * as lit from "lit-html";
import { GameMenu } from "../ui/gamemenu";
import EWMASD from "../ewmasd";

const PING_INTERVAL = 100;

export abstract class GameWrapper {
  gameClass: GameClass;

  /** The canvas that the game will be rendered onto. */
  canvas: HTMLCanvasElement;

  /** The network stats UI. */
  stats: HTMLDivElement;

  inputReader: DefaultInputReader;

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

  playerPausedIndicator: HTMLDivElement;

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
    this.stats.style.display = "none";

    document.body.appendChild(this.stats);

    // Create browser background info,
    this.playerPausedIndicator = (() => {
      const div = document.createElement("div");
      div.style.zIndex = "1";
      div.style.position = "absolute";
      div.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      div.style.color = "white";
      div.style.padding = "10px";
      div.style.left = "50%";
      div.style.top = "50%";
      div.style.transform = "translate(-50%, -50%)";

      div.style.boxSizing = "border-box";
      div.style.fontFamily = "sans-serif";
      div.innerHTML = `
      <p align="center" style="margin: 3px">The other player has minimized or hidden their tab.</p>
      <p align="center" style="margin: 3px">The game may run slowly until they return.</p>
      `;
      div.style.display = "none";

      document.body.appendChild(div);
      return div;
    })();

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
      document.body,
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

  async start() {
    const gameMenu = new GameMenu();

    gameMenu.onClientStart.once((conn) => {
      const players = [
        new NetplayPlayer(0, false, true), // Player 0 is our peer, the host.
        new NetplayPlayer(1, true, false), // Player 1 is us, a client
      ];

      this.watchRTCStats(conn.peerConnection);
      this.startPing(conn);
      this.startVisibilityWatcher(conn);

      this.startClient(players, conn);
    });

    gameMenu.onHostStart.once((conn) => {
      // Construct the players array.
      const players: Array<NetplayPlayer> = [
        new NetplayPlayer(0, true, true), // Player 0 is us, acting as a host.
        new NetplayPlayer(1, false, false), // Player 1 is our peer, acting as a client.
      ];

      this.watchRTCStats(conn.peerConnection);
      this.startPing(conn);
      this.startVisibilityWatcher(conn);

      this.startHost(players, conn);
    });
  }

  startVisibilityWatcher(conn: PeerConnection) {
    // Send the current tab visibility to the other player.
    conn.send({ type: "visibility-state", value: document.visibilityState });

    // Update the other player on our tab visibility.
    document.addEventListener("visibilitychange", () => {
      log.debug(`My visibility state changed to: ${document.visibilityState}.`);
      conn.send({ type: "visibility-state", value: document.visibilityState });
    });

    // Show an indicator if the other player's tab is invisible.
    conn.on("data", (data) => {
      if (data.type === "visibility-state") {
        if (data.value === "hidden") {
          this.playerPausedIndicator.style.display = "inherit";
        } else {
          this.playerPausedIndicator.style.display = "none";
        }
      }
    });
  }

  pingMeasure: EWMASD = new EWMASD(0.2);
  startPing(conn: PeerConnection) {
    setInterval(() => {
      conn.send({ type: "ping-req", sent_time: performance.now() });
    }, PING_INTERVAL);

    conn.on("data", (data) => {
      if (data.type == "ping-req") {
        conn.send({ type: "ping-resp", sent_time: data.sent_time });
      } else if (data.type == "ping-resp") {
        this.pingMeasure.update(performance.now() - data.sent_time);
      }
    });
  }

  renderRTCStats(stats: RTCStatsReport): lit.TemplateResult {
    return lit.html`
      <details>
        <summary>WebRTC Stats</summary>
        ${[...stats.values()].map(
          (report) =>
            lit.html`<div style="margin-left: 10px;">
            <details>
              <summary>${report.type}</summary>
              ${Object.entries(report).map(([key, value]) => {
                if (key !== "type") {
                  return lit.html`<div style="margin-left: 10px;">${key}: ${report[key]}</div>`;
                }
              })}
            </details>
          </div>`
        )}
      </details>
    `;
  }

  rtcStats?: lit.TemplateResult;
  async watchRTCStats(connection: RTCPeerConnection) {
    const stats = await connection.getStats();
    this.rtcStats = this.renderRTCStats(stats);

    setTimeout(async () => {
      await this.watchRTCStats(connection);
    }, 1000);
  }

  abstract startHost(players: Array<NetplayPlayer>, conn: PeerConnection);
  abstract startClient(players: Array<NetplayPlayer>, conn: PeerConnection);
}
