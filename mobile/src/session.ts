import { type Room, getRelaySockets, joinRoom } from "trystero";
import type { CardDb, Deck, EngineApi, GameHandle, Side } from "./engine";
import { HeuristicBot } from "./bot/heuristic.ts";
import { type WireDeck, engineDeck, fromWire } from "./decks";

export type Role = "host" | "guest" | "local";

export type Msg =
  | { t: "hello"; name: string }
  | { t: "lobby"; host: string; hostSide: Side; hostReady: boolean; started: boolean }
  | { t: "deck"; deck: WireDeck; side: Side }
  | { t: "start" }
  | { t: "view"; view: any }
  | { t: "act"; command: string; args: unknown }
  | { t: "say"; text: string }
  | { t: "concede" }
  | { t: "error"; message: string }
  | { t: "ping" }
  | { t: "unready" };

export interface LobbyState {
  code: string;
  role: Role;
  status: "connecting" | "waiting" | "connected" | "closed";
  myName: string;
  opponentName?: string;
  mySide: Side;
  myDeck?: WireDeck;
  ready?: boolean;
  opponentDeckReady: boolean;
  started: boolean;
  vsBot?: boolean;
  error?: string;
  step?: "relay" | "host";
  hint?: "unreachable";
  since?: number;
}

type Entry =
  | { side: Side; kind: "act"; command: string; args: unknown }
  | { side: Side; kind: "say"; user?: string; text: string }
  | { side: Side; kind: "concede" };

export type SavedGame =
  | {
      v: 1;
      role: "host" | "local";
      code: string;
      myName: string;
      mySide: Side;
      opponentName?: string;
      vsBot?: boolean;
      setup: unknown;
      deckNames?: Partial<Record<Side, string>>;
      seed: number[];
      log: Entry[];
      savedAt: number;
    }
  | { v: 1; role: "guest"; code: string; myName: string; myDeck?: WireDeck; savedAt: number };

type Listener = () => void;

const APP_ID = "nsg-mobile.lelongg.github.io";
const SAVE_KEYS = { game: "nsg.save", guest: "nsg.guest" } as const;
const PING_MS = 4000;
const STALE_MS = 15000;
const UNREACHABLE_MS = 20000;
const STUN: RTCIceServer = { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] };

function iceServers(): RTCIceServer[] {
  const extra = import.meta.env.VITE_ICE_SERVERS;
  if (!extra) return [STUN];
  try {
    return [STUN, ...JSON.parse(extra)];
  } catch {
    return [STUN];
  }
}

const relayOpen = () => Object.values((getRelaySockets() ?? {}) as Record<string, WebSocket>).some((ws) => ws?.readyState === WebSocket.OPEN);
const BOT_DELAY_MS = 450;
const other = (s: Side): Side => (s === "corp" ? "runner" : "corp");

export function newRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(5)), (n) => alphabet[n % alphabet.length]).join("");
}

function sfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const saveKey = (role: Role) => (role === "guest" ? SAVE_KEYS.guest : SAVE_KEYS.game);

function readSave(key: string): SavedGame | null {
  try {
    const raw = localStorage.getItem(key);
    const save = raw ? (JSON.parse(raw) as SavedGame) : null;
    return save?.v === 1 ? save : null;
  } catch {
    return null;
  }
}

export function loadSave(): SavedGame | null {
  return readSave(SAVE_KEYS.game) ?? readSave(SAVE_KEYS.guest);
}

function writeSave(role: Role, save: SavedGame | null) {
  try {
    if (save) localStorage.setItem(saveKey(role), JSON.stringify(save));
    else localStorage.removeItem(saveKey(role));
  } catch {
    /* storage unavailable or full */
  }
}

export function clearSave(save: SavedGame) {
  writeSave(save.role, null);
}

const deckSide = (db: CardDb, deck: WireDeck): Side | undefined => db.byTitle.get(deck.identity)?.side.toLowerCase() as Side | undefined;

