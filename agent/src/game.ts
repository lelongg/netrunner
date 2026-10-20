import type { Card, CardDb, EngineApi, Side } from "../../mobile/src/engine";
import { type SavedGame, Session, listSaves, loadSave } from "../../mobile/src/session";
import { type Script, type SharedGame, scriptOf, scriptOfShared } from "../../mobile/src/game/replay";
import { makeHost } from "../../mobile/src/game/runner";
import { type Store, browserStore } from "../../mobile/src/store";
import { basicCommands, cardCommands, cardRef, currentIce, findCard, promptOf, runCommands } from "../../mobile/src/game/actions";
import { type WireDeck, fromPrecon, importNrdb, toWire } from "../../mobile/src/decks";
import { relayUrl, storeTicket } from "../../mobile/src/net/relay";
import { FORMATS, GAME_FORMATS, type FormatKey, type GameFormat, analyze, dealtFormat, deckFormat } from "../../mobile/src/deckrules";

const FACE_INDEX: Record<string, number> = { back: 0, brewery: 0, tank: 1, greenhouse: 2, tenure: 0, subsurface: 1, disposal: 2 };

export interface Loaded {
  engine: EngineApi;
  db: CardDb;
}

export async function loadEngine(base: string, preloaded?: EngineApi): Promise<Loaded> {
  const engine: EngineApi = preloaded ?? (await import(new URL("./engine.mjs", import.meta.url).href));
  const get = async (path: string) => {
    const res = await fetch(new URL(path, base));
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.text();
  };
  const [cardsText, codesText, messages, ui] = await Promise.all([get("data/cards.json"), get("data/codes.json"), get("i18n/en/messages.ftl"), get("i18n/en/ui.ftl")]);
  const cards = JSON.parse(cardsText) as Card[];
  const codes = JSON.parse(codesText) as Record<string, string>;
  engine.loadCards(cards);
  engine.loadDictionary("en", messages + "\n" + ui);
  engine.setLanguage("en");
  const byTitle = new Map(cards.map((c) => [c.title, c]));
  const byCode = new Map<string, Card>();
  for (const [code, title] of Object.entries(codes)) {
    const card = byTitle.get(title);
    if (card) byCode.set(code, card);
  }
  return { engine, db: { byTitle, byCode, all: cards } };
}

interface Action {
  id: number;
  label: string;
  group?: string;
  short?: string;
  command: string;
  args?: unknown;
  amount?: { min: number; max: number };
  text?: boolean;
  say?: string;
  check?: boolean;
}

const other = (s: Side): Side => (s === "corp" ? "runner" : "corp");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shuffle = <T>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const SERVER_NAMES: Record<string, string> = { hq: "HQ", rd: "R&D", archives: "Archives" };
const serverName = (key: string) => SERVER_NAMES[key] ?? (key.startsWith("remote") ? `Server ${key.slice(6)}` : key);

function remoteKeys(servers: Record<string, any>) {
  return Object.keys(servers ?? {})
    .filter((k) => k.startsWith("remote"))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
}

const runnerPassed = (view: any) => (view.encounters ?? view.run)?.["no-action"] === "runner";

function corpDecision(view: any) {
  if (!view?.run || !runnerPassed(view)) return false;
  if (runCommands(view, "corp").some((c) => c.enabled !== false && (c.command === "rez" || c.command === "unbroken-subroutines"))) return true;
  if (view.encounters || view.run.position !== 0) return false;
  const server = view.corp?.servers?.[view.run.server?.[0]];
  return (server?.content ?? []).some((c: any) => !c.rezzed && (c.type === "Upgrade" || c.type === "Asset"));
}

function canAct(view: any, side: Side) {
  if (!view || view.winner) return false;
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  if (prompt && ptype !== "waiting" && ptype !== "run") return true;
  if (prompt && ptype === "waiting") return false;
  if (view.run || view.encounters) {
    if (side === "corp") return corpDecision(view);
    return runCommands(view, side).some((c) => c.enabled !== false && c.command !== "toggle-auto-no-action");
  }
  return basicCommands(view, side).some((c) => c.enabled !== false && c.command !== "toggle-auto-no-action");
}

export class Agent {
  session?: Session;
  private actions: Action[] = [];
  private stamp = "";
  private waitingSince = 0;
  private waits = 0;
  private linkGiven = "";
  private installing?: any;
  private unsubscribe?: () => void;

  constructor(
    private loaded: Loaded,
    private store: Store = browserStore(),
  ) {}

  private get engine() {
    return this.loaded.engine;
  }

  private get db() {
    return this.loaded.db;
  }

  private render = (m: unknown) => {
    try {
      return this.engine.renderMessage(m).replace(/\[(?:their|pronoun)\]/g, "their").replace(/\[(they|them|theirs|themself)\]/g, "$1");
    } catch {
      return String(m ?? "");
    }
  };

  private attach(session: Session) {
    this.unsubscribe?.();
    this.session?.close();
    this.session = session;
    this.installing = undefined;
    this.wantReady = false;
    this.readyFor = "";
    this.ids.clear();
    this.idsCode = "";
    this.unsubscribe = session.subscribe(() => {
      this.autoPass();
      this.autoStart();
      this.autoReady();
    });
  }

  private starting = false;

  private wantReady = false;
  private readyFor = "";

  private autoReady() {
    const s = this.session;
    if (!s || s.lobby.role !== "guest" || s.lobby.started || s.lobby.ready || !this.wantReady) return;
    const key = `${s.lobby.format}:${s.lobby.myDeck?.name ?? ""}`;
    if (this.readyFor === key) return;
    if (!dealtFormat(s.lobby.format) && (!s.lobby.myDeck || s.deckProblem(s.lobby.myDeck))) return;
    this.readyFor = key;
    setTimeout(() => this.session === s && !s.lobby.ready && s.setReady(true), 300);
  }

