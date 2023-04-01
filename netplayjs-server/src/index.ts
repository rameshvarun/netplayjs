import * as log from "loglevel";
import { Server } from "./server";

// Set log level from environment variable.
log.setLevel((process.env.LOGLEVEL as log.LogLevelNames) || "info");

// Start HTTP server.
const server = new Server();
server.start();