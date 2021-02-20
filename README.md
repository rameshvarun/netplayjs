# (WIP) netplayjs [![Build Status](https://travis-ci.org/rameshvarun/netplayjs.svg?branch=master)](https://travis-ci.org/rameshvarun/netplayjs)


Make peer-to-peer WebRTC-based multiplayer games in just a few lines of Javascript, no server or network synchronization code required! Powered by PeerJS and an implementation of rollback netcode.

<center>

![](./demo.gif)

[CHECK THE DEMO](https://rameshvarun.github.io/netplayjs/)

</center>

## Basic Usage

Add this script tag to your HTML.
```html
<script src="https://unpkg.com/netplayjs@0.2.0/dist/netplay.js"></script>
```

Add this javascript code.
```javascript
class SimpleGame extends netplayjs.Game {
  constructor() {
    super();

    // Initialize our player positions.
  	this.aPos = { x: 100, y: 150 };
    this.bPos = { x: 500, y: 150 };
  }

  tick(playerInputs) {
    for (const [player, input] of playerInputs.entries()) {
      // Generate player velocity from input keys.
      const vel = {
        x:
          (input.pressed.ArrowLeft ? -1 : 0) +
          (input.pressed.ArrowRight ? 1 : 0),
        y:
          (input.pressed.ArrowDown ? -1 : 0) +
          (input.pressed.ArrowUp ? 1 : 0),
      };

      // Apply the velocity to the appropriate player.
      if (player.getID() == 0) {
        this.aPos.x += vel.x * 5;
        this.aPos.y -= vel.y * 5;
      } else if (player.getID() == 1) {
        this.bPos.x += vel.x * 5;
        this.bPos.y -= vel.y * 5;
      }
    }
  }

  draw(canvas) {
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw squares for the players.
    ctx.fillStyle = "red";
    ctx.fillRect(this.aPos.x - 5, this.aPos.y - 5, 10, 10);
    ctx.fillStyle = "blue";
    ctx.fillRect(this.bPos.x - 5, this.bPos.y - 5, 10, 10);
  }
}

SimpleGame.timestep = 1000 / 60; // Our game runs at 60 FPS
SimpleGame.canvasSize = { width: 600, height: 300 };

netplayjs.start(SimpleGame);
```

And voila - a real-time networked game with rollback and client-side prediction.

## Detailed Usage

`netplayjs` is written in typescript, and it is highly recommended that you use it with TypeScript as well.

```
npm install --save netplayjs
```

### Game State Serialization
The client-side prediction and rewind capabilities of `netplayjs` are based off of the ability to serialize and deserialize the state of the game. In the simple example above, the autoserializer can take care of rewinding our states and sending them over a network. For most games, however, you will need to implement your own logic. You can do this by overriding `Game.serialize` and `Game.deserialize` in your subclass.



## Advanced Usage
netplayjs is designed to make multiplayer games as simple as possible to make. However, you may find the framework too restrictive to make more complex games. You can still use netplayjs, but instead use the core netcode algorithms, which are implemented in an abstract way such that they can be used in any project.

```
let rollbackNetcode = new RollbackNetcode(...)
rollbackNetcode.tick(localInput);
```
