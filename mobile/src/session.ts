import type { CardDb, Deck, EngineApi, GameHandle, Side } from "./engine";
import { HeuristicBot } from "./bot/heuristic.ts";
import { type WireDeck, engineDeck, fromWire } from "./decks";
import { PeerTransport } from "./net/p2p";
import { RELAY_URL, RelayTransport, createGame, joinGame, rejoinLink, storedTicket } from "./net/relay";
import type { Entry, LinkStatus, Payload, Seat, Transport } from "./net/types";

export type Role = "host" | "guest" | "local";

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

type LocalEntry =
  | { side: Side; kind: "act"; command: string; args: unknown }
  | { side: Side; kind: "say"; user?: string; text: string }
  | { side: Side; kind: "concede" };

export type SavedGame =
  | {
      v: 1;
      role: "local";
      code: string;
      myName: string;
      mySide: Side;
      opponentName?: string;
      vsBot?: boolean;
      setup: unknown;
      deckNames?: Partial<Record<Side, string>>;
      seed: number[];
      log: LocalEntry[];
      savedAt: number;
      summary?: GameSummary;
    }
  | {
      v: 2;
      role: "host" | "guest";
      transport: "relay" | "p2p";
      code: string;
      myName: string;
      myDeck?: WireDeck;
      entries: Entry[];
      savedAt: number;
      summary?: GameSummary;
    };

export interface GameSummary {
  side?: Side;
  opponent?: string;
  turn?: number;
  points?: [number, number];
  myMove?: boolean;
  winner?: Side;
}

type Listener = () => void;

const SAVE_KEYS = { local: "nsg.save", online: "nsg.online" } as const;
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

const GAME_PREFIX = "nsg.game.";
const MAX_GAMES = 12;

export const saveId = (save: { role: Role; code: string }) => (save.role === "local" ? `local:${save.code}` : save.code);

function parseSave(raw: string | null): SavedGame | null {
  try {
    const save = raw ? (JSON.parse(raw) as SavedGame) : null;
    if (save?.v === 1 && save.role === "local" && save.code) return save;
    if (save?.v === 2 && save.code) return save;
  } catch {}
  return null;
}

function migrateLegacy() {
  for (const key of Object.values(SAVE_KEYS)) {
    try {
      const legacy = parseSave(localStorage.getItem(key));
      if (legacy && !localStorage.getItem(GAME_PREFIX + saveId(legacy))) localStorage.setItem(GAME_PREFIX + saveId(legacy), JSON.stringify(legacy));
      localStorage.removeItem(key);
    } catch {}
  }
}

export function listSaves(): SavedGame[] {
  migrateLegacy();
  const out: SavedGame[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(GAME_PREFIX)) continue;
      const save = parseSave(localStorage.getItem(key));
      if (save) out.push(save);
    }
  } catch {}
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

export function loadSave(id: string): SavedGame | null {
  migrateLegacy();
  try {
    return parseSave(localStorage.getItem(GAME_PREFIX + id));
  } catch {
    return null;
  }
}

function writeSave(id: string, save: SavedGame | null) {
  const key = GAME_PREFIX + id;
  try {
    if (!save) return localStorage.removeItem(key);
    const fresh = !localStorage.getItem(key);
    const others = () => listSaves().filter((g) => saveId(g) !== id);
    if (fresh) for (const old of others().slice(MAX_GAMES - 1)) localStorage.removeItem(GAME_PREFIX + saveId(old));
    const raw = JSON.stringify(save);
    for (;;) {
      try {
        return localStorage.setItem(key, raw);
      } catch {
        const oldest = others().pop();
        if (!oldest) return;
        localStorage.removeItem(GAME_PREFIX + saveId(oldest));
      }
    }
  } catch {}
}

export function clearSave(save: SavedGame) {
  writeSave(saveId(save), null);
}

const deckSide = (db: CardDb, deck: WireDeck): Side | undefined => db.byTitle.get(deck.identity)?.side.toLowerCase() as Side | undefined;

const LAST_DECK = (side: Side) => `nsg.lastDeck.${side}`;
const LAST_SIDE = "nsg.lastSide";

