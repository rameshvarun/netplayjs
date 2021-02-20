import Peer from "peerjs";
import { DefaultInput, DefaultInputReader } from "./defaultinput";
import EWMASD from "./ewmasd";
import { LockstepNetcode } from "./netcode/lockstep";
import { NetplayPlayer, NetplayState } from "./types";

import * as QRCode from "qrcode";
import * as log from "loglevel";
import { GameWrapper } from "./gamewrapper";
import { Game, GameClass } from "./game";

const PING_INTERVAL = 100;

export class LockstepWrapper extends GameWrapper {
  pingMeasure: EWMASD = new EWMASD(0.2);

  game?: Game;

  lockstepCore?: LockstepNetcode<Game, DefaultInput>;

  constructor(gameClass: GameClass) {
    super(gameClass);
  }

  startHost(hostID: string) {
    log.info("Starting a lockstep host..");

    let joinURL = `${window.location.href}#room=${hostID}`;
    this.stats.innerHTML = `<div>Join URL (Open in a new window or send to a friend): <a href="${joinURL}">${joinURL}<div>`;

    const qrCanvas = document.createElement("canvas");
    this.stats.appendChild(qrCanvas);
    QRCode.toCanvas(qrCanvas, joinURL);

    this.peer!.on("connection", (conn) => {
      conn.on("error", (err) => console.error(err));

      const players: Array<NetplayPlayer> = [
        // Player 0 is us, acting as a host.
        new NetplayPlayer(0, true, true),
        // Player 1 is our peer, acting as a client.
        new NetplayPlayer(1, false, false),
      ];

      this.game = new this.gameClass(this.canvas, players);

      this.lockstepCore = new LockstepNetcode(
        true,
        this.game!,
        players,
        (frame, input) => {
          conn.send({ type: "input", frame: frame, input: input.serialize() });
        }
      );

      conn.on("data", (data) => {
        if (data.type === "input") {
          let input = new DefaultInput();
          input.deserialize(data.input);

          this.lockstepCore!.onRemoteInput(data.frame, players![1], input);
        } else if (data.type == "ping-req") {
          conn.send({ type: "ping-resp", sent_time: data.sent_time });
        } else if (data.type == "ping-resp") {
          this.pingMeasure.update(Date.now() - data.sent_time);
        }
      });

      conn.on("open", () => {
        console.log("Client has connected... Starting game...");

        setInterval(() => {
          conn.send({ type: "ping-req", sent_time: Date.now() });
        }, PING_INTERVAL);

        this.startGameLoop();
      });
    });
  }

  startClient(room: string) {
    log.info("Starting a lockstep client..");
    log.info(`Connecting to room ${room}.`);

    const conn = this.peer!.connect(room as string, {
      serialization: "json",
      reliable: true,
    });

    const players = [
      // Player 0 is our peer, who is the host.
      new NetplayPlayer(0, false, true),
      // Player 1 is us, acting as a client
      new NetplayPlayer(1, true, false),
    ];

    this.game = new this.gameClass(this.canvas, players);
    this.lockstepCore = new LockstepNetcode(
      false,
      this.game!,
      players,
      (frame, input) => {
        conn.send({ type: "input", frame: frame, input: input.serialize() });
      }
    );

    conn.on("error", (err) => console.error(err));
    conn.on("data", (data) => {
      if (data.type === "input") {
        let input = new DefaultInput();
        input.deserialize(data.input);

        this.lockstepCore!.onRemoteInput(data.frame, players![0], input);
      } else if (data.type === "state") {
        //   netplayManager!.onStateSync(data.frame, data.state);
      } else if (data.type == "ping-req") {
        conn.send({ type: "ping-resp", sent_time: data.sent_time });
      } else if (data.type == "ping-resp") {
        this.pingMeasure.update(Date.now() - data.sent_time);
      }
    });
    conn.on("open", () => {
      console.log("Successfully connected to server... Starting game...");

      setInterval(() => {
        conn.send({ type: "ping-req", sent_time: Date.now() });
      }, PING_INTERVAL);

      this.startGameLoop();
    });
  }

  startGameLoop() {
    const timestep = this.gameClass.timestep;
    let lastFrameTime = null;

    let animate = (timestamp) => {
      if (!lastFrameTime) lastFrameTime = timestamp;

      if (timestamp - lastFrameTime! >= Math.floor(timestep)) {
        // Tick state forward.
        let input = this.inputReader.getInput();
        this.lockstepCore!.tick(input);

        // Draw state to canvas.
        this.game!.draw(this.canvas);

        // Update stats
        this.stats.innerHTML = `
        <div>Timestep: ${timestamp - lastFrameTime!}</div>
        <div>Ping: ${this.pingMeasure
          .average()
          .toFixed(2)} ms +/- ${this.pingMeasure.stddev().toFixed(2)} ms</div>
        <div>Frame Number: ${this.lockstepCore!.frame}</div>
        `;

        lastFrameTime = timestamp;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}