  private autoStart() {
    const s = this.session;
    if (!s || s.lobby.role !== "host" || s.lobby.started || this.starting || !s.canStart) return;
    this.starting = true;
    setTimeout(() => {
      if (this.session === s && s.canStart) s.start();
      this.starting = false;
    }, 300);
  }



  private passTimer?: ReturnType<typeof setTimeout>;

  private passKey() {
    const s = this.session;
    const view = s?.views.corp;
    if (!s || s.pending || s.lobby.mySide !== "corp" || !view || view.winner || !(view.run || view.encounters) || !runnerPassed(view) || corpDecision(view)) return null;
    if ((promptOf(view, "corp")?.["prompt-type"] ?? "run") !== "run") return null;
    if (!runCommands(view, "corp").some((c) => c.command === "continue" && c.enabled !== false)) return null;
    return `${(view.log ?? []).length}:${view.run?.phase}:${view.run?.position}:${view.encounters ? 1 : 0}`;
  }

  private autoPass() {
    if (this.passTimer) return;
    const key = this.passKey();
    if (!key) return;
    this.passTimer = setTimeout(() => {
      this.passTimer = undefined;
      if (this.passKey() === key) this.session!.send("continue");
    }, 50);
  }


  private async settleLobby(ms = 15000) {
    const s = this.session!;
    const end = Date.now() + ms;
    while (Date.now() < end && (s.lobby.status === "connecting" || !s.lobby.code) && !s.lobby.error) await sleep(200);
    await sleep(600);
  }

  async join(code: string, name: string, deck?: string, rejoinKey?: string) {
    const upper = code.trim().toUpperCase();
    if (rejoinKey) {
      const m = rejoinKey.trim().match(/^([A-Z2-9]{5})\.([01])\.(\S+)$/);
      if (!m || m[1] !== upper) throw new Error("That rejoin key does not belong to this game.");
      storeTicket({ code: upper, seat: Number(m[2]) as 0 | 1, token: m[3] }, this.store);
    }
    const save = loadSave(upper, this.store);
    this.attach(save ? Session.resume(this.engine, this.db, save, this.store) : new Session(this.engine, this.db, "guest", upper, name, undefined, [], this.store));
    if (!save) this.session!.setName(name);
    await this.settleLobby();
    const s = this.session!;
    if (!s.lobby.started) {
      const end = Date.now() + 10000;
      while (Date.now() < end && !s.lobby.opponentName) await sleep(200);
      await sleep(500);
      if (dealtFormat(s.lobby.format)) {
        this.wantReady = true;
        s.setReady(true);
        await sleep(800);
      } else if (deck) return this.chooseDeck(deck);
    }
    return this.describe();
  }

  async host(name: string, side: Side, deck: string | undefined, format: GameFormat = "casual") {
    if (!GAME_FORMATS.some((f) => f.key === format)) throw new Error(`Unknown format "${format}". Formats: ${GAME_FORMATS.map((f) => f.key).join(", ")}.`);
    if (!deck && !dealtFormat(format)) throw new Error(`Give a deck: in ${format} you play your own deck.`);
    const wire = deck && !dealtFormat(format) ? await this.resolveDeck(deck, side, format) : undefined;
    this.attach(new Session(this.engine, this.db, "host", undefined, name, side, [], this.store));
    await this.settleLobby();
    const s = this.session!;
    s.setSide(side);
    await sleep(500);
    s.setFormat(format);
    await sleep(500);
    if (wire) {
      const problem = s.deckProblem(wire);
      if (problem) throw new Error(`${wire.name} is not legal in ${format}: ${problem}. Pick another deck with choose_deck.`);
      s.setDeck(wire);
      await sleep(300);
    }
    return this.describe();
  }

  private requireSession() {
    if (!this.session) throw new Error("Not in a game. Use join_game or host_game first. If you were in the middle of a game, this server lost its session: call join_game with the game code and your rejoin key.");
    return this.session;
  }

  decks(side?: Side, format?: FormatKey) {
    const s = this.session;
    const want = side ?? s?.lobby.mySide;
    const lines: string[] = [];
    for (const m of shuffle(this.engine.precons() as any[])) {
      for (const sd of ["corp", "runner"] as Side[]) {
        if (want && sd !== want) continue;
        const d = m[sd];
        let legal = "";
        if (format) {
          try {
            legal = analyze(fromPrecon(d, this.db), format).legal ? ` · legal in ${format}` : ` · not legal in ${format}`;
          } catch {}
        }
        lines.push(`- ${d.name} (${m.title}) · ${sd} · identity: ${d.identity}${legal}`);
      }
    }
    return `Preconstructed decks${want ? ` for the ${want}` : ""}:\n${lines.join("\n")}\n\nchoose_deck also accepts a NetrunnerDB deck or decklist URL; find_decks lists recent community decklists legal in a format.`;
  }

  private async indexedItems(side: Side, format: FormatKey) {
    const base = relayUrl();
    if (!base) return null;
    const pages = await Promise.all(
      ["1", "2", "3"].map((page) =>
        fetch(`${base}/decklists?${new URLSearchParams({ side, format, page })}`)
          .then((res) => (res.ok ? (res.json() as Promise<{ items: any[] }>) : null))
          .catch(() => null),
      ),
    );
    if (!pages[0]) return null;
    return shuffle(pages.flatMap((p) => p?.items ?? []));
  }

  private async indexedDecks(side: Side, format: FormatKey) {
    const items = await this.indexedItems(side, format);
    return items?.slice(0, 15).map((d) => `- ${d.name} · ${this.db.byCode.get(String(d.identity))?.title ?? "?"} · ${String(d.created).slice(0, 10)} · https://netrunnerdb.com/en/decklist/${d.id}`) ?? null;
  }

