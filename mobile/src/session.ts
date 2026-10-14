import Peer, { type DataConnection } from "peerjs";
import type { CardDb, EngineApi, GameHandle, Side } from "./engine";
import { type WireDeck, engineDeck, fromWire } from "./decks";

export type Role = "host" | "guest" | "local";

export type Msg =
  | { t: "hello"; name: string }
  | { t: "lobby"; host: string; hostSide: Side; hostReady: boolean; started: boolean }
  | { t: "deck"; deck: WireDeck }
  | { t: "start" }
  | { t: "view"; view: any }
  | { t: "act"; command: string; args: unknown }
  | { t: "say"; text: string }
  | { t: "concede" }
  | { t: "error"; message: string };

export interface LobbyState {
  code: string;
  role: Role;
  status: "connecting" | "waiting" | "connected" | "closed";
  myName: string;
  opponentName?: string;
  mySide: Side;
  myDeck?: WireDeck;
  opponentDeckReady: boolean;
  started: boolean;
  error?: string;
}

type Listener = () => void;

const PEER_PREFIX = "nsg-mobile-";
const other = (s: Side): Side => (s === "corp" ? "runner" : "corp");

export function newRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(5)), (n) => alphabet[n % alphabet.length]).join("");
}

export class Session {
  lobby: LobbyState;
  views: Partial<Record<Side, any>> = {};
  pending = false;
  private listeners = new Set<Listener>();
  private peer?: Peer;
  private conn?: DataConnection;
  private game?: GameHandle;
  private opponentDeck?: WireDeck;