export class Session {
  lobby: LobbyState;
  views: Partial<Record<Side, any>> = {};
  pending = false;
  actionError: string | null = null;
  private listeners = new Set<Listener>();
  private room?: Room;
  private channel?: { send: (data: any, options?: { target?: string }) => Promise<void> };
  private remote?: string;
  private watchdog?: number;
  private game?: GameHandle;
  private opponentDeck?: WireDeck;
  private setup?: unknown;
  private deckNames: Partial<Record<Side, string>> = {};
  private seed?: number[];
  private rng?: () => number;
  private log: Entry[] = [];
  private closed = false;
  private bot?: HeuristicBot;
  private botTimer?: number;
  private lastSeen = 0;
  private heartbeat?: number;
  private wake = () => this.revive();

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
    if (role === "guest") writeSave("guest", { v: 1, role: "guest", code, myName, savedAt: Date.now() });
    if (role !== "local") {
      this.openRoom();
      this.heartbeat = window.setInterval(() => this.beat(), PING_MS);
      document.addEventListener("visibilitychange", this.wake);
      addEventListener("online", this.wake);
    }
  }

  private openRoom() {
    if (this.closed) return;
    this.room?.leave();
    this.remote = undefined;
    const room = joinRoom({ appId: APP_ID, rtcConfig: { iceServers: iceServers() } }, this.lobby.code, {
      onJoinError: (e: any) => this.patch({ error: String(e?.error ?? e?.message ?? e) }),
    });
    this.room = room;
    const channel = room.makeAction<any>("msg");
    channel.onMessage = (data: Msg, { peerId }: { peerId: string }) => this.receive(data, peerId);
    this.channel = channel;
    room.onPeerJoin = (peerId) => this.joined(peerId);
    room.onPeerLeave = (peerId) => peerId === this.remote && this.lost();
    if (this.lobby.role === "host") this.patch({ status: "waiting", error: undefined });
    else this.patch({ status: "connecting", step: relayOpen() ? "host" : "relay", hint: undefined, since: this.lobby.since ?? Date.now() });
    this.watch();
  }

  private watch() {
    if (this.watchdog !== undefined) clearInterval(this.watchdog);
    this.watchdog = window.setInterval(() => {
      if (this.closed || this.lobby.role !== "guest" || this.remote) return;
      const step = relayOpen() ? "host" : "relay";
      const hint = this.lobby.since && Date.now() - this.lobby.since > UNREACHABLE_MS ? "unreachable" : undefined;
      if (step !== this.lobby.step || hint !== this.lobby.hint) this.patch({ step, hint });
    }, 1000);
  }

  private joined(peerId: string) {
    if (this.closed) return;
    this.remote = peerId;
    this.lastSeen = Date.now();
    if (this.lobby.role === "guest") {
      this.patch({ status: "connected", error: undefined, step: undefined, hint: undefined, since: undefined });
      this.post({ t: "hello", name: this.lobby.myName });
    }
  }

  private receive(msg: Msg, peerId: string) {
    if (peerId !== this.remote) {
      if (this.lobby.role !== "host" || msg?.t !== "hello") return;
      this.remote = peerId;
    }
    this.lastSeen = Date.now();
    if (msg.t === "ping") return;
    if (this.lobby.role === "host") this.onHostMessage(msg);
    else this.onGuestMessage(msg);
  }

  private lost() {
    this.remote = undefined;
    this.pending = false;
    if (this.lobby.role === "host") this.patch({ status: "waiting" });
    else this.patch({ status: "connecting", step: relayOpen() ? "host" : "relay", since: Date.now(), hint: undefined });
  }

  private beat() {
    if (this.closed || !this.remote) return;
    this.post({ t: "ping" });
    if (document.visibilityState === "visible" && Date.now() - this.lastSeen > STALE_MS) {
      this.lost();
      this.openRoom();
    }
  }

  private revive() {
    if (this.closed || document.visibilityState !== "visible") return;
    if (this.remote && Date.now() - this.lastSeen < STALE_MS) return;
    this.lastSeen = Date.now();
    this.openRoom();
  }

  static resume(engine: EngineApi, db: CardDb, save: SavedGame): Session {
    if (save.role === "guest") {
      const session = new Session(engine, db, "guest", save.code, save.myName);
      if (save.myDeck) {
        session.lobby = { ...session.lobby, myDeck: save.myDeck };
        writeSave("guest", save);
      }
      return session;
    }
    const session = new Session(engine, db, save.role, save.code, save.myName, save.mySide);
    session.restore(save);
    return session;
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

  private post(msg: Msg) {
    if (this.remote) this.channel?.send(msg, { target: this.remote }).catch(() => {});
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
    const guest = other(this.lobby.mySide);
    switch (msg.t) {
      case "hello":
        this.patch({ opponentName: msg.name, status: "connected" });
        this.post(this.lobbyMsg());
        if (this.game) this.post({ t: "view", view: this.engine.view(this.game, guest) });
        break;
      case "deck":
        if (this.lobby.started || msg.side !== guest || deckSide(this.db, msg.deck) !== guest) break;
        this.opponentDeck = msg.deck;
        this.patch({ opponentDeckReady: true });
        break;
      case "unready":
        if (this.lobby.started) break;
        this.opponentDeck = undefined;
        this.patch({ opponentDeckReady: false });
        break;
      case "act":
        this.perform({ side: guest, kind: "act", command: msg.command, args: msg.args });
        break;
      case "say":
        this.perform({ side: guest, kind: "say", user: this.lobby.opponentName, text: msg.text });
        break;
      case "concede":
        this.perform({ side: guest, kind: "concede" });
        break;
    }
  }

  private onGuestMessage(msg: Msg) {
    switch (msg.t) {
      case "lobby": {
        const mySide = other(msg.hostSide);
        const same = mySide === this.lobby.mySide;
        const myDeck = same ? this.lobby.myDeck : undefined;
        const ready = same && !!this.lobby.ready && !!myDeck;
        this.patch({ opponentName: msg.host, mySide, myDeck, ready, started: msg.started || this.lobby.started });
        if (ready && !msg.started) this.post({ t: "deck", deck: myDeck!, side: mySide });
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
        this.actionError = msg.message;
        this.emit();
        break;
    }
  }

  enableBot() {
    this.patch({ vsBot: true, opponentName: "Bot" });
  }

  private makeBot() {
    if (!this.lobby.vsBot) return;
    this.bot = new HeuristicBot(other(this.lobby.mySide), (title) => this.db.byTitle.get(title) as any);
  }

  private scheduleBot() {
    const bot = this.bot;
    if (!bot || this.botTimer !== undefined || this.closed) return;
    if (!this.views[bot.side] || this.views[bot.side].winner) return;
    this.botTimer = window.setTimeout(() => {
      this.botTimer = undefined;
      if (this.closed) return;
      const move = bot.decide(this.views[bot.side]);
      if (!move) return;
      if (move.say) this.say(move.say, bot.side);
      else this.perform({ side: bot.side, kind: "act", command: move.command, args: move.args ?? null });
    }, BOT_DELAY_MS);
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
    if (this.lobby.role === "guest") {
      if (this.lobby.ready) this.post({ t: "unready" });
      this.patch({ myDeck: deck, ready: false });
      writeSave("guest", { v: 1, role: "guest", code: this.lobby.code, myName: this.lobby.myName, myDeck: deck, savedAt: Date.now() });
    } else {
      this.patch({ myDeck: deck });
      this.post(this.lobbyMsg());
    }
  }

  setName(name: string) {
    const myName = name.trim().slice(0, 24) || "Player";
    if (myName === this.lobby.myName || this.lobby.started) return;
    try {
      localStorage.setItem("nsg.name", myName);
    } catch {}
    this.patch({ myName });
    if (this.lobby.role === "guest") {
      writeSave("guest", { v: 1, role: "guest", code: this.lobby.code, myName, myDeck: this.lobby.myDeck, savedAt: Date.now() });
      this.post({ t: "hello", name: myName });
    } else if (this.lobby.role === "host") this.post(this.lobbyMsg());
  }

  setReady(ready: boolean) {
    if (this.lobby.role !== "guest" || this.lobby.started) return;
    if (ready && this.lobby.myDeck) this.post({ t: "deck", deck: this.lobby.myDeck, side: this.lobby.mySide });
    else if (!ready) this.post({ t: "unready" });
    this.patch({ ready: ready && !!this.lobby.myDeck });
  }

  get canStart() {
    const { role, myDeck, mySide, started } = this.lobby;
    return (
      role !== "guest" &&
      !started &&
      !!myDeck &&
      !!this.opponentDeck &&
      deckSide(this.db, myDeck) === mySide &&
      deckSide(this.db, this.opponentDeck) === other(mySide)
    );
  }

  private withRng<T>(f: () => T): T {
    const random = Math.random;
    Math.random = this.rng!;
    try {
      return f();
    } finally {
      Math.random = random;
    }
  }

  private boot(setup: unknown, seed: number[]) {
    this.setup = setup;
    this.seed = seed;
    this.rng = sfc32(seed[0], seed[1], seed[2], seed[3]);
    this.game = this.withRng(() => this.engine.createGame(setup));
  }

  start() {
    if (!this.canStart) return;
    const mine = fromWire(this.lobby.myDeck!, this.db);
    const theirs = fromWire(this.opponentDeck!, this.db);
    const me = { username: this.lobby.myName };
    const them = { username: this.lobby.opponentName ?? (this.lobby.role === "local" ? "Player 2" : "Opponent") };
    const players =
      this.lobby.mySide === "corp"
        ? { corp: { user: me, deck: engineDeck(mine) }, runner: { user: them, deck: engineDeck(theirs) } }
        : { corp: { user: them, deck: engineDeck(theirs) }, runner: { user: me, deck: engineDeck(mine) } };
    this.deckNames = { [this.lobby.mySide]: mine.name, [other(this.lobby.mySide)]: theirs.name };
    this.boot({ gameid: this.lobby.code, format: "casual", ...players }, Array.from(crypto.getRandomValues(new Uint32Array(4))));
    this.log = [];
    this.lobby = { ...this.lobby, started: true };
    this.makeBot();
    this.persist();
    this.post(this.lobbyMsg());
    this.broadcast();
  }

  private restore(save: Extract<SavedGame, { role: "host" | "local" }>) {
    this.deckNames = save.deckNames ?? {};
    this.boot(save.setup, save.seed);
    for (const entry of save.log) this.exec(entry);
    this.log = [...save.log];
    this.lobby = { ...this.lobby, opponentName: save.opponentName, vsBot: save.vsBot, started: true, opponentDeckReady: true };
    this.makeBot();
    this.broadcast();
  }

  private persist() {
    if (this.lobby.role === "guest" || !this.setup || !this.seed) return;
    writeSave(this.lobby.role, {
      v: 1,
      role: this.lobby.role,
      code: this.lobby.code,
      myName: this.lobby.myName,
      mySide: this.lobby.mySide,
      opponentName: this.lobby.opponentName,
      vsBot: this.lobby.vsBot,
      setup: this.setup,
      deckNames: this.deckNames,
      seed: this.seed,
      log: this.log,
      savedAt: Date.now(),
    });
  }

  private exec(entry: Entry) {
    const game = this.game!;
    try {
      this.withRng(() => {
        if (entry.kind === "act") this.engine.act(game, entry.side, entry.command, entry.args ?? null);
        else if (entry.kind === "say") this.engine.say(game, entry.side, { username: entry.user }, entry.text);
        else this.engine.concede(game, entry.side);
      });
      return null;
    } catch (e) {
      console.error(e);
      return e;
    }
  }

  private perform(entry: Entry) {
    if (!this.game) return;
    const recorded: Entry = JSON.parse(JSON.stringify(entry));
    const error = this.exec(recorded);
    this.log.push(recorded);
    this.persist();
    if (error) {
      const message = "That action failed in the engine and was undone.";
      if (entry.side !== this.lobby.mySide && this.lobby.role === "host") this.post({ t: "error", message });
      else this.actionError = message;
    }
    this.broadcast();
  }

  private broadcast() {
    if (!this.game) return;
    this.views.corp = this.engine.view(this.game, "corp");
    this.views.runner = this.engine.view(this.game, "runner");
    this.post({ t: "view", view: this.views[other(this.lobby.mySide)] });
    this.emit();
    this.scheduleBot();
  }

  send(command: string, args?: unknown, side: Side = this.lobby.mySide) {
    if (this.lobby.role === "guest") {
      this.pending = true;
      this.post({ t: "act", command, args: args ?? null });
      this.emit();
    } else {
      this.perform({ side, kind: "act", command, args: args ?? null });
    }
  }

  say(text: string, side: Side = this.lobby.mySide) {
    if (this.lobby.role === "guest") return this.post({ t: "say", text });
    const user = side === this.lobby.mySide ? this.lobby.myName : this.lobby.opponentName;
    this.perform({ side, kind: "say", user, text });
  }

  concede(side: Side = this.lobby.mySide) {
    if (this.lobby.role === "guest") return this.post({ t: "concede" });
    this.perform({ side, kind: "concede" });
  }

  deckFor(side: Side): Deck | undefined {
    const { role, mySide, myDeck } = this.lobby;
    const name = this.deckNames[side] ?? (side === mySide ? myDeck?.name : undefined);
    const fromSetup = (this.setup as Record<Side, { deck?: Omit<Deck, "name"> }> | undefined)?.[side]?.deck;
    if (fromSetup) return { name: name ?? (side === "corp" ? "Corp deck" : "Runner deck"), ...fromSetup };
    if (side === mySide && myDeck) return fromWire(myDeck, this.db);
    if (role === "local" && this.opponentDeck) return fromWire(this.opponentDeck, this.db);
    return undefined;
  }

  clearActionError() {
    this.actionError = null;
    this.emit();
  }

  forget() {
    writeSave(this.lobby.role, null);
  }

  close() {
    this.closed = true;
    if (this.heartbeat !== undefined) clearInterval(this.heartbeat);
    document.removeEventListener("visibilitychange", this.wake);
    removeEventListener("online", this.wake);
    if (this.botTimer !== undefined) clearTimeout(this.botTimer);
    if (this.watchdog !== undefined) clearInterval(this.watchdog);
    this.room?.leave();
  }
}
