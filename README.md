# netplayjs [![Build Status](https://travis-ci.org/rameshvarun/netplayjs.svg?branch=master)](https://travis-ci.org/rameshvarun/netplayjs)
(WIP) Rollback netcode implementation for JS and WebRTC.

This project consists of three components:
- `NetplayManager`, the core rollback netcode implementation. This class handles all of the input prediction and rewinds. It doesn't implement the transport, so you must call `NetplayManager.onRemoteInput` when an input is received over the transport, as well as provide a `broadcastInput` function which should send inputs on the transport. `NetplayManager` requires an ordered reliable transport.
- The lobby. This code takes a description of game (`GameType`) and creates a lobby that can be joined using a URL. Once people join, a WebRTC data channel is initialized, a `NetplayManager` instance is created, and a game loop is started. This code is powered by PeerJS.
- `PongGameType` a pong game implemented to fit the interface that the lobby expects.
