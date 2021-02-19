import Peer from "peerjs";
import { DefaultInput, DefaultInputReader } from "./defaultinput";
import EWMASD from "./ewmasd";
import { LockstepNetcode } from "./netcode/lockstep";
import { NetplayPlayer, NetplayState } from "./types";

import * as query from "query-string";
import * as QRCode from "qrcode";
import * as log from "loglevel";
import { GameWrapper } from "./gamewrapper";
import { Game, GameClass } from "./game";

const PING_INTERVAL = 100;

export class LockstepWrapper extends GameWrapper {
  pingMeasure: EWMASD = new EWMASD(0.2);

  inputReader: DefaultInputReader;
  game?: Game;

  lockstepCore?: LockstepNetcode<Game, DefaultInput>;

  constructor(gameClass: GameClass) {
    super(gameClass);

    this.inputReader = new DefaultInputReader(this.canvas, this.gameClass.pointerLock || false);
  }

  peer?: Peer;
  start() {
    this.peer = new Peer();
    this.peer.on("error", (err) => console.error(err));

    const parsedHash = query.parse(window.location.hash);
    const isClient = !!parsedHash.room;

    if (isClient) this.startClient(parsedHash.room as string);
    else this.startHost();
  }

  startHost() {
    log.info("Starting a lockstep host..");

    this.peer!.on("open", (id) => {
      let joinURL = `${window.location.href}#room=${id}`;
      this.stats.innerHTML = `<div>Join URL (Open in a new window or send to a friend): <a href="${joinURL}">${joinURL}<div>`;

      const qrCanvas = document.createElement("canvas");
      this.stats.appendChild(qrCanvas);
      QRCode.toCanvas(qrCanvas, joinURL);
    });

    this.peer!.on("connection", (conn) => {
      conn.on("error", (err) => console.error(err));

      const players: Array<NetplayPlayer> = [
        // Player 0 is us, the host.
        {
          getID() {
            return 0;
          },
          isLocalPlayer() {
            return true;
          },
          isRemotePlayer() {
            return false;
          },
          isServer() {
            return true;
          },
          isClient() {
            return false;
          },
        },
        // Player 1 is the peer.
        {
          getID() {
            return 1;
          },
          isLocalPlayer() {
            return false;
          },
          isRemotePlayer() {
            return true;
          },
          isServer() {
            return false;
          },
          isClient() {
            return true;
          },
        },
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

    this.peer!.on("open", () => {
      log.info(`Connecting to room ${room}.`);

      const conn = this.peer!.connect(room as string, {
        serialization: "json",
        reliable: true,
      });

      const players = [
        // Player 0 is our host, the peer.
        {
          getID() {
            return 0;
          },
          isLocalPlayer() {
            return false;
          },
          isRemotePlayer() {
            return true;
          },
          isServer() {
            return true;
          },
          isClient() {
            return false;
          },
        },
        // Player 1 is us, a client.
        {
          getID() {
            return 1;
          },
          isLocalPlayer() {
            return true;
          },
          isRemotePlayer() {
            return false;
          },
          isServer() {
            return false;
          },
          isClient() {
            return true;
          },
        },
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
