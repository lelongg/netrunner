import type { CardDb, EngineApi, Side } from "../engine";
import { type WireDeck, engineDeck, fromWire, toWire } from "../decks";
import type { SavedGame } from "../session";
import { type GameHost, type LocalEntry, makeHost } from "./runner";

export interface Script {
  setup: any;
  seed: number[];
  entries: LocalEntry[];
  mySide: Side;
  names: Record<Side, string>;
  deckNames: Partial<Record<Side, string>>;
  mode: "solo" | "local" | "online";
}

const other = (side: Side): Side => (side === "corp" ? "runner" : "corp");

export function scriptOf(save: SavedGame, db: CardDb): Script | null {
  if (save.v === 1) {
    const setup = save.setup as any;
    return {
      setup,
      seed: save.seed,
      entries: save.log,
      mySide: save.mySide,
      names: { corp: setup?.corp?.user?.username ?? "Corp", runner: setup?.runner?.user?.username ?? "Runner" },
      deckNames: save.deckNames ?? {},
      mode: save.vsBot ? "solo" : "local",
    };
  }
  const names: [string | undefined, string | undefined] = [undefined, undefined];
  let creatorSide: Side = "corp";
  const decks: [WireDeck | null, WireDeck | null] = [null, null];
  let start: { setup: any; seed: number[]; deckNames: Partial<Record<Side, string>> } | null = null;
  const entries: LocalEntry[] = [];
  const sideOf = (seat: 0 | 1): Side => (seat === 0 ? creatorSide : other(creatorSide));
  const deckSide = (deck: WireDeck) => db.byTitle.get(deck.identity)?.side.toLowerCase() as Side | undefined;
  for (const { seat, p } of save.entries) {
    switch (p.k) {
      case "join":
      case "name":
        names[seat] = String(p.name).slice(0, 24);
        break;
      case "side":
        if (seat !== 0 || start || (p.side !== "corp" && p.side !== "runner")) break;
        creatorSide = p.side;
        decks[0] = decks[1] = null;
        break;
      case "deck":
        if (start) break;
        decks[seat] = p.deck && deckSide(p.deck) === sideOf(seat) ? p.deck : null;
        break;
      case "start": {
        if (seat !== 0 || start || !decks[0] || !decks[1] || !Array.isArray(p.seed) || p.seed.length !== 4) break;
        const seatOf = (side: Side): 0 | 1 => (sideOf(0) === side ? 0 : 1);
        const player = (side: Side) => {
          const s = seatOf(side);
          return { user: { username: names[s] ?? (s === 0 ? "Host" : "Guest") }, deck: engineDeck(fromWire(decks[s]!, db)) };
        };
        start = {
          setup: { gameid: save.code || "online", format: "casual", corp: player("corp"), runner: player("runner") },
          seed: p.seed,
          deckNames: { corp: decks[seatOf("corp")]!.name, runner: decks[seatOf("runner")]!.name },
        };
        break;
      }
      case "act":
      case "say":
      case "concede": {
        if (!start) break;
        const side = sideOf(seat);
        entries.push(p.k === "act" ? { side, kind: "act", command: p.command, args: p.args ?? null } : p.k === "say" ? { side, kind: "say", user: names[seat], text: p.text } : { side, kind: "concede" });
        break;
      }
    }
  }
  if (!start) return null;
  return {
    setup: start.setup,
    seed: start.seed,
    entries,
    mySide: sideOf(save.role === "host" ? 0 : 1),
    names: { corp: start.setup.corp.user.username, runner: start.setup.runner.user.username },
    deckNames: start.deckNames,
    mode: "online",
  };
}

export interface Frame {
  views: Record<Side, any>;
  entry?: LocalEntry;
  turn: number;
  log: number;
  credits: Record<Side, number>;
  points: Record<Side, number>;
}

export class Replay {
  frames: Frame[] = [];
  done = false;
  private host: GameHost;
  private stopped = false;

  constructor(
    engine: EngineApi,
    readonly script: Script,
    private onProgress: () => void,
  ) {
    this.host = makeHost(engine);
    void this.build();
  }

  get total() {
    return this.script.entries.length + 1;
  }

  private push(views: Record<Side, any>, entry?: LocalEntry) {
    const v = views.corp;
    this.frames.push({
      views,
      entry,
      turn: Number(v?.turn ?? 0),
      log: (v?.log ?? []).length,
      credits: { corp: Number(v?.corp?.credit ?? 0), runner: Number(v?.runner?.credit ?? 0) },
      points: { corp: Number(v?.corp?.["agenda-point"] ?? 0), runner: Number(v?.runner?.["agenda-point"] ?? 0) },
    });
  }

  private async build() {
    const sides: Side[] = ["corp", "runner"];
    const first = await this.host.run([{ k: "boot", setup: this.script.setup, seed: this.script.seed }], sides);
    this.push(first.views as Record<Side, any>);
    this.onProgress();
    let last = performance.now();
    for (const entry of this.script.entries) {
      if (this.stopped) return;
      const result = await this.host.run([{ k: "exec", entry }], sides);
      this.push(result.views as Record<Side, any>, entry);
      if (performance.now() - last > 120) {
        last = performance.now();
        this.onProgress();
      }
    }
    this.done = true;
    this.onProgress();
  }

  dispose() {
    this.stopped = true;
    this.host.dispose();
  }
}

export interface SharedGame {
  v: 1;
  mode: Script["mode"];
  names: Record<Side, string>;
  deckNames: Partial<Record<Side, string>>;
  mySide: Side;
  decks: Record<Side, WireDeck>;
  seed: number[];
  entries: LocalEntry[];
  winner?: Side;
  points: Record<Side, number>;
  turn: number;
  endedAt: number;
}

export function shareOf(script: Script, result: { winner?: Side; points: Record<Side, number>; turn: number; endedAt: number }): SharedGame {
  const wire = (side: Side) => toWire({ name: script.deckNames[side] ?? `${side} deck`, ...script.setup[side].deck });
  return { v: 1, mode: script.mode, names: script.names, deckNames: script.deckNames, mySide: script.mySide, decks: { corp: wire("corp"), runner: wire("runner") }, seed: script.seed, entries: script.entries, ...result };
}

export function scriptOfShared(game: SharedGame, db: CardDb): Script {
  const player = (side: Side) => ({ user: { username: game.names[side] }, deck: engineDeck(fromWire(game.decks[side], db)) });
  return {
    setup: { gameid: "replay", format: "casual", corp: player("corp"), runner: player("runner") },
    seed: game.seed,
    entries: game.entries,
    mySide: game.mySide,
    names: game.names,
    deckNames: game.deckNames,
    mode: game.mode,
  };
}
