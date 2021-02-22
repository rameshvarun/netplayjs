import {
  NetplayPlayer,
  DefaultInput,
  Game,
  LockstepWrapper,
  JSONValue,
} from "netplayjs";
const jsnes = require("jsnes");

let ROM: string | null = null;

const SCREEN_WIDTH = 256;
const SCREEN_HEIGHT = 240;

export class Emulator extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };

  static stateSyncPeriod: number = 0;

  nes: any;
  frameBuffer: any;

  imageData: ImageData;
  buf: ArrayBuffer;
  buf8: Uint8ClampedArray;
  buf32: Uint32Array;

  constructor(canvas: HTMLCanvasElement) {
    super();

    const ctx = canvas.getContext("2d")!;
    this.imageData = ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    this.buf = new ArrayBuffer(this.imageData.data.length);
    this.buf8 = new Uint8ClampedArray(this.buf);
    this.buf32 = new Uint32Array(this.buf);
    for (var i = 0; i < this.buf32.length; ++i) {
      this.buf32[i] = 0xff000000;
    }

    this.nes = new jsnes.NES({
      onFrame: (buffer) => {
        var i = 0;
        for (var y = 0; y < SCREEN_HEIGHT; ++y) {
          for (var x = 0; x < SCREEN_WIDTH; ++x) {
            i = y * 256 + x;
            this.buf32[i] = 0xff000000 | buffer[i];
          }
        }
      },
      onAudioSample: (left, right) => {},
    });
    this.nes.loadROM(ROM);
  }

  serialize(): JSONValue {
    // throw new Error(`The game state cannot be serialized.`);
    return null;
  }
  deserialize(value: JSONValue) {
    // throw new Error(`The game state cannot be deserialized.`);
  }

  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
    this.nes.frame();

    for (let [player, input] of playerInputs) {
      if (input.pressed.z) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_A);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_A);
      }

      if (input.pressed.x) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_B);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_B);
      }

      if (input.pressed.ArrowUp) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_UP);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_UP);
      }

      if (input.pressed.ArrowDown) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_DOWN);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_DOWN);
      }

      if (input.pressed.ArrowLeft) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_LEFT);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_LEFT);
      }

      if (input.pressed.ArrowRight) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_RIGHT);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_RIGHT);
      }

      if (input.pressed.Enter) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_START);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_START);
      }

      if (input.pressed.Shift) {
        this.nes.buttonDown(player.getID() + 1, jsnes.Controller.BUTTON_SELECT);
      } else {
        this.nes.buttonUp(player.getID() + 1, jsnes.Controller.BUTTON_SELECT);
      }
    }
  }

  draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    this.imageData.data.set(this.buf8);
    ctx.putImageData(this.imageData, 0, 0);
  }
}

function loadBinary(path, callback) {
  var req = new XMLHttpRequest();
  req.open("GET", path);
  req.overrideMimeType("text/plain; charset=x-user-defined");
  req.onload = function () {
    if (this.status === 200) {
      if (req.responseText.match(/^<!doctype html>/i)) {
        // Got HTML back, so it is probably falling back to index.html due to 404
        return callback(new Error("Page not found"));
      }

      callback(null, this.responseText);
    } else if (this.status === 0) {
      // Aborted, so ignore error
    } else {
      callback(new Error(req.statusText));
    }
  };
  req.onerror = function () {
    callback(new Error(req.statusText));
  };
  req.send();
  return req;
}

loadBinary("../files/rom.nes", (err, data) => {
  ROM = data;
  new LockstepWrapper(Emulator).start();
});