function rememberedSide(): Side {
  try {
    return localStorage.getItem(LAST_SIDE) === "runner" ? "runner" : "corp";
  } catch {
    return "corp";
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

interface Table {
  names: [string | undefined, string | undefined];
  creatorSide: Side;
  sideSet: boolean;
  decks: [WireDeck | null, WireDeck | null];
  started: boolean;
}

export class Session {
  lobby: LobbyState;
  views: Partial<Record<Side, any>> = {};
  pending = false;
  actionError: string | null = null;
  private listeners = new Set<Listener>();
  private game?: GameHandle;
  private opponentDeck?: WireDeck;
  private setup?: unknown;
  private deckNames: Partial<Record<Side, string>> = {};
  private seed?: number[];
  private rng?: () => number;
  private log: LocalEntry[] = [];
  private closed = false;
  private bot?: HeuristicBot;
  private botTimer?: number;
  private transport?: Transport;
  private seat: Seat = 0;
  private entries: Entry[] = [];
  private table: Table = { names: [undefined, undefined], creatorSide: "corp", sideSet: false, decks: [null, null], started: false };
  private wantedSide: Side = "corp";
  private link: LinkStatus = { link: "connecting", peer: false };
  private announced = false;
  private autoplay = false;

  constructor(
    private engine: EngineApi,
    private db: CardDb,
    role: Role,
    code: string | undefined,
    myName: string,
    mySide: Side = rememberedSide(),
    resumeEntries: Entry[] = [],
  ) {
    this.lobby = {
      code: code ?? "",
      role,
      status: role === "local" ? "connected" : "connecting",
      myName,
      mySide,
      opponentDeckReady: false,
      started: false,
    };
    if (role === "local") {
      this.restoreDecks();
      return;
    }
    this.seat = role === "host" ? 0 : 1;
    this.wantedSide = mySide;
    for (const entry of resumeEntries) this.apply(entry);
    this.lobby.myDeck = this.rememberedDeck(this.displaySide());
    this.syncLobby();
    if (this.game) this.refreshViews();
    void this.connect(code);
  }

  static resume(engine: EngineApi, db: CardDb, save: SavedGame): Session {
    if (save.v === 2) {
      const session = new Session(engine, db, save.role, save.code, save.myName, rememberedSide(), save.entries);
      if (save.myDeck && !session.lobby.started) session.lobby = { ...session.lobby, myDeck: save.myDeck };
      return session;
    }
    const session = new Session(engine, db, "local", save.code, save.myName, save.mySide);
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

  // ---------- online: transport and the shared log ----------

  private async connect(code: string | undefined) {
    const handlers = { onEntries: (list: Entry[]) => this.receive(list), onStatus: (s: LinkStatus) => this.linkChanged(s) };
    try {
      if (RELAY_URL) {
        const ticket = this.seat === 0 && !code ? await createGame() : this.seat === 0 ? storedTicket(code!) : await joinGame(code!);
        if (!ticket) throw new Error("This game was created on another device.");
        if (this.closed) return;
        this.seat = ticket.seat;
        this.patch({ code: ticket.code, role: ticket.seat === 0 ? "host" : "guest" });
        this.transport = new RelayTransport(ticket, this.lastSeq(), handlers);
      } else {
        const room = code ?? newRoomCode();
        this.patch({ code: room });
        this.transport = new PeerTransport(room, this.seat, [...this.entries], handlers);
      }
      this.persist();
    } catch (e) {
      this.patch({ status: "closed", error: e instanceof Error ? e.message : String(e) });
    }
  }

  private lastSeq() {
    return this.entries.length ? this.entries[this.entries.length - 1].seq : 0;
  }

  private linkChanged(status: LinkStatus) {
    if (status.error && status.error !== this.link.error) {
      this.actionError = status.error;
      if (/seat|no longer exists|expired/.test(status.error)) this.forget();
    }
    this.link = status;
    if (status.link === "open" && !this.announced) {
      this.announced = true;
      if (this.table.names[this.seat] !== this.lobby.myName) this.push({ k: "join", name: this.lobby.myName });
      if (this.seat === 0 && !this.table.sideSet) this.push({ k: "side", side: this.wantedSide });
    }
    this.syncLobby();
  }

  private push(p: Payload) {
    this.transport?.send(p);
  }

  private receive(list: Entry[]) {
    let changed = false;
    for (const entry of list) {
      if (entry.seq !== this.lastSeq() + 1) continue;
      this.apply(entry);
      changed = true;
    }
    if (!changed) return;
    this.persist();
    this.syncLobby();
    if (this.game) this.refreshViews();
  }

  private sideOf(seat: Seat): Side {
    return seat === 0 ? this.table.creatorSide : other(this.table.creatorSide);
  }

  private apply(entry: Entry) {
    this.entries.push(entry);
    const { seat, p } = entry;
    const t = this.table;
    switch (p.k) {
      case "join":
      case "name":
        t.names[seat] = String(p.name).slice(0, 24);
        break;
      case "side":
        if (seat !== 0 || t.started || (p.side !== "corp" && p.side !== "runner")) break;
        t.creatorSide = p.side;
        t.sideSet = true;
        t.decks = [null, null];
        break;
      case "deck":
        if (t.started) break;
        t.decks[seat] = p.deck && deckSide(this.db, p.deck) === this.sideOf(seat) ? p.deck : null;
        break;
      case "start":
        if (seat !== 0 || t.started || !t.decks[0] || !t.decks[1] || !Array.isArray(p.seed) || p.seed.length !== 4) break;
        this.startShared(p.seed);
        break;
      case "act":
      case "say":
      case "concede": {
        if (!this.game) break;
        const side = this.sideOf(seat);
        const local: LocalEntry =
          p.k === "act" ? { side, kind: "act", command: p.command, args: p.args ?? null } : p.k === "say" ? { side, kind: "say", user: t.names[seat], text: p.text } : { side, kind: "concede" };
        const error = this.exec(local);
        if (seat === this.seat) {
          this.pending = false;
          if (error) this.actionError = "That action failed in the engine and was undone.";
        }
        break;
      }
    }
  }

  private startShared(seed: number[]) {
    const t = this.table;
    const seatOf = (side: Side): Seat => (this.sideOf(0) === side ? 0 : 1);
    const player = (side: Side) => {
      const seat = seatOf(side);
      return { user: { username: t.names[seat] ?? (seat === 0 ? "Host" : "Guest") }, deck: engineDeck(fromWire(t.decks[seat]!, this.db)) };
    };
    this.deckNames = { corp: t.decks[seatOf("corp")]!.name, runner: t.decks[seatOf("runner")]!.name };
    this.boot({ gameid: this.lobby.code || "online", format: "casual", corp: player("corp"), runner: player("runner") }, seed);
    t.started = true;
  }

  private displaySide(): Side {
    return this.seat === 0 && !this.table.sideSet ? this.wantedSide : this.sideOf(this.seat);
  }

  private syncLobby() {
    if (this.lobby.role === "local") return;
    const t = this.table;
    const mySide = this.displaySide();
    const theirs = (1 - this.seat) as Seat;
    const status: LobbyState["status"] = this.lobby.status === "closed" && !this.transport ? "closed" : this.link.link === "connecting" ? "connecting" : this.link.peer ? "connected" : "waiting";
    let myDeck = this.lobby.myDeck;
    if (mySide !== this.lobby.mySide) myDeck = this.rememberedDeck(mySide);
    this.lobby = {
      ...this.lobby,
      status,
      mySide,
      myDeck,
      opponentName: t.names[theirs],
      ready: this.seat === 1 && !!t.decks[1],
      opponentDeckReady: this.seat === 0 && !!t.decks[1],
      started: t.started,
      step: this.link.step,
      hint: this.link.hint,
      since: this.link.since,
      error: this.link.error ?? (status === "closed" ? this.lobby.error : undefined),
    };
    this.emit();
  }

  private refreshViews() {
    if (!this.game) return;
    this.views[this.lobby.mySide] = this.engine.view(this.game, this.lobby.mySide);
    if (this.autoplay && !this.bot) this.bot = new HeuristicBot(this.lobby.mySide, (title) => this.db.byTitle.get(title) as any);
    this.emit();
    this.scheduleBot();
  }

  get rejoinUrl(): string | undefined {
    return this.transport instanceof RelayTransport ? rejoinLink(this.transport.seatTicket) : undefined;
  }

  get canFreeSeat() {
    return this.transport instanceof RelayTransport && this.seat === 0 && !!this.table.names[1] && !this.link.peer;
  }

  freeSeat() {
    if (this.canFreeSeat) (this.transport as RelayTransport).release();
  }

  autopilot() {
    if (!this.online()) return;
    this.autoplay = true;
    this.refreshViews();
  }

  // ---------- local and bot games ----------

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
      if (this.online() && this.pending) return;
      const move = bot.decide(this.views[bot.side]);
      if (!move) return;
      if (move.say) this.say(move.say, bot.side);
      else if (this.online()) this.send(move.command, move.args ?? null);
      else this.perform({ side: bot.side, kind: "act", command: move.command, args: move.args ?? null });
    }, BOT_DELAY_MS);
  }

  private rememberedDeck(side: Side): WireDeck | undefined {
    try {
      const deck: WireDeck = JSON.parse(localStorage.getItem(LAST_DECK(side)) ?? "null");
      if (!deck || deckSide(this.db, deck) !== side) return undefined;
      fromWire(deck, this.db);
      return deck;
    } catch {
      return undefined;
    }
  }

  private restoreDecks() {
    const myDeck = this.rememberedDeck(this.lobby.mySide);
    this.opponentDeck = this.rememberedDeck(other(this.lobby.mySide));
    this.lobby = { ...this.lobby, myDeck, opponentDeckReady: !!this.opponentDeck };
  }

  get localOpponentDeck() {
    return this.lobby.role === "local" ? this.opponentDeck : undefined;
  }

  // ---------- lobby actions ----------

  setSide(side: Side) {
    if (this.lobby.role === "guest" || side === this.lobby.mySide || this.lobby.started) return;
    remember(LAST_SIDE, side);
    if (this.lobby.role === "local") {
      this.lobby = { ...this.lobby, mySide: side };
      this.restoreDecks();
      return this.emit();
    }
    this.wantedSide = side;
    this.lobby = { ...this.lobby, myDeck: this.rememberedDeck(side) };
    this.push({ k: "side", side });
  }

  setDeck(deck: WireDeck, side?: Side) {
    remember(LAST_DECK(side ?? this.lobby.mySide), JSON.stringify(deck));
    if (this.lobby.role === "local") {
      if (side && side !== this.lobby.mySide) {
        this.opponentDeck = deck;
        this.patch({ opponentDeckReady: true });
      } else this.patch({ myDeck: deck });
      return;
    }
    if (this.lobby.role === "guest" && this.table.decks[1]) this.push({ k: "deck", deck: null });
    this.patch({ myDeck: deck });
    this.persist();
  }

  setName(name: string) {
    const myName = name.trim().slice(0, 24) || "Player";
    if (myName === this.lobby.myName || this.lobby.started) return;
    remember("nsg.name", myName);
    this.patch({ myName });
    if (this.lobby.role !== "local") {
      this.push({ k: "name", name: myName });
      this.persist();
    }
  }

  setReady(ready: boolean) {
    if (this.lobby.role !== "guest" || this.lobby.started) return;
    this.push({ k: "deck", deck: ready && this.lobby.myDeck ? this.lobby.myDeck : null });
  }

  get canStart() {
    const { role, myDeck, mySide, started } = this.lobby;
    if (started || role === "guest" || !myDeck || deckSide(this.db, myDeck) !== mySide) return false;
    if (role === "host") return !!this.table.decks[1];
    return !!this.opponentDeck && deckSide(this.db, this.opponentDeck) === other(mySide);
  }

  start() {
    if (!this.canStart) return;
    const seed = Array.from(crypto.getRandomValues(new Uint32Array(4)));
    if (this.lobby.role === "host") {
      this.push({ k: "deck", deck: this.lobby.myDeck! });
      this.push({ k: "start", seed });
      return;
    }
    const mine = fromWire(this.lobby.myDeck!, this.db);
    const theirs = fromWire(this.opponentDeck!, this.db);
    const me = { username: this.lobby.myName };
    const them = { username: this.lobby.opponentName ?? "Player 2" };
    const players =
      this.lobby.mySide === "corp"
        ? { corp: { user: me, deck: engineDeck(mine) }, runner: { user: them, deck: engineDeck(theirs) } }
        : { corp: { user: them, deck: engineDeck(theirs) }, runner: { user: me, deck: engineDeck(mine) } };
    this.deckNames = { [this.lobby.mySide]: mine.name, [other(this.lobby.mySide)]: theirs.name };
    this.boot({ gameid: this.lobby.code, format: "casual", ...players }, seed);
    this.log = [];
    this.lobby = { ...this.lobby, started: true };
    this.makeBot();
    this.persist();
    this.broadcast();
  }

  // ---------- engine ----------

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

  private restore(save: Extract<SavedGame, { v: 1 }>) {
    this.deckNames = save.deckNames ?? {};
    this.boot(save.setup, save.seed);
    for (const entry of save.log) this.exec(entry);
    this.log = [...save.log];
    this.lobby = { ...this.lobby, opponentName: save.opponentName, vsBot: save.vsBot, started: true, opponentDeckReady: true };
    this.makeBot();
    this.broadcast();
  }

  private persist() {
    if (this.lobby.role === "local") {
      if (!this.setup || !this.seed) return;
      return writeSave(this.saveId!, {
        v: 1,
        role: "local",
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
        summary: this.summary(),
      });
    }
    if (!this.lobby.code || !this.transport) return;
    writeSave(this.saveId!, {
      v: 2,
      role: this.lobby.role,
      transport: this.transport.kind,
      code: this.lobby.code,
      myName: this.lobby.myName,
      myDeck: this.lobby.myDeck,
      entries: this.entries,
      savedAt: Date.now(),
      summary: this.summary(),
    });
  }

  get saveId() {
    return this.lobby.code ? saveId(this.lobby) : undefined;
  }

  private summary(): GameSummary {
    const { mySide, opponentName, started, vsBot, role } = this.lobby;
    const view = this.views[mySide];
    const opponent = role === "local" && !vsBot ? undefined : opponentName;
    if (!started || !view) return { side: mySide, opponent };
    const points = (side: Side) => Number(view[side]?.["agenda-point"] ?? 0);
    return {
      side: mySide,
      opponent,
      turn: view.turn,
      points: [points(mySide), points(other(mySide))],
      myMove: view["active-player"] === mySide,
      winner: view.winner || undefined,
    };
  }

  private exec(entry: LocalEntry) {
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

  private perform(entry: LocalEntry) {
    if (!this.game) return;
    const recorded: LocalEntry = JSON.parse(JSON.stringify(entry));
    const error = this.exec(recorded);
    this.log.push(recorded);
    this.persist();
    if (error) this.actionError = "That action failed in the engine and was undone.";
    this.broadcast();
  }

  private broadcast() {
    if (!this.game) return;
    this.views.corp = this.engine.view(this.game, "corp");
    this.views.runner = this.engine.view(this.game, "runner");
    this.emit();
    this.scheduleBot();
  }

  // ---------- game actions ----------

  private online() {
    return this.lobby.role !== "local";
  }

  send(command: string, args?: unknown, side: Side = this.lobby.mySide) {
    if (this.online()) {
      this.pending = true;
      this.push({ k: "act", command, args: JSON.parse(JSON.stringify(args ?? null)) });
      this.emit();
    } else this.perform({ side, kind: "act", command, args: args ?? null });
  }

  say(text: string, side: Side = this.lobby.mySide) {
    if (this.online()) return this.push({ k: "say", text });
    const user = side === this.lobby.mySide ? this.lobby.myName : this.lobby.opponentName;
    this.perform({ side, kind: "say", user, text });
  }

  concede(side: Side = this.lobby.mySide) {
    if (this.online()) return this.push({ k: "concede" });
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
    if (this.saveId) writeSave(this.saveId, null);
  }

  close() {
    this.closed = true;
    if (this.botTimer !== undefined) clearTimeout(this.botTimer);
    this.transport?.close();
  }
}
