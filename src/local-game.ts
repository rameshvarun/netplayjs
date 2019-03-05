// import {
//   NetplayState,
//   NetplayInput,
//   NetplayPlayer,
//   NetplayManager
// } from "./netplay";
//
// import { PongState, PongInput, PONG_WIDTH, PONG_HEIGHT } from "./pong";
//
// let initialState = PongState.getInitialState();
//
// const canvas1 = document.createElement("canvas");
// canvas1.width = PONG_WIDTH;
// canvas1.height = PONG_HEIGHT;
// document.body.appendChild(canvas1);
// const ctx1 = canvas1.getContext("2d")!;
//
// const canvas2 = document.createElement("canvas");
// canvas2.width = PONG_WIDTH;
// canvas2.height = PONG_HEIGHT;
// document.body.appendChild(canvas2);
// const ctx2 = canvas2.getContext("2d")!;
//
// const stats = document.createElement("div");
// document.body.appendChild(stats);
//
// const PRESSED_KEYS = {};
// document.addEventListener(
//   "keydown",
//   event => {
//     PRESSED_KEYS[event.keyCode] = true;
//   },
//   false
// );
// document.addEventListener(
//   "keyup",
//   event => {
//     PRESSED_KEYS[event.keyCode] = false;
//   },
//   false
// );
//
// let initialInputs1 = new Map<
//   NetplayPlayer,
//   { input: PongInput; isPrediction: boolean }
// >();
// let world1players = [
//   {
//     getID() {
//       return 0;
//     },
//     isLocalPlayer() {
//       return true;
//     },
//     isRemotePlayer() {
//       return false;
//     },
//     isServer() {
//       return true;
//     },
//     isClient() {
//       return false;
//     }
//   },
//   {
//     getID() {
//       return 1;
//     },
//     isLocalPlayer() {
//       return false;
//     },
//     isRemotePlayer() {
//       return true;
//     },
//     isServer() {
//       return false;
//     },
//     isClient() {
//       return true;
//     }
//   }
// ];
// initialInputs1.set(world1players[0], {
//   input: new PongInput("none"),
//   isPrediction: false
// });
// initialInputs1.set(world1players[1], {
//   input: new PongInput("none"),
//   isPrediction: false
// });
//
// let netplayManager1 = new NetplayManager(
//   true,
//   initialState,
//   initialInputs1,
//   10,
//   (frame, state) => {
//     setTimeout(() => {
//       netplayManager2.onStateSync(frame, state);
//     }, SIMULATED_LATENCY);
//   }
// );
//
// let initialInputs2 = new Map<
//   NetplayPlayer,
//   { input: PongInput; isPrediction: boolean }
// >();
// let world2players = [
//   {
//     getID() {
//       return 0;
//     },
//     isLocalPlayer() {
//       return false;
//     },
//     isRemotePlayer() {
//       return true;
//     },
//     isServer() {
//       return true;
//     },
//     isClient() {
//       return false;
//     }
//   },
//   {
//     getID() {
//       return 1;
//     },
//     isLocalPlayer() {
//       return true;
//     },
//     isRemotePlayer() {
//       return false;
//     },
//     isServer() {
//       return false;
//     },
//     isClient() {
//       return true;
//     }
//   }
// ];
// initialInputs2.set(world2players[0], {
//   input: new PongInput("none"),
//   isPrediction: false
// });
// initialInputs2.set(world2players[1], {
//   input: new PongInput("none"),
//   isPrediction: false
// });
//
// let netplayManager2 = new NetplayManager(
//   false,
//   initialState,
//   initialInputs2,
//   10
// );
//
// const TIMESTEP = 1000 / 60;
// const SIMULATED_LATENCY = 70;
//
// let lastFrameTime = 0;
// function main(timestamp) {
//   if (timestamp > lastFrameTime + TIMESTEP) {
//     lastFrameTime = timestamp;
//
//     // Get local input.
//     let input1 = new PongInput("none");
//     let input1frame = netplayManager1.currentFrame() + 1;
//     if (PRESSED_KEYS[38]) input1 = new PongInput("up");
//     if (PRESSED_KEYS[40]) input1 = new PongInput("down");
//
//     let input2 = new PongInput("none");
//     let input2frame = netplayManager2.currentFrame() + 1;
//     if (PRESSED_KEYS[87]) input2 = new PongInput("up");
//     if (PRESSED_KEYS[83]) input2 = new PongInput("down");
//
//     // Tick state forward.
//     netplayManager1.tick(input1);
//     netplayManager2.tick(input2);
//
//     // Simulated packet transfer.
//     setTimeout(() => {
//       netplayManager1.onRemoteInput(input2frame, world1players[1], input2);
//       netplayManager2.onRemoteInput(input1frame, world2players[0], input1);
//     }, SIMULATED_LATENCY);
//
//     // Draw state to canvas.
//     netplayManager1.getState().draw(canvas1, ctx1);
//     netplayManager2.getState().draw(canvas2, ctx2);
//
//     // Update stats
//     stats.innerHTML = `
//     <div>Simulated Latency: ${SIMULATED_LATENCY}</div>
//     <div>Timestep: ${TIMESTEP}</div>
//     <div>(Player 1) History Size: ${netplayManager1.history.length}</div>
//     <div>(Player 2) History Size: ${netplayManager2.history.length}</div>
//     `;
//   }
//
//   requestAnimationFrame(main);
// }
// requestAnimationFrame(main);
