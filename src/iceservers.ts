import * as log from "loglevel";

// Default ICE servers when none has been provided.
const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export async function getICEServers() {
  if (process.env["ICE_SERVERS"]) {
    log.debug("Loading ICE servers from environment variable...");
    return JSON.parse(process.env["ICE_SERVERS"]);
  } else {
    log.debug("Using default ICE servers list...");
    return DEFAULT_ICE_SERVERS;
  }
}
