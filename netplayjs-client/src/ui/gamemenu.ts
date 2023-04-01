import { html, render } from "lit-html";
import { DEFAULT_SERVER_URL, MatchmakingClient } from "../matchmaking/client";
import * as query from "query-string";
import * as QRCode from "qrcode";
import EventEmitter from "eventemitter3";
import { Disposable, TypedEvent } from "../common/typedevent";
import { PeerConnection } from "../matchmaking/peerconnection";

type GameMenuState =
  | {
      kind: "connecting-to-server";
    }
  | {
      kind: "registered";
      clientID: string;
      joinURL: string;
      qrCanvas: HTMLCanvasElement;
    }
  | {
      kind: "connecting-to-host";
    }
  | {
      kind: "searching-for-matches";
    }
  | {
      kind: "hosting-public-match";
    };

export class GameMenu {
  root: HTMLDivElement;

  state: GameMenuState = { kind: "connecting-to-server" };

  matchmaker: MatchmakingClient;

  gameURL: string;

  onClientStart: TypedEvent<PeerConnection> = new TypedEvent();
  onHostStart: TypedEvent<PeerConnection> = new TypedEvent();

  connectToHost(hostID: string) {
    this.updateState({
      kind: "connecting-to-host",
    });

    const conn = this.matchmaker.connectPeer(hostID);
    conn.on("open", () => {
      this.onClientStart.emit(conn);
      this.root.style.display = "none";
    });
  }

  constructor() {
    // Set the root DIV element.
    this.root = this.createRootElement();

    // The URL of the game is everything before the hash.
    this.gameURL = window.location.href.split("#")[0];

    // Parse the window hash for params.
    const parsedHash = query.parse(window.location.hash);

    // Determine the server URL to connect to.
    const serverURL: string =
      (parsedHash.server as string) ||
      this.getLocalStorageServerOverride() ||
      DEFAULT_SERVER_URL;

    // Create a matchmaking client and connect to the server.
    this.matchmaker = new MatchmakingClient(serverURL);

    // Wait for the client to be registered.
    this.matchmaker.onRegistered.once(() => {
      if (parsedHash.room) {
        // If a hostID was provided in the URL hash,
        // directly connect to that ID.
        const hostID = parsedHash.room as string;
        this.connectToHost(hostID);
      } else {
        const room = this.matchmaker.clientID!;
        const joinURL = this.getJoinURL(room);

        const qrCanvas = document.createElement("canvas");
        QRCode.toCanvas(qrCanvas, joinURL);

        this.updateState({
          kind: "registered",
          clientID: room,
          joinURL: joinURL,
          qrCanvas,
        });

        this.startHostListening();
      }
    });

    this.render();
  }

  hostListeningHandle?: Disposable;
  startHostListening() {
    this.hostListeningHandle = this.matchmaker.onConnection.on((conn) => {
      conn.on("open", () => {
        this.onHostStart.emit(conn);
        this.root.style.display = "none";
      });
    });
  }
  stopHostListening() {
    this.hostListeningHandle!.dispose();
  }

  startMatchmaking() {
    // Stop listening for connections.
    this.stopHostListening();

    // Send the match request and update UI to put
    // as in the matchmaking state.
    this.matchmaker.sendMatchRequest(this.gameURL, 2, 2);
    this.updateState({
      kind: "searching-for-matches",
    });

    this.matchmaker.onHostMatch.once((e) => {
      this.updateState({
        kind: "hosting-public-match",
      });
      this.startHostListening();
    });

    this.matchmaker.onJoinMatch.once((e) => {
      this.connectToHost(e.hostID);
    });
  }

  updateState(newState: GameMenuState) {
    this.state = newState;
    this.render();
  }

  /**
   * Try to get a server override from local storage.
   * Return NULL if we error (for example in incognito mode).
   */
  getLocalStorageServerOverride(): string | null {
    try {
      return window.localStorage.getItem("NETPLAYJS_SERVER_OVERRIDE");
    } catch (e) {
      return null;
    }
  }

  getJoinURL(room: string): string {
    let hashParams: any = { room: room };
    if (this.matchmaker.serverURL !== DEFAULT_SERVER_URL) {
      hashParams.server = this.matchmaker.serverURL;
    }
    return `${this.gameURL}#${query.stringify(hashParams)}`;
  }

  html() {
    if (this.state.kind === "connecting-to-server") {
      return html`<div
        style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;"
      >
        <div>Connecting to NetplayJS server...</div>
      </div>`;
    } else if (this.state.kind === "registered") {
      return html` <div
        style="display: grid; width: 100%; height: 100%; grid-template-columns: 1fr 1px 1fr; grid-column-gap: 10px;"
      >
        <div style="">
          <h1>Public Match</h1>
          <button @click=${() => this.startMatchmaking()}>
            Start Matchmaking
          </button>
        </div>
        <div
          style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;"
        >
          <div style="background-color: black; width: 1px; height: 75%;"></div>
        </div>

        <div style="">
          <h1>Private Match</h1>
          Join URL (Open in a new window or send to a friend):

          <a href="${this.state.joinURL}">
            ${this.state.joinURL}

            <div>
              <div>${this.state.qrCanvas}</div>
            </div></a
          >
        </div>
      </div>`;
    } else if (this.state.kind === "connecting-to-host") {
      return html`<div
        style="display: flex; flex-direction: column; width: 100%; height: 100%; align-items: center; justify-content: center;"
      >
        Connecting to host...
      </div>`;
    } else if (this.state.kind === "searching-for-matches") {
      return html`<div
        style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;"
      >
        <div>Searching for matches...</div>
      </div>`;
    } else if (this.state.kind === "hosting-public-match") {
      return html`<div
        style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;"
      >
        <div>You are the host. Waiting for client to connect...</div>
      </div>`;
    }
  }

  render() {
    render(this.html(), this.root);
  }

  createRootElement(): HTMLDivElement {
    // Create menu UI
    const menu = document.createElement("div");
    menu.style.zIndex = "1";
    menu.style.position = "absolute";
    menu.style.backgroundColor = "white";
    menu.style.padding = "10px";
    menu.style.left = "50%";
    menu.style.top = "50%";
    menu.style.boxShadow = "0px 0px 10px black";
    menu.style.transform = "translate(-50%, -50%)";

    menu.style.boxSizing = "border-box";
    menu.style.borderRadius = "5px";

    menu.style.minWidth = "500px";
    menu.style.minHeight = "300px";

    menu.style.maxWidth = "95%";
    menu.style.maxHeight = "95%";
    menu.style.fontFamily = "sans-serif";

    document.body.appendChild(menu);

    return menu;
  }
}