  constructor(
    private engine: EngineApi,
    private db: CardDb,
    role: Role,
    code: string,
    myName: string,
    mySide: Side = "corp",
  ) {
    this.lobby = {
      code,
      role,
      status: role === "local" ? "connected" : "connecting",
      myName,
      mySide,
      opponentDeckReady: false,
      started: false,
    };
    if (role === "host") this.host();
    if (role === "guest") this.join();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private patch(p: Partial<LobbyState>) {
    this.lobby = { ...this.lobby, ...p };
    this.emit();
  }

  private host() {
    this.peer = new Peer(PEER_PREFIX + this.lobby.code);
    this.peer.on("open", () => this.patch({ status: "waiting" }));
    this.peer.on("error", (e) => this.patch({ error: String(e.message ?? e) }));
    this.peer.on("connection", (conn) => {
      this.conn?.close();
      this.conn = conn;
      conn.on("data", (d) => this.onHostMessage(d as Msg));
      conn.on("close", () => {
        if (this.conn === conn) this.patch({ status: "waiting" });
      });
    });
  }

  private join() {
    this.peer = new Peer();
    this.peer.on("error", (e) => this.patch({ error: String(e.message ?? e), status: "closed" }));
    this.peer.on("open", () => {
      const conn = this.peer!.connect(PEER_PREFIX + this.lobby.code, { reliable: true });
      this.conn = conn;
      conn.on("open", () => {
        this.patch({ status: "connected" });
        this.post({ t: "hello", name: this.lobby.myName });
        if (this.lobby.myDeck) this.post({ t: "deck", deck: this.lobby.myDeck });
      });
      conn.on("data", (d) => this.onGuestMessage(d as Msg));
      conn.on("close", () => this.patch({ status: "closed" }));
    });
  }

  private post(msg: Msg) {
    if (this.conn?.open) this.conn.send(msg);
  }

  private lobbyMsg(): Msg {
    return {
      t: "lobby",
      host: this.lobby.myName,
      hostSide: this.lobby.mySide,
      hostReady: !!this.lobby.myDeck,
      started: this.lobby.started,
    };
  }

  private onHostMessage(msg: Msg) {
    switch (msg.t) {
      case "hello":
        this.patch({ opponentName: msg.name, status: "connected" });
        this.post(this.lobbyMsg());
        if (this.game) this.post({ t: "view", view: this.engine.view(this.game, other(this.lobby.mySide)) });
        break;
      case "deck":
        this.opponentDeck = msg.deck;
        this.patch({ opponentDeckReady: true });
        break;
      case "act":
        this.apply(other(this.lobby.mySide), msg.command, msg.args);
        break;
      case "say":
        if (this.game) {
          const side = other(this.lobby.mySide);
          this.engine.say(this.game, side, { username: this.lobby.opponentName }, msg.text);
          this.broadcast();
        }
        break;
      case "concede":
        if (this.game) {
          this.engine.concede(this.game, other(this.lobby.mySide));
          this.broadcast();
        }
        break;
    }
  }

  private onGuestMessage(msg: Msg) {
    switch (msg.t) {
      case "lobby": {
        const mySide = other(msg.hostSide);
        const myDeck = mySide === this.lobby.mySide ? this.lobby.myDeck : undefined;
        this.patch({ opponentName: msg.host, mySide, myDeck, started: msg.started || this.lobby.started });
        if (myDeck && !msg.started) this.post({ t: "deck", deck: myDeck });
        break;
      }
      case "view":
        this.views[this.lobby.mySide] = msg.view;
        this.pending = false;
        if (!this.lobby.started) this.lobby = { ...this.lobby, started: true };
        this.emit();
        break;
      case "error":
        this.pending = false;
        this.patch({ error: msg.message });
        break;
    }
  }

  setSide(side: Side) {
    if (this.lobby.role === "guest" || side === this.lobby.mySide) return;
    this.opponentDeck = undefined;
    this.patch({ mySide: side, myDeck: undefined, opponentDeckReady: false });
    this.post(this.lobbyMsg());
  }

  setDeck(deck: WireDeck, side?: Side) {
    if (this.lobby.role === "local") {
      if (side && side !== this.lobby.mySide) {
        this.opponentDeck = deck;
        this.patch({ opponentDeckReady: true });
      } else this.patch({ myDeck: deck });
      return;
    }
    this.patch({ myDeck: deck });
    if (this.lobby.role === "guest") this.post({ t: "deck", deck });
    else this.post(this.lobbyMsg());
  }

  get canStart() {
    return this.lobby.role !== "guest" && !!this.lobby.myDeck && !!this.opponentDeck && !this.lobby.started;
  }

  start() {
    if (!this.canStart) return;
    const mine = fromWire(this.lobby.myDeck!, this.db);
    const theirs = fromWire(this.opponentDeck!, this.db);
    const me = { username: this.lobby.myName };
    const them = { username: this.lobby.opponentName ?? (this.lobby.role === "local" ? "Joueur 2" : "Adversaire") };
    const players =
      this.lobby.mySide === "corp"
        ? { corp: { user: me, deck: engineDeck(mine) }, runner: { user: them, deck: engineDeck(theirs) } }
        : { corp: { user: them, deck: engineDeck(theirs) }, runner: { user: me, deck: engineDeck(mine) } };
    this.game = this.engine.createGame({ gameid: this.lobby.code, format: "casual", ...players });
    this.lobby = { ...this.lobby, started: true };
    this.post(this.lobbyMsg());
    this.broadcast();
  }

  private broadcast() {
    if (!this.game) return;
    this.views.corp = this.engine.view(this.game, "corp");
    this.views.runner = this.engine.view(this.game, "runner");
    this.post({ t: "view", view: this.views[other(this.lobby.mySide)] });
    this.emit();
  }

  private apply(side: Side, command: string, args: unknown) {
    if (!this.game) return;
    try {
      this.engine.act(this.game, side, command, args ?? null);
    } catch (e) {
      console.error(e);
      if (side !== this.lobby.mySide) this.post({ t: "error", message: String(e) });
    }
    this.broadcast();
  }

  send(command: string, args?: unknown, side: Side = this.lobby.mySide) {
    if (this.lobby.role === "guest") {
      this.pending = true;
      this.post({ t: "act", command, args: args ?? null });
      this.emit();
    } else {
      this.apply(side, command, args);
    }
  }

  say(text: string, side: Side = this.lobby.mySide) {
    if (this.lobby.role === "guest") return this.post({ t: "say", text });
    if (!this.game) return;
    const name = side === this.lobby.mySide ? this.lobby.myName : this.lobby.opponentName;
    this.engine.say(this.game, side, { username: name }, text);
    this.broadcast();
  }

  concede(side: Side = this.lobby.mySide) {
    if (this.lobby.role === "guest") return this.post({ t: "concede" });
    if (!this.game) return;
    this.engine.concede(this.game, side);
    this.broadcast();
  }

  close() {
    this.conn?.close();
    this.peer?.destroy();
  }
}