  private async randomDeck(side: Side, format: GameFormat): Promise<WireDeck> {
    const key = deckFormat(format);
    if (key && key !== "casual") {
      for (const d of ((await this.indexedItems(side, key)) ?? []).slice(0, 4)) {
        try {
          const deck = await importNrdb(`https://netrunnerdb.com/en/decklist/${d.id}`, side, this.db);
          if (analyze(deck, key).legal) return toWire(deck);
        } catch {}
      }
    }
    const precons = shuffle((this.engine.precons() as any[]).map((m) => ({ ...m[side], name: `${m[side].name} (${m.title})` })));
    const fits = precons.find((d) => {
      const deck = fromPrecon(d, this.db);
      return !key || key === "casual" || analyze(deck, key).legal;
    });
    if (!fits) throw new Error(`No ${side} deck legal in ${format} could be found. Pick one with find_decks or list_decks.`);
    return toWire(fromPrecon(fits, this.db));
  }

  async findDecks(side: Side, format: FormatKey, days = 21) {
    if (!FORMATS.some((f) => f.key === format)) throw new Error(`Unknown format "${format}". Formats: ${FORMATS.map((f) => f.key).join(", ")}.`);
    const indexed = await this.indexedDecks(side, format);
    if (indexed?.length) return `Recent NetrunnerDB ${side} decklists legal in ${format} (newest first):\n${indexed.join("\n")}\n\nPass one of these URLs as the deck to host_game, join_game or choose_deck.`;
    const span = Math.max(1, Math.min(30, Math.round(days)));
    const dates = Array.from({ length: span }, (_, i) => new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
    const found: string[] = [];
    for (let i = 0; i < dates.length && found.length < 15; i += 6) {
      const pages = await Promise.all(
        dates.slice(i, i + 6).map((d) =>
          fetch(`https://netrunnerdb.com/api/2.0/public/decklists/by_date/${d}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      for (const page of pages as any[]) {
        for (const list of page?.data ?? []) {
          const cards = Object.entries<number>(list.cards ?? {}).flatMap(([code, qty]) => {
            const card = this.db.byCode.get(code);
            return card ? [{ card, qty }] : [];
          });
          const identity = cards.find((e) => e.card.type === "Identity")?.card;
          if (!identity || String(identity.side).toLowerCase() !== side) continue;
          const deck = { name: String(list.name ?? "Decklist"), identity, cards: cards.filter((e) => e.card.type !== "Identity") };
          if (!analyze(deck, format).legal) continue;
          found.push(`- ${deck.name} · ${identity.title} · ${String(list.date_creation ?? "").slice(0, 10)} · https://netrunnerdb.com/en/decklist/${list.id}`);
          if (found.length >= 15) break;
        }
      }
    }
    if (!found.length) return `No ${side} decklist legal in ${format} was published on NetrunnerDB in the last ${span} days. Try more days, another format, or list_decks for the preconstructed decks.`;
    return `Recent NetrunnerDB ${side} decklists legal in ${format} (newest first):\n${shuffle(found).slice(0, 15).join("\n")}\n\nPass one of these URLs as the deck to host_game, join_game or choose_deck.`;
  }

  private async resolveDeck(nameOrUrl: string, side: Side, format: GameFormat): Promise<WireDeck> {
    if (/^\s*random\s*$/i.test(nameOrUrl)) return this.randomDeck(side, format);
    if (/netrunnerdb\.com/.test(nameOrUrl)) return toWire(await importNrdb(nameOrUrl, side, this.db));
    const wanted = nameOrUrl.trim().toLowerCase();
    for (const m of this.engine.precons() as any[]) {
      const d = m[side];
      const label = `${d.name} (${m.title})`;
      if (label.toLowerCase() === wanted || d.name.toLowerCase() === wanted || label.toLowerCase().includes(wanted)) return toWire(fromPrecon({ ...d, name: label }, this.db));
    }
    throw new Error(`No ${side} deck matches "${nameOrUrl}".\n\n${this.decks(side)}`);
  }

  async chooseDeck(nameOrUrl: string) {
    const s = this.requireSession();
    if (s.lobby.started) throw new Error("The game has already started.");
    if (dealtFormat(s.lobby.format)) throw new Error(`No deck to pick in ${s.lobby.format}: decks are dealt when the game starts.`);
    const deck = await this.resolveDeck(nameOrUrl, s.lobby.mySide, s.lobby.format);
    const problem = s.deckProblem(deck);
    if (problem) throw new Error(`${deck.name} is not legal in ${s.lobby.format}: ${problem}. Pick another deck.`);
    s.setDeck(deck);
    if (s.lobby.role === "guest") {
      await sleep(300);
      this.wantReady = true;
      s.setReady(true);
    }
    await sleep(800);
    return this.describe();
  }

  async setSide(side: Side) {
    const s = this.requireSession();
    if (s.lobby.role !== "host") throw new Error("Only the host picks sides.");
    s.setSide(side);
    await sleep(800);
    return this.describe();
  }

  async start() {
    const s = this.requireSession();
    if (!s.canStart) throw new Error("The game cannot start yet: both players need a deck for their side and the guest must be ready.");
    s.start();
    const end = Date.now() + 15000;
    while (Date.now() < end && !s.views[s.lobby.mySide]) await sleep(200);
    return this.describe();
  }

  private lobbyText() {
    const s = this.session!;
    const l = s.lobby;
    const lines = [
      `Game ${l.code || "(creating…)"} · you are ${l.myName}, ${l.role === "host" ? "host" : "guest"}, playing ${l.mySide}`,
      `Link: ${l.status}${l.error ? ` · error: ${l.error}` : ""}`,
      `Opponent: ${l.opponentName ?? "not joined yet"}${l.opponentName ? ` · deck ${l.opponentDeckReady ? "ready" : "not ready"}` : ""}`,
      `Format: ${l.format}`,
      `Your deck: ${dealtFormat(l.format) ? (l.format === "chimera" ? "dealt at random when the game starts" : "drafted when the game starts") : l.myDeck ? `${l.myDeck.name}${s.deckProblem(l.myDeck) ? ` (not legal in ${l.format}: ${s.deckProblem(l.myDeck)}; pick another with choose_deck)` : ""}` : "none (use list_decks or find_decks, then choose_deck)"}`,
    ];
    if (l.role === "host") lines.push(s.canStart ? "Starting the game…" : "The game starts by itself as soon as the human has joined, picked a deck and pressed Ready. Write the code and the link below to the human now, then call wait_for_turn right away in the same turn, without waiting for a reply.");
    else lines.push(l.myDeck ? "You are ready; the host starts the game." : "Pick a deck to be ready.");
    if (l.role === "host" && l.code) lines.unshift(`Join link for the human: ${this.joinLink()} (code ${l.code}). They only see what you write in your message, never tool results, so copy this link into your reply.`);
    return this.rejoinLine() + lines.join("\n");
  }

  private rejoinLine() {
    const t = this.session?.seatTicket;
    return t ? `Rejoin key: ${t.code}.${t.seat}.${t.token} (private, never write it to the human; if a call ever says you are not in a game, call join_game with the code and this key)\n` : "";
  }

  private joinLink() {
    return `${(globalThis as any).location.origin}${(globalThis as any).location.pathname}?join=${this.session!.lobby.code}`;
  }

  private cardLine(c: any, viewer: Side): string {
    if (!c) return "?";
    const known = c.title && (c.side?.toLowerCase() === viewer || c.rezzed || c.seen || c.side === "Runner");
    if (!known) return c.type === "ICE" || c.zone?.[2] === "ices" ? "unrezzed ice" : "facedown card";
    const bits: string[] = [];
    if (c.type) bits.push(c.type + (c.subtypes?.length ? ` (${c.subtypes.join(", ")})` : ""));
    if (c.side === "Corp" && c.zone?.[0] === "servers" && !c.rezzed) bits.push("unrezzed");
    const str = c["current-strength"] ?? c.strength;
    if ((c.type === "ICE" || (c.subtypes ?? []).includes("Icebreaker")) && str != null) bits.push(`str ${str}`);
    const adv = (c["advance-counter"] ?? 0) + (c["extra-advance-counter"] ?? 0);
    if (adv) bits.push(`${adv} advancement`);
    if (c.advancementcost && c.type === "Agenda") bits.push(`needs ${c["current-advancement-requirement"] ?? c.advancementcost}`);
    for (const [k, v] of Object.entries<any>(c.counter ?? {})) if (v) bits.push(`${v} ${k} counters`);
    if (c["rec-counter"]) bits.push(`${c["rec-counter"]} recurring credits`);
    if (c.hosted?.length) bits.push(`hosting: ${c.hosted.map((h: any) => this.cardLine(h, viewer)).join(", ")}`);
    return `${c.title}${bits.length ? ` [${bits.join(", ")}]` : ""}`;
  }

  private gameLines(): [string, string][] {
    const s = this.session!;
    const side = s.lobby.mySide;
    const opp = other(side);
    const view = s.views[side];
    const L: [string, string][] = [];
    const name = (sd: Side) => view[sd]?.user?.username ?? sd;
    if (view.winner) L.push(["over", `GAME OVER: ${view.winner} (${name(view.winner)}) wins${view.reason ? ` by ${view.reason}` : ""}.`]);
    L.push(["turn", `Turn ${view.turn ?? 0} · active: ${view["active-player"]} · you are the ${side.toUpperCase()} (${name(side)}) vs ${name(opp)}`]);
    const pts = (p: any) => `${p["agenda-point"] ?? 0}/${p["agenda-point-req"] ?? 7} points`;
    const stats = (p: any, sd: Side) => {
      const out = [`${p.credit ?? 0} credits`, `${p.click ?? 0} clicks`, pts(p), `${p["hand-count"] ?? (p.hand ?? []).length} cards in ${sd === "corp" ? "HQ" : "grip"}`, `${p["deck-count"] ?? 0} in ${sd === "corp" ? "R&D" : "stack"}`];
      if (sd === "runner") {
        if (p.memory) out.push(`MU ${p.memory.used ?? 0}/${p.memory.available ?? 0}`);
        out.push(`${p.tag?.total ?? 0} tags`);
        if (p.link) out.push(`link ${p.link}`);
        if (p["brain-damage"]) out.push(`${p["brain-damage"]} core damage`);
      } else {
        const bp = (p["bad-publicity"]?.base ?? 0) + (p["bad-publicity"]?.additional ?? 0);
        if (bp) out.push(`${bp} bad publicity`);
      }
      return out.join(" · ");
    };
    const area = (sd: Side, who: string, prefix: string) => {
      const p = view[sd] ?? {};
      const out: [string, string][] = [];
      if (p.identity?.title) {
        const i = p.identity.face ? FACE_INDEX[String(p.identity.face)] : undefined;
        const face = i == null ? undefined : (this.db.byTitle.get(p.identity.title) as any)?.["face-texts"]?.[i];
        out.push([`${prefix}.id`, face ? `${who} identity: ${p.identity.title}, flipped to ${face.title} (${face.text.replace(/\n/g, " ")})` : `${who} identity: ${p.identity.title}`]);
      }
      if (sd === "corp") {
        for (const key of ["hq", "rd", "archives", ...remoteKeys(p.servers)]) {
          const srv = p.servers?.[key];
          if (!srv) continue;
          const ices: any[] = srv.ices ?? [];
          const content: any[] = srv.content ?? [];
          if (!ices.length && !content.length && key.startsWith("remote")) continue;
          const iceText = ices.length ? `ice (outermost first) ${[...ices].reverse().map((c) => this.cardLine(c, side)).join(" > ")}` : "no ice";
          out.push([`${prefix}.${key}`, `${who} ${serverName(key)}: ${iceText}${content.length ? ` | in root: ${content.map((c) => this.cardLine(c, side)).join(", ")}` : ""}`]);
        }
      } else {
        let any = false;
        for (const k of ["program", "hardware", "resource", "facedown"]) {
          const cards: any[] = p.rig?.[k] ?? [];
          if (cards.length) any = true;
          out.push([`${prefix}.${k}`, cards.length ? `${who} ${k}s: ${cards.map((c) => this.cardLine(c, side)).join(", ")}` : ""]);
        }
        if (!any) out.push([`${prefix}.rig`, `${who} rig: nothing installed`]);
      }
      const scored: any[] = p.scored ?? [];
      out.push([`${prefix}.scored`, scored.length ? `${who} scored agendas: ${scored.map((c) => `${c.title} (${c["agendapoints"] ?? "?"} pts)`).join(", ")}` : ""]);
      const discard: any[] = p.discard ?? [];
      const total = Math.max(discard.length, Number(p["discard-count"] ?? 0));
      const titles = discard.filter((c) => c.title).map((c) => c.title);
      const hidden = total - titles.length;
      out.push([`${prefix}.discard`, total ? `${who} ${sd === "corp" ? "Archives discard pile" : "heap"}: ${[...titles, ...(hidden ? [`${hidden} facedown`] : [])].join(", ")}` : ""]);
      const current: any[] = p.current ?? [];
      out.push([`${prefix}.current`, current.length ? `${who} current: ${current.map((c) => c.title).join(", ")}` : ""]);
      return out;
    };
    const me = view[side] ?? {};
    L.push(["me", `You (${side}): ${stats(me, side)}`]);
    const hand: any[] = me.hand ?? [];
    L.push(["hand", `Your hand: ${hand.length ? hand.map((c) => `${c.title} [${c.type}${c.cost != null ? `, cost ${c.cost}` : ""}]`).join("; ") : "empty"}`]);
    L.push(...area(side, "Your", "mine"));
    L.push(["opp", `Opponent (${opp}): ${stats(view[opp] ?? {}, opp)}`]);
    L.push(...area(opp, "Their", "theirs"));
    if (view.run) {
      const run = view.run;
      L.push(["run", `RUN on ${serverName(run.server?.[0] ?? "")} · phase ${run.phase} · position ${run.position}`]);
      const ice = currentIce(view);
      if (ice) {
        L.push(["run.ice", `Current ice: ${this.cardLine(ice, side)}`]);
        if (ice.rezzed)
          (ice.subroutines ?? []).forEach((sub: any, i: number) => {
            const by = sub.broken && sub.breaker != null ? findCard(view, sub.breaker)?.title : undefined;
            L.push([`run.sub${i}`, `  subroutine: ${this.render(sub.label)} — ${sub.broken ? `broken${by ? ` by ${by}` : ""}` : sub.fired ? "fired" : sub.resolve === false ? "will not fire" : "unbroken"}`]);
          });
      }
    }
    const prompt = promptOf(view, side);
    if (prompt) L.push(["prompt", `PROMPT (${prompt["prompt-type"] ?? "other"}): ${this.render(prompt.msg)}${prompt.card?.title ? ` — from ${prompt.card.title}` : ""}`]);
    if (s.actionError) L.push(["error", `LAST ACTION FAILED: ${s.actionError}`]);
    return L.filter(([, t]) => t);
  }

  private logLines(): string[] {
    const view = this.session!.views[this.session!.lobby.mySide];
    return (view?.log ?? []).map((e: any) => (e.user === "__system__" ? this.render(e.text) : `${e.user?.username ?? "?"} says: ${this.render(e.text)}`));
  }

  private buildActions(): Omit<Action, "id">[] {
    const s = this.session!;
    const side = s.lobby.mySide;
    const view = s.views[side];
    if (!view || view.winner) return [];
    const out: Omit<Action, "id">[] = [];
    const seen = new Set<string>();
    const push = (a: Omit<Action, "id">) => {
      const key = JSON.stringify([a.command, a.args, a.say]);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(a);
    };
    const prompt = promptOf(view, side);
    const ptype = prompt?.["prompt-type"];
    const me = view[side] ?? {};
    if (prompt && ptype !== "run" && ptype !== "waiting") {
      const eid = prompt.eid;
      const choices = prompt.choices;
      if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.number != null)
        push({ label: `Choose a number`, command: "choice", args: { eid }, amount: { min: Number(choices.minimum ?? 0), max: Number(choices.number) } });
      else if (ptype === "trace") push({ label: `Spend credits on the trace`, command: "choice", args: { eid }, amount: { min: 0, max: Number(choices ?? 0) } });
      else if (choices === "credit") push({ label: `Choose an amount of credits`, command: "choice", args: { eid }, amount: { min: 0, max: Number(me.credit ?? 0) } });
      else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices["card-title"] !== undefined) push({ label: `Name a card`, command: "choice", args: { eid }, text: true });
      else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.counter) {
        const card = findCard(view, prompt.card?.cid);
        push({ label: `Choose a number of ${choices.counter} counters`, command: "choice", args: { eid }, amount: { min: 0, max: Number(card?.counter?.[choices.counter] ?? 0) } });
      } else if (Array.isArray(choices)) {
        for (const cid of prompt.selectable ?? []) {
          const card = findCard(view, cid);
          if (card) push({ label: `Select ${this.cardLine(card, side)}${card.zone ? ` (${card.zone.join(" ")})` : ""}`, command: "select", args: { card: cardRef(card), eid } });
        }
        for (const c of choices) {
          if (c.value === "Hide") continue;
          const label = c.value && typeof c.value === "object" ? c.value.title ?? this.render(c.value) : this.render(c.value);
          push({ label: ptype === "select" ? `${label} (finish selecting)` : `Choose: ${label}`, command: "choice", args: { eid, choice: { uuid: c.uuid } } });
        }
        if (ptype === "select" && !(prompt.selectable ?? []).length && choices.every((c: any) => c.value === "Hide")) push({ label: "Close the prompt (no valid target)", command: "say", say: "/close-prompt" });
      }
      return out;
    }
    const inRun = !!(view.run || view.encounters);
    const base = inRun ? runCommands(view, side) : basicCommands(view, side);
    for (const c of base) {
      if (c.enabled === false || c.command === "toggle-auto-no-action") continue;
      if (c.command === "generate-runnable-zones") {
        const corp = view.corp ?? {};
        for (const key of ["hq", "rd", "archives", ...remoteKeys(corp.servers)]) push({ label: `Run on ${serverName(key)}`, group: "Run on", short: serverName(key), command: "run", args: { server: serverName(key) } });
        continue;
      }
      push({ label: this.render(c.label), command: c.command, args: c.args, check: !!c.check });
    }
    const cards: any[] = [];
    const collect = (x: any) => {
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) return x.forEach(collect);
      if (x.cid && x.title) cards.push(x);
      for (const k of ["hand", "servers", "ices", "content", "rig", "program", "hardware", "resource", "facedown", "hosted", "identity", "current", "scored", "play-area", "discard", "hq", "rd", "archives"]) if (k in x) collect(x[k]);
      if (x.servers) for (const v of Object.values(x.servers)) collect(v);
    };
    collect(view[side]);
    collect(view[other(side)]);
    for (const card of cards) {
      for (const c of cardCommands(card, view, side)) {
        if (c.enabled === false || c.command === "select" || c.command === "choice") continue;
        if (c.command === "generate-install-list") {
          const servers = view.corp?.servers ?? {};
          const remotes = remoteKeys(servers).map(serverName);
          const targets = card.type === "ICE" || card.type === "Upgrade" ? ["HQ", "R&D", "Archives", ...remotes, "New remote"] : [...remotes, "New remote"];
          for (const t of targets) push({ label: `Install ${card.title} in ${t}`, group: `Install ${card.title} in`, short: t, command: "play", args: { card: cardRef(card), server: t } });
          continue;
        }
        push({ label: `${card.title}: ${this.render(c.label)}`, command: c.command, args: c.args, check: !!c.check });
      }
    }
    return out;
  }

  private async legal(): Promise<Omit<Action, "id">[]> {
    const s = this.session!;
    const all = this.buildActions();
    const checked = all.filter((a) => a.check);
    if (!checked.length) return all;
    const results = await s.probe(
      s.lobby.mySide,
      checked.map((a) => ({ k: "try", command: a.command, args: a.args ?? null })),
    );
    const refused = new Set(checked.filter((_, i) => !results[i]?.ok));
    return all.filter((a) => !refused.has(a)).map(({ check, ...a }) => a);
  }

  private async numbered(): Promise<Action[]> {
    const code = this.session?.lobby.code ?? "";
    if (code !== this.idsCode) {
      this.ids.clear();
      this.idsCode = code;
      this.nextId = Number(code && this.store.getItem(`pocket-rig:agent-ids:${code}`)) || 1;
    }
    const first = this.nextId;
    const actions = (await this.legal()).map((a) => ({ ...a, id: this.idFor(a) }));
    if (code && this.nextId !== first) this.store.setItem(`pocket-rig:agent-ids:${code}`, String(this.nextId));
    return actions;
  }

  private ids = new Map<string, number>();
  private idsCode = "";
  private nextId = 1;

  private idFor(a: Omit<Action, "id">) {
    const key = JSON.stringify([a.label, a.command, a.args ?? null, a.say ?? null]);
    let id = this.ids.get(key);
    if (id === undefined) {
      id = this.nextId++;
      this.ids.set(key, id);
    }
    return id;
  }

  private seen = new Map<string, string>();
  private logSeen = 0;

  private async actionsText() {
    const s = this.session!;
    const view = s.views[s.lobby.mySide];
    this.actions = await this.numbered();
    this.stamp = this.stampOf();
    const rows: string[] = [];
    for (let i = 0; i < this.actions.length; i++) {
      const a = this.actions[i];
      if (a.group) {
        const same = [a];
        while (this.actions[i + 1]?.group === a.group) same.push(this.actions[++i]);
        rows.push(`  ${a.group}: ${same.map((x) => `${x.id} ${x.short}`).join(" · ")}`);
      } else rows.push(`  ${a.id}. ${a.label}${a.amount ? ` (amount ${a.amount.min}-${a.amount.max})` : ""}${a.text ? " (text)" : ""}`);
    }
    const list = rows.length ? rows.join("\n") : "  (none)";
    const status = view.winner ? "" : canAct(view, s.lobby.mySide) ? "\n\nIt is your decision. Pick one action id with act." : "\n\nNothing to decide right now: call wait_for_turn.";
    return `ACTIONS:\n${list}${status}`;
  }

  private remember(lines: [string, string][]) {
    this.seen = new Map(lines);
    this.logSeen = this.logLines().length;
  }

  async describe() {
    const s = this.session;
    if (!s) return "Not in a game. Use join_game with a game code, or host_game. If you were in the middle of a game, this server lost its session: call join_game with the game code and your rejoin key.";
    if (!s.lobby.started || !s.views[s.lobby.mySide]) return this.lobbyText();
    const lines = this.gameLines();
    const recent = this.logLines()
      .filter((t) => t && !/^\s*\[hr\]\s*$/i.test(t))
      .slice(-12);
    this.remember(lines);
    return `${this.rejoinLine()}${lines.map(([, t]) => t).join("\n")}\n\nRecent log:\n${recent.map((t) => `  ${t}`).join("\n")}\n\n${await this.actionsText()}`;
  }

  async update() {
    const s = this.session;
    if (!s || !s.lobby.started || !s.views[s.lobby.mySide] || !this.seen.size) return this.describe();
    const lines = this.gameLines();
    const log = this.logLines();
    const fresh = log.slice(this.logSeen).filter((t) => t && !/^\s*\[hr\]\s*$/i.test(t));
    const sticky = (k: string) => k === "turn" || k === "over" || k === "prompt" || k === "error" || k.startsWith("run");
    const now = new Map(lines);
    const changed = lines.filter(([k, t]) => sticky(k) || this.seen.get(k) !== t).map(([, t]) => t);
    const gone = [...this.seen.keys()].filter((k) => !now.has(k) && !k.startsWith("run") && k !== "prompt" && k !== "error").map((k) => `${this.seen.get(k)!.split(":")[0]}: (now empty)`);
    this.remember(lines);
    const parts = [];
    if (fresh.length) parts.push(`New in the log:\n${fresh.slice(-30).map((t) => `  ${t}`).join("\n")}`);
    parts.push(`Now (only what changed; get_state shows everything):\n${[...changed, ...gone].join("\n")}`);
    parts.push(await this.actionsText());
    return parts.join("\n\n");
  }

  private stampOf() {
    const s = this.session!;
    const view = s.views[s.lobby.mySide];
    return `${(view?.log ?? []).length}:${promptOf(view, s.lobby.mySide)?.eid?.eid ?? ""}:${view?.run?.phase ?? ""}:${view?.["active-player"]}`;
  }

  async act(id: number, amount?: number, text?: string) {
    const s = this.requireSession();
    if (!s.lobby.started) throw new Error("The game has not started.");
    this.waitingSince = 0;
    if (this.stampOf() !== this.stamp) {
      return `The game changed since you listed actions; nothing was done.\n\n${await this.update()}`;
    }
    const a = this.actions.find((x) => x.id === id);
    if (!a) return `Action ${id} is not available any more; nothing was done.\n\n${await this.update()}`;
    s.clearActionError();
    const before = JSON.stringify(s.views[s.lobby.mySide] ?? null);
    if (a.say) s.say(a.say);
    else {
      let args: any = a.args;
      if (a.amount) {
        if (amount == null || amount < a.amount.min || amount > a.amount.max) throw new Error(`Action ${id} needs an amount between ${a.amount.min} and ${a.amount.max}.`);
        args = { ...args, choice: amount };
      }
      if (a.text) {
        if (!text) throw new Error(`Action ${id} needs a text value.`);
        args = { ...args, choice: text };
      }
      s.send(a.command, args);
    }
    const end = Date.now() + 10000;
    await sleep(150);
    while (s.pending && Date.now() < end) await sleep(100);
    await sleep(250);
    const after = JSON.stringify(s.views[s.lobby.mySide] ?? null);
    const note = s.actionError ? `The engine rejected that action: ${s.actionError}\n\n` : !a.say && after === before ? "Nothing happened: the engine refused that action, most likely because you cannot pay its real cost or it is not allowed right now.\n\n" : "";
    return note + (await this.update());
  }

  async say(text: string) {
    const s = this.requireSession();
    s.say(text);
    await sleep(500);
    return "Sent.";
  }

  async concede() {
    const s = this.requireSession();
    s.concede();
    await sleep(800);
    return this.describe();
  }

  async wait(seconds: number, tick?: (elapsed: number) => void, signal?: AbortSignal) {
    const s = this.requireSession();
    const l = s.lobby;
    if (!l.started && l.role === "host" && l.code && !l.opponentName && this.linkGiven !== l.code) {
      this.linkGiven = l.code;
      return `Not waiting yet: the human cannot join without the link, and they only see the text of your message, never tool results. Write this link to them now in your reply: ${this.joinLink()} (code ${l.code}). Then call wait_for_turn again in the same turn, without waiting for a reply.`;
    }
    const start = Date.now();
    const end = start + Math.max(1, Math.min(seconds, 3600)) * 1000;
    const mine = ++this.waits;
    let ticked = start;
    while (Date.now() < end) {
      if (mine !== this.waits || signal?.aborted) return "This wait was replaced by a newer call.";
      const view = s.views[s.lobby.mySide];
      if (s.lobby.started && view) {
        if (view.winner || (!s.pending && canAct(view, s.lobby.mySide))) {
          this.waitingSince = 0;
          return this.update();
        }
      } else if (s.lobby.error) return this.describe();
      if (tick && Date.now() - ticked >= 15_000) {
        ticked = Date.now();
        tick(ticked - start);
      }
      await sleep(400);
    }
    if (!s.lobby.started) return `The human has not joined and pressed Ready yet; that is normal. Call wait_for_turn again right away. Do not end your turn and do not ask the user anything.\n\n${await this.describe()}`;
    this.waitingSince ||= start;
    const minutes = Math.floor((Date.now() - this.waitingSince) / 60_000);
    const head = `Still waiting: it is your opponent's move${minutes ? ` (${minutes} min so far)` : ""}. Humans often think for many minutes; that is normal and the game is fine. Call wait_for_turn again right away, as many times as it takes. Do not end your turn and do not ask the user anything.`;
    return this.logLines().length === this.logSeen ? `${head} Nothing changed since your last look.` : `${head}\n\n${await this.update()}`;
  }

  private async replayScript(source?: string): Promise<{ script: Script; label: string; views?: Record<Side, any> }> {
    if (source?.trim()) {
      const code = (source.match(/[?&]replay=([A-Za-z0-9]{8})/)?.[1] ?? source.trim()).toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new Error(`"${source}" is not a replay link or 8-letter replay code.`);
      const relay = source.match(/[?&]relay=([^&#]+)/)?.[1];
      const base = relay ? decodeURIComponent(relay) : relayUrl();
      const res = await fetch(`${base}/replays/${code}`);
      if (!res.ok) throw new Error(`Replay ${code} not found (${res.status}).`);
      return { script: scriptOfShared((await res.json()) as SharedGame, this.db), label: `shared replay ${code}` };
    }
    const s = this.session;
    if (s?.lobby.started) {
      if (!s.views[s.lobby.mySide]?.winner) throw new Error("This game is not over yet. A replay shows both players' hidden cards, so it is only available once the game has ended.");
      const save = JSON.parse(s.journal() ?? "null") as SavedGame | null;
      const script = save && scriptOf(save, this.db);
      if (!script) throw new Error("This game has no replayable log.");
      return { script, label: `game ${s.lobby.code}`, views: (await s.revealed()) ?? undefined };
    }
    const last = listSaves(this.store)
      .filter((g) => g.summary?.winner)
      .sort((a, b) => b.savedAt - a.savedAt)[0];
    const script = last && scriptOf(last, this.db);
    if (!script) throw new Error("No finished game to replay. Pass the replay link the human shares from the History screen of the app.");
    return { script, label: `game ${last.code}` };
  }

  async replay(source?: string, fromTurn?: number, toTurn?: number) {
    const { script, label, views: live } = await this.replayScript(source);
    let views: Record<Side, any>;
    if (live) views = live;
    else {
      const host = makeHost(this.engine);
      try {
        const r = await host.run([{ k: "boot", setup: script.setup, seed: script.seed }, ...script.entries.map((entry) => ({ k: "exec" as const, entry }))], ["corp", "runner"]);
        views = r.views as Record<Side, any>;
      } finally {
        host.dispose();
      }
    }
    const end = views.corp;
    const name = (side: Side) => script.names[side];
    const deckText = (side: Side) => {
      const deck = script.setup[side].deck;
      const counts = new Map<string, number>();
      for (const c of deck.cards ?? []) counts.set(c.card?.title ?? c.title, (counts.get(c.card?.title ?? c.title) ?? 0) + (c.qty ?? 1));
      return `${side} ${name(side)}: ${deck.identity?.title ?? "?"}${script.deckNames[side] ? ` — "${script.deckNames[side]}"` : ""}\n  ${[...counts].map(([t, n]) => `${n}x ${t}`).join(", ")}`;
    };
    const lines: string[] = [];
    const turns: string[] = [];
    const points: Record<string, number> = {};
    let current = 0;
    for (const e of end?.log ?? []) {
      const text = e.user === "__system__" ? this.render(e.text) : `${e.user?.username ?? "?"} says: ${this.render(e.text)}`;
      if (text === "[hr]") continue;
      const m = text.match(/started their turn (\d+)/);
      if (m) current = Number(m[1]);
      const gain = text.match(/^(.+?) (?:scores|steals) .+? and gains (\d+) agenda points?/);
      if (gain) points[gain[1]] = (points[gain[1]] ?? 0) + Number(gain[2]);
      const ending = text.match(/^(.+?) is ending their turn (\d+) with (\d+) \[Credits?\] and (\d+) cards? in (HQ|the grip)/);
      if (ending) turns.push(`turn ${ending[2]}, ${ending[5] === "HQ" ? "corp" : "runner"} ${ending[1]} ends with ${ending[3]} credits, ${ending[4]} cards in hand, ${points[ending[1]] ?? 0} points`);
      if ((fromTurn == null || current >= fromTurn) && (toTurn == null || current <= toTurn)) lines.push(text);
    }
    const MAX = 700;
    const clipped = lines.length > MAX;
    const board = (side: Side) => {
      const v = views[side];
      const out: string[] = [];
      if (side === "corp")
        for (const [key, srv] of Object.entries<any>(v.corp?.servers ?? {})) {
          const cards = [...(srv.ices ?? []).map((c: any) => `ice ${this.cardLine(c, "corp")}`), ...(srv.content ?? []).map((c: any) => this.cardLine(c, "corp"))];
          if (cards.length) out.push(`  ${key}: ${cards.join("; ")}`);
        }
      else for (const k of ["program", "hardware", "resource"]) for (const c of v.runner?.rig?.[k] ?? []) out.push(`  ${k}: ${this.cardLine(c, "runner")}`);
      const scored = (v[side]?.scored ?? []).map((c: any) => c.title).join(", ");
      if (scored) out.push(`  scored: ${scored}`);
      const hand = (v[side]?.hand ?? []).map((c: any) => c.title).join(", ");
      if (hand) out.push(`  hand: ${hand}`);
      return out.join("\n");
    };
    return [
      `REPLAY of ${label}. Everything is revealed: use it to debrief the game with the human.`,
      end?.winner ? `Result: ${end.winner} (${name(end.winner)}) won${end.reason ? ` by ${end.reason}` : ""}, ${end.corp?.["agenda-point"] ?? 0}-${end.runner?.["agenda-point"] ?? 0} on turn ${end.turn}.` : `Result: no winner recorded (stopped on turn ${end?.turn}).`,
      "",
      "DECKS",
      deckText("corp"),
      deckText("runner"),
      "",
      "SCORE AND CREDITS PER TURN",
      ...turns,
      "",
      `FINAL BOARD\ncorp (${name("corp")}):\n${board("corp")}\nrunner (${name("runner")}):\n${board("runner")}`,
      "",
      `LOG${fromTurn != null || toTurn != null ? ` (turns ${fromTurn ?? 1} to ${toTurn ?? "end"})` : ""}`,
      ...(clipped ? lines.slice(-MAX) : lines),
      clipped ? `\n(Only the last ${MAX} of ${lines.length} log lines are shown. Pass from_turn and to_turn to read earlier turns.)` : "",
    ].join("\n");
  }

  card(name: string) {
    const wanted = name.trim().toLowerCase();
    const card = this.db.byTitle.get(name) ?? this.db.all.find((c) => c.title.toLowerCase() === wanted) ?? this.db.all.find((c) => c.title.toLowerCase().includes(wanted));
    if (!card) return `No card named "${name}".`;
    const c: any = card;
    const facts = [c.side, c.type, c.subtypes?.length ? c.subtypes.join(" - ") : undefined, c.faction, c.cost != null ? `cost ${c.cost}` : undefined, c.strength != null ? `strength ${c.strength}` : undefined, c.advancementcost != null ? `advancement ${c.advancementcost}` : undefined, c.agendapoints != null ? `${c.agendapoints} points` : undefined, c.trash != null ? `trash cost ${c.trash}` : undefined, c.memoryunits != null ? `${c.memoryunits} MU` : undefined]
      .filter(Boolean)
      .join(" · ");
    return `${c.title}\n${facts}\n${c.text ?? ""}`;
  }

  close() {
    this.unsubscribe?.();
    this.session?.close();
    this.session = undefined;
  }
}
