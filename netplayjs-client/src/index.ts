export * from "./types";
export * from "./defaultinput";

export * from "./lockstepnetcode";

// export function start() {

//     let gameType: GameType<Game, DefaultInput> = {
//         timestep: gameClass.timestep,

//         canvasWidth: gameClass.canvasSize.width,
//         canvasHeight: gameClass.canvasSize.height,

//         getInputReader(document, canvas): () => DefaultInput {
//             return getDefaultInputReader(document);
//         },

//         constructDefaultInput(): DefaultInput {
//             return new DefaultInput();
//         },

//         constructInitialState(players: Array<NetplayPlayer>): Game {
//            return new gameClass();
//         },

//         draw(state: Game, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
//             state.draw(canvas);
//         }
//     };
//     lobby.start(gameType);
// }
