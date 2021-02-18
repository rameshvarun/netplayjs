# (WIP) netplayjs [![Build Status](https://travis-ci.org/rameshvarun/netplayjs.svg?branch=master)](https://travis-ci.org/rameshvarun/netplayjs)

Make peer-to-peer UDP-based multiplayer games in just a few lines of Javascript, no server or network synchronization code required! Powered by PeerJS and an implementation of rollback netcode.

[CHECK THE DEMO](https://rameshvarun.github.io/netplayjs/)

## Creating a Basic Game

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

    // Draw circles for the characters.
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

And boom - a real-time networked game with client-side prediction.
