import type { Card, CardDb, EngineApi, Side } from "../../mobile/src/engine";
import { Session, loadSave } from "../../mobile/src/session";
import { type Store, browserStore } from "../../mobile/src/store";
import { basicCommands, cardCommands, cardRef, currentIce, findCard, promptOf, runCommands } from "../../mobile/src/game/actions";
import { type WireDeck, fromPrecon, importNrdb, toWire } from "../../mobile/src/decks";

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
}

const other = (s: Side): Side => (s === "corp" ? "runner" : "corp");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
      return this.engine.renderMessage(m);
    } catch {
      return String(m ?? "");
    }
  };

  private attach(session: Session) {
    this.unsubscribe?.();
    this.session?.close();
    this.session = session;
    this.installing = undefined;
    this.unsubscribe = session.subscribe(() => {
      this.autoPass();
      this.autoStart();
    });
  }

  private starting = false;

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

  async join(code: string, name: string, deck?: string) {
    const upper = code.trim().toUpperCase();
    const save = loadSave(upper, this.store);
    this.attach(save ? Session.resume(this.engine, this.db, save, this.store) : new Session(this.engine, this.db, "guest", upper, name, undefined, [], this.store));
    if (!save) this.session!.setName(name);
    await this.settleLobby();
    const s = this.session!;
    if (deck && !s.lobby.started) {
      const end = Date.now() + 10000;
      while (Date.now() < end && !s.lobby.opponentName) await sleep(200);
      return this.chooseDeck(deck);
    }
    return this.describe();
  }

  async host(name: string, side: Side, deck: string) {
    const wire = await this.resolveDeck(deck, side);
    this.attach(new Session(this.engine, this.db, "host", undefined, name, side, [], this.store));
    await this.settleLobby();
    const s = this.session!;
    s.setSide(side);
    await sleep(500);
    s.setDeck(wire);
    await sleep(300);
    return this.describe();
  }

  private requireSession() {
    if (!this.session) throw new Error("Not in a game. Use join_game or host_game first.");
    return this.session;
  }

  decks(side?: Side) {
    const s = this.session;
    const want = side ?? s?.lobby.mySide;
    const lines: string[] = [];
    for (const m of this.engine.precons() as any[]) {
      for (const sd of ["corp", "runner"] as Side[]) {
        if (want && sd !== want) continue;
        const d = m[sd];
        lines.push(`- ${d.name} (${m.title}) · ${sd} · identity: ${d.identity}`);
      }
    }
    return `Preconstructed decks${want ? ` for the ${want}` : ""}:\n${lines.join("\n")}\n\nchoose_deck also accepts a NetrunnerDB deck or decklist URL.`;
  }

  private async resolveDeck(nameOrUrl: string, side: Side): Promise<WireDeck> {
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
    const deck = await this.resolveDeck(nameOrUrl, s.lobby.mySide);
    s.setDeck(deck);
    if (s.lobby.role === "guest") {
      await sleep(300);
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
      `Your deck: ${l.myDeck ? l.myDeck.name : "none (use list_decks then choose_deck)"}`,
    ];
    if (l.role === "host") lines.push(s.canStart ? "Starting the game…" : "The game starts by itself as soon as the human has joined, picked a deck and pressed Ready. Tell them the code, then call wait_for_turn.");
    else lines.push(l.myDeck ? "You are ready; the host starts the game." : "Pick a deck to be ready.");
    if (l.role === "host" && l.code) lines.push(`Give the human the code ${l.code} or this link: ${(globalThis as any).location.origin}${(globalThis as any).location.pathname}?join=${l.code}`);
    return lines.join("\n");
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
      if (p.identity?.title) out.push([`${prefix}.id`, `${who} identity: ${p.identity.title}`]);
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

  private buildActions(): Action[] {
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
      return out.map((a, id) => ({ ...a, id }));
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
      push({ label: this.render(c.label), command: c.command, args: c.args });
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
        push({ label: `${card.title}: ${this.render(c.label)}`, command: c.command, args: c.args });
      }
    }
    return out.map((a, id) => ({ ...a, id }));
  }

  private seen = new Map<string, string>();
  private logSeen = 0;

  private actionsText() {
    const s = this.session!;
    const view = s.views[s.lobby.mySide];
    this.actions = this.buildActions();
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

  describe() {
    const s = this.session;
    if (!s) return "Not in a game. Use join_game with a game code, or host_game.";
    if (!s.lobby.started || !s.views[s.lobby.mySide]) return this.lobbyText();
    const lines = this.gameLines();
    const recent = this.logLines()
      .filter((t) => t && !/^\s*\[hr\]\s*$/i.test(t))
      .slice(-12);
    this.remember(lines);
    return `${lines.map(([, t]) => t).join("\n")}\n\nRecent log:\n${recent.map((t) => `  ${t}`).join("\n")}\n\n${this.actionsText()}`;
  }

  update() {
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
    parts.push(this.actionsText());
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
    if (this.stampOf() !== this.stamp) {
      return `The game changed since you listed actions; nothing was done.\n\n${this.update()}`;
    }
    const a = this.actions.find((x) => x.id === id);
    if (!a) throw new Error(`No action ${id}. Call get_state to list actions.`);
    s.clearActionError();
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
    return this.update();
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

  async wait(seconds: number) {
    const s = this.requireSession();
    const end = Date.now() + Math.max(1, Math.min(seconds, 900)) * 1000;
    while (Date.now() < end) {
      const view = s.views[s.lobby.mySide];
      if (s.lobby.started && view) {
        if (view.winner || (!s.pending && canAct(view, s.lobby.mySide))) return this.update();
      } else if (s.lobby.error) return this.describe();
      await sleep(400);
    }
    return `Still waiting: the opponent is thinking or playing. Call wait_for_turn again right away; do not end your turn or ask the user to do anything.\n\n${this.update()}`;
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
