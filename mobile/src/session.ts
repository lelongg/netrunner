import type { CardDb, Deck, EngineApi, Side } from "./engine";
import { HeuristicBot } from "./bot/heuristic.ts";
import { type WireDeck, engineDeck, fromPrecon, fromWire, latest, toWire } from "./decks";
import { type GameFormat, analyze, dealtFormat, deckFormat, isGameFormat } from "./deckrules";
import { type GameHost, type LocalEntry, type Op, type Probe, type ProbeResult, type Seat as ViewSeat, makeHost } from "./game/runner";
import { owesMove } from "./game/actions";
import { archive } from "./history";
import { RelayTransport, relayUrl, createGame, forgetTicket, joinGame, rejoinLink, storedTicket, watchLink } from "./net/relay";
import type { Entry, LinkStatus, Payload, Seat, Transport } from "./net/types";
import { type Store, browserStore } from "./store";
import { settings } from "./settings";

export type Role = "host" | "guest" | "local" | "spectator";

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
  tutorial?: boolean;
  error?: string;
  step?: "relay" | "host";
  hint?: "unreachable";
  since?: number;
  players?: Partial<Record<Side, string>>;
  watchers?: number;
  format: GameFormat;
}

export type SavedGame =
  | {
      v: 1;
      role: "local";
      code: string;
      myName: string;
      mySide: Side;
      opponentName?: string;
      vsBot?: boolean;
      tutorial?: boolean;
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

function migrateLegacy(store: Store) {
  for (const key of Object.values(SAVE_KEYS)) {
    try {
      const legacy = parseSave(store.getItem(key));
      if (legacy && !store.getItem(GAME_PREFIX + saveId(legacy))) store.setItem(GAME_PREFIX + saveId(legacy), JSON.stringify(legacy));
      store.removeItem(key);
    } catch {}
  }
}

export function listSaves(store: Store = browserStore()): SavedGame[] {
  migrateLegacy(store);
  const out: SavedGame[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (!key?.startsWith(GAME_PREFIX)) continue;
      const save = parseSave(store.getItem(key));
      if (save) out.push(save);
    }
  } catch {}
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

export function loadSave(id: string, store: Store = browserStore()): SavedGame | null {
  migrateLegacy(store);
  try {
    return parseSave(store.getItem(GAME_PREFIX + id));
  } catch {
    return null;
  }
}

function writeSave(id: string, save: SavedGame | null, store: Store) {
  const key = GAME_PREFIX + id;
  try {
    if (!save) return store.removeItem(key);
    const fresh = !store.getItem(key);
    const others = () => listSaves(store).filter((g) => saveId(g) !== id);
    if (fresh) for (const old of others().slice(MAX_GAMES - 1)) store.removeItem(GAME_PREFIX + saveId(old));
    const raw = JSON.stringify(save);
    for (;;) {
      try {
        return store.setItem(key, raw);
      } catch {
        const oldest = others().pop();
        if (!oldest) return;
        store.removeItem(GAME_PREFIX + saveId(oldest));
      }
    }
  } catch {}
}

export function clearSave(save: SavedGame, store: Store = browserStore()) {
  writeSave(saveId(save), null, store);
}

const deckSide = (db: CardDb, deck: WireDeck): Side | undefined => db.byTitle.get(deck.identity)?.side.toLowerCase() as Side | undefined;

const LAST_DECK = (side: Side) => `nsg.lastDeck.${side}`;
const LAST_SIDE = "nsg.lastSide";

function rememberedSide(store: Store): Side {
  try {
    return store.getItem(LAST_SIDE) === "runner" ? "runner" : "corp";
  } catch {
    return "corp";
  }
}

export function lastDeck(side: Side, store: Store = browserStore()): WireDeck | undefined {
  try {
    return JSON.parse(store.getItem(LAST_DECK(side)) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}

export function setLastDeck(side: Side, deck: WireDeck, store: Store = browserStore()) {
  remember(LAST_DECK(side), JSON.stringify(deck), store);
}

function remember(key: string, value: string, store: Store) {
  try {
    store.setItem(key, value);
  } catch {}
}

interface Table {
  names: [string | undefined, string | undefined];
  creatorSide: Side;
  sideSet: boolean;
  decks: [WireDeck | null, WireDeck | null];
  started: boolean;
  format: GameFormat;
}

export class Session {
  lobby: LobbyState;
  views: Partial<Record<Side | "spectator", any>> = {};
  pending = false;
  actionError: string | null = null;
  private listeners = new Set<Listener>();
  private host?: GameHost;
  private booted = false;
  private staged: { op: Op; done?: (failed: boolean) => void }[] = [];
  private queue: Promise<void> = Promise.resolve();
  private opponentDeck?: WireDeck;
  private setup?: unknown;
  private deckNames: Partial<Record<Side, string>> = {};
  private seed?: number[];
  private log: LocalEntry[] = [];
  private closed = false;
  private bot?: HeuristicBot;
  private botTimer?: number;
  private transport?: Transport;
  private seat: Seat = 0;
  private lastAuthor?: Seat;
  private mustAct?: boolean;
  private archived = false;
  private entries: Entry[] = [];
  private table: Table = { names: [undefined, undefined], creatorSide: "corp", sideSet: false, decks: [null, null], started: false, format: "casual" };
  private wantedSide: Side = "corp";
  private link: LinkStatus = { link: "connecting", peer: false };
  private announced = false;
  private autoplay = false;
  private watching = false;

  constructor(
    private engine: EngineApi,
    private db: CardDb,
    role: Role,
    code: string | undefined,
    myName: string,
    side?: Side,
    resumeEntries: Entry[] = [],
    private store: Store = browserStore(),
  ) {
    const mySide = side ?? rememberedSide(store);
    this.lobby = {
      code: code ?? "",
      role,
      status: role === "local" ? "connected" : "connecting",
      myName,
      mySide,
      opponentDeckReady: false,
      started: false,
      format: role === "local" ? settings.format : "casual",
    };
    if (role === "local") {
      this.restoreDecks();
      return;
    }
    this.seat = role === "host" ? 0 : 1;
    this.watching = role === "spectator";
    this.wantedSide = mySide;
    for (const entry of resumeEntries) this.apply(entry);
    this.lobby.myDeck = this.rememberedDeck(this.displaySide());
    this.syncLobby();
    if (this.booted) this.refreshViews();
    void this.connect(code);
  }

  static resume(engine: EngineApi, db: CardDb, save: SavedGame, store: Store = browserStore()): Session {
    if (save.v === 2) {
      const session = new Session(engine, db, save.role, save.code, save.myName, undefined, save.entries, store);
      if (save.myDeck && !session.lobby.started) session.lobby = { ...session.lobby, myDeck: save.myDeck };
      return session;
    }
    const session = new Session(engine, db, "local", save.code, save.myName, save.mySide, [], store);
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
      if (this.watching) {
        if (!relayUrl() || !code) throw new Error("Watching a game needs the online relay.");
        this.transport = new RelayTransport({ code, seat: null }, this.lastSeq(), handlers);
        return;
      }
      if (relayUrl()) {
        const fresh = this.seat === 0 && !code;
        const ticket = fresh ? await createGame(this.store) : this.seat === 0 ? storedTicket(code!, this.store) : await joinGame(code!, this.store);
        if (!ticket) throw new Error("This game was created on another device.");
        if (this.closed) return;
        this.seat = ticket.seat;
        this.patch({ code: ticket.code, role: ticket.seat === 0 ? "host" : "guest" });
        this.transport = new RelayTransport(ticket, this.lastSeq(), handlers, this.store);
        if (fresh && settings.format !== "casual") this.push({ k: "format", format: settings.format });
        if (this.matchSetup && ticket.seat === 0) this.applyMatch();
      } else {
        const room = code ?? newRoomCode();
        this.patch({ code: room });
        const { PeerTransport } = await import("./net/p2p");
        if (this.closed) return;
        this.transport = new PeerTransport(room, this.seat, [...this.entries], handlers);
        if (!code && this.seat === 0 && settings.format !== "casual") this.push({ k: "format", format: settings.format });
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
    if (status.link === "open" && !this.announced && !this.watching) {
      this.announced = true;
      if (this.table.names[this.seat] !== this.lobby.myName) this.push({ k: "join", name: this.lobby.myName });
      if (this.seat === 0 && !this.table.sideSet) this.push({ k: "side", side: this.wantedSide });
    }
    this.syncLobby();
  }

  private matchSetup?: { format: GameFormat; side?: Side };

  configureMatch(format: GameFormat, side?: Side) {
    this.matchSetup = { format, side };
    if (side) this.wantedSide = side;
    if (this.transport && this.seat === 0) this.applyMatch();
  }

  private applyMatch() {
    const setup = this.matchSetup!;
    if (setup.format !== this.lobby.format) this.push({ k: "format", format: setup.format });
    if (setup.side) this.push({ k: "side", side: setup.side });
  }

  private push(p: Payload) {
    this.transport?.send(p);
  }

  get lastActAt(): number | undefined {
    for (let i = this.entries.length - 1; i >= 0; i--) if (this.entries[i].p.k === "act") return this.entries[i].at;
    return undefined;
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
    if (this.booted) this.refreshViews();
  }

  private sideOf(seat: Seat): Side {
    return seat === 0 ? this.table.creatorSide : other(this.table.creatorSide);
  }

  private apply(entry: Entry) {
    this.entries.push(entry);
    this.lastAuthor = entry.seat;
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
      case "format":
        if (seat !== 0 || t.started || !isGameFormat(p.format) || p.format === t.format) break;
        t.format = p.format;
        t.decks = [null, null];
        break;
      case "deck":
        if (t.started) break;
        t.decks[seat] = p.deck && deckSide(this.db, p.deck) === this.sideOf(seat) && this.allowed(p.deck, t.format) ? p.deck : null;
        break;
      case "start":
        if (seat !== 0 || t.started || !t.decks[0] || !t.decks[1] || !Array.isArray(p.seed) || p.seed.length !== 4) break;
        this.startShared(p.seed);
        break;
      case "act":
      case "say":
      case "concede": {
        if (!this.booted) break;
        const side = this.sideOf(seat);
        const local: LocalEntry = p.k === "act" ? { side, kind: "act", command: p.command, args: p.args ?? null } : p.k === "say" ? { side, kind: "say", user: t.names[seat], text: p.text } : { side, kind: "concede" };
        this.stage(
          { k: "exec", entry: local },
          seat === this.seat && !this.watching
            ? (failed) => {
                this.pending = false;
                if (failed) this.actionError = "That action failed in the engine and was undone.";
              }
            : undefined,
        );
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
    this.boot({ gameid: this.lobby.code || "online", format: t.format, corp: player("corp"), runner: player("runner") }, seed);
    t.started = true;
  }

  private displaySide(): Side {
    if (this.watching) return this.lobby.mySide;
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
      format: t.format,
      players: { [this.sideOf(0)]: t.names[0], [this.sideOf(1)]: t.names[1] },
      watchers: this.link.watchers,
      step: this.link.step,
      hint: this.link.hint,
      since: this.link.since,
      error: this.link.error ?? (status === "closed" ? this.lobby.error : undefined),
    };
    this.emit();
  }

  private refreshViews() {
    if (!this.booted) return;
    if (this.watching) return this.commit(["spectator"], () => this.emit());
    this.commit([this.lobby.mySide], () => {
      if (this.autoplay && !this.bot) this.bot = new HeuristicBot(this.lobby.mySide, (title) => this.db.byTitle.get(title) as any);
      this.settleEnd();
      this.emit();
      this.scheduleBot();
      this.checkTurn();
    });
  }

  private settleEnd() {
    if (!this.archived && this.views[this.lobby.mySide]?.winner) this.persist();
  }

  private checkTurn() {
    const side = this.lobby.mySide;
    const view = this.views[side];
    const now = !!view && owesMove(view, side);
    const before = this.mustAct;
    this.mustAct = now;
    if (before && !now && !view?.winner && this.lastAuthor === this.seat && this.transport instanceof RelayTransport) this.transport.nudge(this.lobby.myName);
  }

  get seatTicket() {
    return this.transport instanceof RelayTransport ? this.transport.seatTicket : undefined;
  }

  get rejoinUrl(): string | undefined {
    const ticket = this.seatTicket;
    return ticket && rejoinLink(ticket);
  }

  get watchUrl(): string | undefined {
    return this.transport instanceof RelayTransport && this.lobby.code ? watchLink(this.lobby.code) : undefined;
  }

  watchAs(side: Side) {
    if (this.watching) this.patch({ mySide: side });
  }

  get canFreeSeat() {
    const other = 1 - this.seat;
    return this.transport instanceof RelayTransport && !this.watching && !!this.table.names[other] && !this.link.free?.[other];
  }

  get freeSeatSide(): Side | undefined {
    if (!this.watching || !(this.transport instanceof RelayTransport) || !this.table.started) return undefined;
    const seat = ([0, 1] as Seat[]).find((s) => this.link.free?.[s]);
    return seat === undefined ? undefined : this.sideOf(seat);
  }

  async takeSeat() {
    const code = this.lobby.code;
    if (!code || !this.freeSeatSide) return;
    forgetTicket(code, this.store);
    const ticket = await joinGame(code, this.store);
    location.href = rejoinLink(ticket);
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

  private held = false;

  holdBot(held: boolean) {
    if (held === this.held) return;
    this.held = held;
    if (!held) this.scheduleBot();
  }

  startTutorial(side: Side, mine: WireDeck, theirs: WireDeck) {
    this.lobby = { ...this.lobby, vsBot: true, opponentName: "Bot", tutorial: true, mySide: side, myDeck: mine, format: "casual" };
    this.opponentDeck = theirs;
    this.lobby.opponentDeckReady = true;
    this.start();
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
    if (!bot || this.botTimer !== undefined || this.closed || this.held) return;
    if (!this.views[bot.side] || this.views[bot.side].winner) return;
    this.botTimer = window.setTimeout(() => {
      this.botTimer = undefined;
      if (this.closed || this.held) return;
      if (this.pending) return;
      const move = bot.decide(this.views[bot.side]);
      if (!move) return;
      if (move.say) this.say(move.say, bot.side);
      else if (this.online()) this.send(move.command, move.args ?? null);
      else this.perform({ side: bot.side, kind: "act", command: move.command, args: move.args ?? null });
    }, BOT_DELAY_MS);
  }

  private rememberedDeck(side: Side): WireDeck | undefined {
    try {
      const deck: WireDeck = JSON.parse(this.store.getItem(LAST_DECK(side)) ?? "null");
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

  private allowed(deck: WireDeck, format: GameFormat) {
    return !this.problemWith(deck, format);
  }

  private problemWith(deck: WireDeck, format: GameFormat): string | null {
    if (dealtFormat(format) || format === "casual") return null;
    if (format === "preconstructed") {
      const precon = (this.engine.precons() as any[]).some((m) => (["corp", "runner"] as Side[]).some((s) => m[s].identity === deck.identity && deck.name.startsWith(m[s].name)));
      return precon ? null : "Only preconstructed decks are allowed in this format";
    }
    try {
      return analyze(fromWire(deck, this.db), deckFormat(format)!).problems.find((p) => p.level === "error")?.text ?? null;
    } catch (e) {
      return e instanceof Error ? e.message : "This deck cannot be read";
    }
  }

  deckProblem(deck: WireDeck | undefined): string | null {
    return deck ? this.problemWith(deck, this.lobby.format) : null;
  }

  private stand(side: Side): WireDeck {
    const precon = (this.engine.precons() as any[])[0][side];
    return { ...toWire(fromPrecon(precon, this.db)), name: this.lobby.format === "chimera" ? "Chimera deck" : "Drafted deck" };
  }

  private effectiveDeck(side: Side, chosen?: WireDeck): WireDeck | undefined {
    if (dealtFormat(this.lobby.format)) return this.stand(side);
    if (!chosen) return chosen;
    const { ref: _ref, ...deck } = latest(chosen, side);
    return deck;
  }

  refreshDecks() {
    if (this.lobby.started) return;
    const mine = this.lobby.myDeck && latest(this.lobby.myDeck, this.lobby.mySide);
    if (mine && JSON.stringify(mine) !== JSON.stringify(this.lobby.myDeck)) this.setDeck(mine);
    const theirs = this.lobby.role === "local" && this.opponentDeck && latest(this.opponentDeck, other(this.lobby.mySide));
    if (theirs && JSON.stringify(theirs) !== JSON.stringify(this.opponentDeck)) this.setDeck(theirs, other(this.lobby.mySide));
  }

  setFormat(format: GameFormat) {
    if (this.lobby.role === "guest" || this.lobby.started || format === this.lobby.format || !isGameFormat(format)) return;
    if (this.lobby.role === "local") {
      this.lobby = { ...this.lobby, format };
      return this.emit();
    }
    this.push({ k: "format", format });
  }

  // ---------- lobby actions ----------

  setSide(side: Side) {
    if (this.lobby.role === "guest" || side === this.lobby.mySide || this.lobby.started) return;
    remember(LAST_SIDE, side, this.store);
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
    remember(LAST_DECK(side ?? this.lobby.mySide), JSON.stringify(deck), this.store);
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
    remember("nsg.name", myName, this.store);
    this.patch({ myName });
    if (this.lobby.role !== "local") {
      this.push({ k: "name", name: myName });
      this.persist();
    }
  }

  setReady(ready: boolean) {
    if (this.lobby.role !== "guest" || this.lobby.started) return;
    const deck = this.effectiveDeck(this.lobby.mySide, this.lobby.myDeck);
    if (ready && deck && this.deckProblem(deck)) return;
    this.push({ k: "deck", deck: ready && deck ? deck : null });
  }

  get canStart() {
    const { role, mySide, started } = this.lobby;
    const myDeck = this.effectiveDeck(mySide, this.lobby.myDeck);
    if (started || role === "guest" || !myDeck || deckSide(this.db, myDeck) !== mySide || this.deckProblem(myDeck)) return false;
    if (role === "host") return !!this.table.decks[1];
    const theirs = this.effectiveDeck(other(mySide), this.opponentDeck);
    return !!theirs && deckSide(this.db, theirs) === other(mySide) && !this.deckProblem(theirs);
  }

  start() {
    if (!this.canStart) return;
    const seed = Array.from(crypto.getRandomValues(new Uint32Array(4)));
    if (this.lobby.role === "host") {
      this.push({ k: "deck", deck: this.effectiveDeck(this.lobby.mySide, this.lobby.myDeck)! });
      this.push({ k: "start", seed });
      return;
    }
    const mine = fromWire(this.effectiveDeck(this.lobby.mySide, this.lobby.myDeck)!, this.db);
    const theirs = fromWire(this.effectiveDeck(other(this.lobby.mySide), this.opponentDeck)!, this.db);
    const me = { username: this.lobby.myName };
    const them = { username: this.lobby.opponentName ?? "Player 2" };
    const players = this.lobby.mySide === "corp" ? { corp: { user: me, deck: engineDeck(mine) }, runner: { user: them, deck: engineDeck(theirs) } } : { corp: { user: them, deck: engineDeck(theirs) }, runner: { user: me, deck: engineDeck(mine) } };
    this.deckNames = { [this.lobby.mySide]: mine.name, [other(this.lobby.mySide)]: theirs.name };
    this.boot({ gameid: this.lobby.code, format: this.lobby.format, ...players }, seed);
    this.log = [];
    this.lobby = { ...this.lobby, started: true };
    this.makeBot();
    this.persist();
    this.broadcast();
  }

  // ---------- engine ----------

  private stage(op: Op, done?: (failed: boolean) => void) {
    this.staged.push({ op, done });
  }

  private commit(sides: ViewSeat[], after?: () => void) {
    const batch = this.staged;
    this.staged = [];
    const host = this.host;
    if (!host) return;
    this.queue = this.queue
      .then(async () => {
        const result = await host.run(
          batch.map((b) => b.op),
          sides,
        );
        if (this.closed) return;
        const failed = new Set(result.failed);
        batch.forEach((b, i) => b.done?.(failed.has(i)));
        Object.assign(this.views, result.views);
        after?.();
      })
      .catch((e) => {
        console.error(e);
        this.pending = false;
        this.actionError = "The game engine stopped responding. Reload the game.";
        this.emit();
      });
  }

  settled() {
    return this.queue;
  }

  async revealed(): Promise<Record<Side, any> | null> {
    const host = this.host;
    if (!host || !this.views[this.lobby.mySide]?.winner) return null;
    await this.queue;
    const result = await host.run([], ["corp", "runner"]);
    return result.views as Record<Side, any>;
  }

  probe(side: Side, probes: Probe[]): Promise<ProbeResult[]> {
    const host = this.host;
    if (!host || !probes.length) return Promise.resolve(probes.map(() => ({ ok: false })));
    return this.queue.then(() => host.probe(side, probes));
  }

  private boot(setup: unknown, seed: number[]) {
    this.setup = setup;
    this.seed = seed;
    this.host ??= makeHost(this.engine);
    this.booted = true;
    this.stage({ k: "boot", setup, seed });
  }

  private restore(save: Extract<SavedGame, { v: 1 }>) {
    this.deckNames = save.deckNames ?? {};
    this.boot(save.setup, save.seed);
    for (const entry of save.log) this.stage({ k: "exec", entry });
    this.log = [...save.log];
    this.lobby = { ...this.lobby, opponentName: save.opponentName, vsBot: save.vsBot, tutorial: save.tutorial, started: true, opponentDeckReady: true };
    this.makeBot();
    this.broadcast();
  }

  private snapshot(): SavedGame | undefined {
    if (this.watching) return;
    if (this.lobby.role === "local") {
      if (!this.setup || !this.seed) return;
      return {
        v: 1,
        role: "local",
        code: this.lobby.code,
        myName: this.lobby.myName,
        mySide: this.lobby.mySide,
        opponentName: this.lobby.opponentName,
        vsBot: this.lobby.vsBot,
        tutorial: this.lobby.tutorial,
        setup: this.setup,
        deckNames: this.deckNames,
        seed: this.seed,
        log: this.log,
        savedAt: Date.now(),
        summary: this.summary(),
      };
    }
    if (!this.lobby.code || !this.transport) return;
    return {
      v: 2,
      role: this.lobby.role as "host" | "guest",
      transport: this.transport.kind,
      code: this.lobby.code,
      myName: this.lobby.myName,
      myDeck: this.lobby.myDeck,
      entries: this.entries,
      savedAt: Date.now(),
      summary: this.summary(),
    };
  }

  private persist() {
    const save = this.snapshot();
    if (!save) return;
    writeSave(this.saveId!, save, this.store);
    if (save.summary?.winner && !this.archived) {
      this.archived = true;
      void archive(save);
    }
  }

  journal(): string | undefined {
    const save = this.snapshot();
    return save && JSON.stringify(save);
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

  private perform(entry: LocalEntry) {
    if (!this.booted) return;
    const recorded: LocalEntry = JSON.parse(JSON.stringify(entry));
    this.stage({ k: "exec", entry: recorded }, (failed) => {
      if (failed) this.actionError = "That action failed in the engine and was undone.";
    });
    this.log.push(recorded);
    this.persist();
    this.pending = true;
    this.broadcast();
  }

  private broadcast() {
    if (!this.booted) return;
    this.commit(["corp", "runner"], () => {
      if (!this.online()) this.pending = false;
      this.settleEnd();
      this.emit();
      this.scheduleBot();
    });
  }

  // ---------- game actions ----------

  private online() {
    return this.lobby.role !== "local";
  }

  send(command: string, args?: unknown, side: Side = this.lobby.mySide) {
    if (this.watching) return;
    if (this.online()) {
      this.pending = true;
      this.push({ k: "act", command, args: JSON.parse(JSON.stringify(args ?? null)) });
      this.emit();
    } else this.perform({ side, kind: "act", command, args: args ?? null });
  }

  say(text: string, side: Side = this.lobby.mySide) {
    if (this.watching) return;
    if (this.online()) return this.push({ k: "say", text });
    const user = side === this.lobby.mySide ? this.lobby.myName : this.lobby.opponentName;
    this.perform({ side, kind: "say", user, text });
  }

  concede(side: Side = this.lobby.mySide) {
    if (this.watching) return;
    if (this.online()) return this.push({ k: "concede" });
    this.perform({ side, kind: "concede" });
  }

  deckFor(side: Side): Deck | undefined {
    const { role, mySide, myDeck } = this.lobby;
    const name = this.deckNames[side] ?? (side === mySide ? myDeck?.name : undefined);
    if (isGameFormat((this.setup as { format?: unknown } | undefined)?.format) && dealtFormat((this.setup as { format: GameFormat }).format)) return undefined;
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
    if (this.saveId) writeSave(this.saveId, null, this.store);
  }

  close() {
    this.closed = true;
    if (this.botTimer !== undefined) clearTimeout(this.botTimer);
    this.transport?.close();
    this.host?.dispose();
  }
}
