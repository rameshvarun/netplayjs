import * as express from "express";
import * as http from "http";
import * as cors from "cors";
import * as log from "loglevel";
import { PROTOCOL_VERSION, ServerMessage } from "./protocol";
import { AddressInfo, WebSocketServer, WebSocket } from "ws";
import { ConnectionHandler } from "./connectionhandler";

// Set log level from environment variable.
log.setLevel((process.env.LOGLEVEL as log.LogLevelNames) || "info");

// The currently running version of the server.
const SERVER_VERSION = require("../package.json").version;

// Default ICE servers when none has been provided.
const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function getICEServers() {
  if (process.env["ICE_SERVERS"]) {
    log.debug("Loading ICE servers from environment variable...");
    return JSON.parse(process.env["ICE_SERVERS"]);
  } else {
    log.debug("Using default ICE servers list...");
    return DEFAULT_ICE_SERVERS;
  }
}

export class MatchmakingServer {
  server: http.Server;
  app: express.Express;

  constructor() {
    this.app = express();
    this.app.use(cors());

    const wss = new WebSocketServer({ noServer: true });
    const connectionHandler = new ConnectionHandler(wss);

    this.server = http.createServer(this.app);

    this.app.get("/", (request, result) => {
      result.json({
        server_version: SERVER_VERSION,
        require_captcha: false,
        protocol_version: PROTOCOL_VERSION,
      });
    });

    this.server.on("upgrade", function upgrade(request, socket, head) {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit("connection", ws, request);
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(process.env.PORT || 3000, () => {
        const port = (this.server.address() as AddressInfo).port;
        log.info(`Server started on port ${port}...`);
        resolve();
      });
    });
  }

  close() {
    this.server.close();
  }
}
