# netplayjs-server

This repo contains the server-side code for NetplayJS. The server has two responsibilities.
- Boostrap a P2P data channel between two browsers by forwarding WebRTC signaling messages.
- Start matches between strangers online who are playing the same game.

The server is designed to be as generic as possible - you can point any NetplayJS game at any `netplayjs-server` instance, and that server will automatically be used for connection bootstrapping and signaling.

## Developing

```bash
git clone --recursive https://github.com/rameshvarun/netplayjs-server.git
cd netplayjs-server
npm install
npm start
```

## Running from Docker Hub
```bash
docker run --publish 80:3000 varunramesh/netplayjs-server:0.0.6
```
