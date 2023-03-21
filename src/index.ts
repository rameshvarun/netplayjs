import * as express from "express";
import * as http from "http";
import * as cors from "cors";
import * as log from "loglevel";
import { PROTOCOL_VERSION } from "./protocol";
import { AddressInfo, WebSocketServer } from "ws";

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

const app = express();
app.use(cors());

const wss = new WebSocketServer({ noServer: true });

const server = http.createServer(app);

app.get("/", (request, result) => {
  result.json({
    server_version: SERVER_VERSION,
    require_captcha: false,
    protocol_version: PROTOCOL_VERSION,
  });
});

server.on("upgrade", function upgrade(request, socket, head) {
  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit("connection", ws, request);
  });
});

server.listen(process.env.PORT || 3000, () => {
  log.info(
    `Server started on port ${(server.address() as AddressInfo).port}...`
  );
});
