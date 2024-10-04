# netplayjs-server
[![npm](https://img.shields.io/npm/v/netplayjs-server)](https://www.npmjs.com/package/netplayjs-server)
[![Docker Pulls](https://img.shields.io/docker/pulls/varunramesh/netplayjs-server)](https://hub.docker.com/r/varunramesh/netplayjs-server)

This package contains the server-side code for NetplayJS. The server has two responsibilities.
- Boostrap a P2P data channel between two browsers by forwarding WebRTC signaling messages.
- Start matches between strangers online who are playing the same game.

The server is designed to be completely generic and game-agnostic - you can point any NetplayJS game at any `netplayjs-server` instance. The protocol used to communicate with the server is defined in [matchmaking-protocol.ts](https://github.com/rameshvarun/netplayjs/blob/master/netplayjs-common/matchmaking-protocol.ts).

I host a shared instance of the server that NetplayJS games use by default. If you are hosting a high-traffic game or if the shared server goes down, you should host your own.

NetplayJS games can easily be pointed a new server without changing any code. Simply append `#server=https://your-server-url.com` to the URL of the game. For example, `https://rameshvarun.github.io/netplayjs/pong/#server=https://your-server-url.com`.

## Run from Docker Hub
```bash
docker run --publish 80:3000 varunramesh/netplayjs-server:0.0.9
```

## Run from NPM
```bash
npm install -g netplayjs-server
netplayjs-server
```


