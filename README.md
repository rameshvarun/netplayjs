# (Preview) NetplayJS 

[![Build Status](https://travis-ci.org/rameshvarun/netplayjs.svg?branch=master)](https://travis-ci.org/rameshvarun/netplayjs) [![npm](https://img.shields.io/npm/v/netplayjs)](https://www.npmjs.com/package/netplayjs)

Make peer-to-peer WebRTC-based multiplayer games in JavaScript, no server hosting or network synchronization code required!

<p align="center">
  <a href="https://rameshvarun.github.io/netplayjs/"><img src="./demo.gif"></a>
</p>
<p align="center">
  <a href="https://rameshvarun.github.io/netplayjs/">[CHECK OUT THE DEMOS]</a>
</p>

## Quick Start

 <a href="https://glitch.com/edit/#!/remix/netplayjs-simple"><img src="https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button-v2.svg" alt="Remix on Glitch" /></a>
 
 Here's how NetplayJS works:

- You create your game within a single static HTML file.
- You can use a variety of HTML5 game frameworks, including [Three.js](https://threejs.org/).
- You can host this file anywhere ([GitHub Pages](https://pages.github.com/), [Itch.io](https://itch.io/), [Glitch](https://glitch.com/), and many more).

NetplayJS handles most of the complicated aspects of multiplayer game development, letting you create games almost as if they were local multiplayer games. Synchronization and matchmaking is handled automatically under the hood.

Let's make a very simple game. Create an HTML file and add the following script tag.

```html
<script src="https://unpkg.com/netplayjs@0.3.0/dist/netplay.js"></script>
```

Now add this javascript code to the same HTML.
```html
<script>
class SimpleGame extends netplayjs.Game {
  // In the constructor, we initialize the state of our game.
  constructor() {
    super();
    // Initialize our player positions.
    this.aPos = { x: 100, y: 150 };
    this.bPos = { x: 500, y: 150 };
  }

  // The tick function takes a map of Player -> Input and
  // simulates the game forward. Think of it like making
  // a local multiplayer game with multiple controllers.
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

  // Normally, we have to implement a serialize / deserialize function
  // for our state. However, there is an autoserializer that can handle
  // simple states for us. We don't need to do anything here!
  // serialize() {}
  // deserialize(value) {}

  // Draw the state of our game onto a canvas.
  draw(canvas) {
    const ctx = canvas.getContext("2d");

    // Fill with black.
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

// Because our game can be easily rewound, we will use Rollback netcode
// If your game cannot be rewound, you should use LockstepWrapper instead.
new netplayjs.RollbackWrapper(SimpleGame).start();
</script>
```

And voila - a real-time networked game with rollback and client-side prediction.

## Basic Usage

NetplayJS consists of:
- Implementations of Rollback netcode and Lockstep netcode in TypeScript.
- A prototyping framework that lets you create a multiplayer game in a few lines of code
- A collection of demos built in the prototyping framework

### Installation
```bash
npm install --save netplayjs
```

```typescript
import { NetplayPlayer, DefaultInput, Game, RollbackWrapper } from "netplayjs";
```

### Game State Serialization
The client-side prediction and rewind capabilities of `netplayjs` are based off of the ability to serialize and deserialize the state of the game. In the simple example above, the autoserializer can take care of rewinding our states and sending them over a network. For most games, however, you will need to implement your own logic. You can do this by overriding `Game.serialize` and `Game.deserialize` in your subclass.

## Advanced Usage
If you want to integrate rollback into an existing game, or otherwise find the prototyping framework too restrictive, you can use the core netcode implementations. These implementations are abstract enough to be used in any project.

```
let rollbackNetcode = new RollbackNetcode(...)
rollbackNetcode.start();
```

# Assets Used from Other Projects
This repo contains code and assets from other open source projects.
- https://github.com/mrdoob/three.js (MIT)
- https://github.com/pinobatch/allpads-nes (zlib)
- https://github.com/kripken/ammo.js (zlib)
