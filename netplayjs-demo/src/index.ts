import { LockstepNetcode } from "netplayjs";
import { SimpleGame } from "./simple";
import { Pong } from "./pong";

new LockstepNetcode(Pong).start();
