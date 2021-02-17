export * from "./types";
export * from "./defaultinput";

import { DefaultInput, getDefaultInputReader } from "./defaultinput";
import * as lobby from "./lobby";
import { GameType, NetplayPlayer, NetplayState } from "./types";

export abstract class Game extends NetplayState<DefaultInput> {
    abstract draw(canvas: HTMLCanvasElement);
}

export function start(gameClass: { new(): Game; timestep: number, canvasSize: { width: number; height: number; } }) {

    let gameType: GameType<Game, DefaultInput> = {
        timestep: gameClass.timestep,

        canvasWidth: gameClass.canvasSize.width,
        canvasHeight: gameClass.canvasSize.height,

        getInputReader(document, canvas): () => DefaultInput {
            return getDefaultInputReader(document);
        },

        constructDefaultInput(): DefaultInput {
            return new DefaultInput();
        },

        constructInitialState(players: Array<NetplayPlayer>): Game {
           return new gameClass();
        },

        draw(state: Game, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
            state.draw(canvas);
        }
    };
    lobby.start(gameType);
}
