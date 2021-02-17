# netplayjs [![Build Status](https://travis-ci.org/rameshvarun/netplayjs.svg?branch=master)](https://travis-ci.org/rameshvarun/netplayjs)

Making multiplayer games is hard, but it doesn't have to be. If emulators like RetroArch and Dolphin can turn any singleplayer game into a multiplayer game, then we can get the same interface in Javascript.

The goal of netplayjs is to allow you to write your game as if it were a local multiplayer game. Then, using this library, you can select a netcode implementation and automatically apply it to your game, thus making it playable over a network.

Currently, the library provides a rollback netcode implementation and a basic match setup system for two player games.

Planned Features:
- Matchmaking
