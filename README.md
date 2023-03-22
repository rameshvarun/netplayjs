# netplayjs-server

![](https://github.com/rameshvarun/netplayjs-server/actions/workflows/node.js.yml/badge.svg)

A basic matchmaking server. Game updates are sent peer-to-peer and thus don't go through this server.

## Developing

```bash
git clone --recursive https://github.com/rameshvarun/netplayjs-server.git
cd netplayjs-server
nvm use # (Optional) If you have NVM installed to manage multiple node versions.
npm install
npm start
```

## Running from Docker Hub
```bash
docker run --publish 80:3000 varunramesh/netplayjs-server:0.0.3
```
