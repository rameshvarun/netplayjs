import * as express from "express";
import * as http from "http";
import * as cors from "cors";
import * as log from "loglevel";
import { PROTOCOL_VERSION, ServerMessage } from "./protocol";
import { AddressInfo, WebSocketServer, WebSocket } from "ws";
import { SocketServer } from "./socketserver";

// The currently running version of the server code.
const SERVER_VERSION = require("../package.json").version;

// This class is responsible for handling any GET requests.
// Socket handling is delegated to SocketServer.
export class Server {
    server: http.Server;
    app: express.Express;
  
    constructor() {
      this.app = express();
      this.app.use(cors());
  
      const wss = new WebSocketServer({ noServer: true });
      const socketServer = new SocketServer(wss);
  
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