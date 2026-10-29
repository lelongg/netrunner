import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as engine from "../../../engine/engine.js";
import type { Side } from "../../engine.ts";
import { cardRef, promptOf } from "../../game/actions.ts";
import { PolicyBot } from "./bot.ts";
import "./decks/index.ts";
import { findPolicy } from "./registry.ts";
import { engineSimulator } from "./simulate.ts";
import { engineTrial } from "./trial.ts";

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

let byTitle: Map<string, any> | null = null;

function cards() {
  if (byTitle) return byTitle;
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const list = JSON.parse(readFileSync(`${root}public/data/cards.json`, "utf8"));
  byTitle = new Map<string, any>(list.map((c: any) => [c.title, c]));
  engine.loadCards(list);
  engine.loadDictionary("en", readFileSync(`${root}public/i18n/en/messages.ftl`, "utf8") + readFileSync(`${root}public/i18n/en/ui.ftl`, "utf8"));
  engine.setLanguage("en");
  return byTitle;
}

export class Replayed {
  readonly game: any;
  readonly entries: any[];
  readonly botSide: Side;
  readonly bot: PolicyBot;
  next = 0;
  private readonly rng: () => number;

  constructor(file: string) {
    const titles = cards();
    const shared = JSON.parse(readFileSync(file, "utf8"));
    const deck = (side: Side) => ({ identity: titles.get(shared.decks[side].identity), cards: shared.decks[side].cards.filter(([t]: [string]) => titles.get(t)?.type !== "Identity").map(([t, qty]: [string, number]) => ({ qty, card: titles.get(t) })) });
    this.rng = sfc32(shared.seed[0], shared.seed[1], shared.seed[2], shared.seed[3]);
    this.game = this.seeded(() => engine.createGame({ gameid: "replay", format: "casual", corp: { user: { username: shared.names.corp }, deck: deck("corp") }, runner: { user: { username: shared.names.runner }, deck: deck("runner") } }));
    this.entries = shared.entries;
    this.botSide = shared.mySide === "corp" ? "runner" : "corp";
    const list = { identity: shared.decks[this.botSide].identity, cards: shared.decks[this.botSide].cards.map(([title, qty]: [string, number]) => ({ qty, title })) };
    const holder: { bot?: PolicyBot } = {};
    this.bot = new PolicyBot(this.botSide, findPolicy(this.botSide, list)?.policy ?? null, (title) => titles.get(title), {
      random: Math.random,
      render: (m: unknown) => engine.renderMessage(m),
      record: true,
      deck: list,
      simulate: engineSimulator(engine, this.game, this.botSide),
      trial: engineTrial(engine, this.game, this.botSide, (v, s) => holder.bot!.trialMove(v, s)),
    });
    holder.bot = this.bot;
  }

  private seeded<T>(f: () => T): T {
    const random = Math.random;
    Math.random = this.rng;
    try {
      return f();
    } finally {
      Math.random = random;
    }
  }

  view(side: Side = this.botSide): any {
    return engine.view(this.game, side);
  }

  get turn(): number {
    return Number(this.view().turn ?? 0);
  }

  get done(): boolean {
    return this.next >= this.entries.length;
  }

  step() {
    const entry = this.entries[this.next++];
    this.seeded(() => {
      if (entry.kind === "act") {
        const enc = engine.view(this.game, "corp")?.encounters;
        const live = entry.command === "continue" && enc?.ice?.rezzed && enc?.["no-action"] && enc["no-action"] !== entry.side && (enc.ice.subroutines ?? []).some((x: any) => !x.broken && !x.fired && x.resolve !== false);
        const eid = entry.args?.eid;
        const current = eid ? promptOf(engine.view(this.game, entry.side), entry.side)?.eid : null;
        const args = current && current.eid !== eid.eid ? { ...entry.args, eid: current } : (entry.args ?? null);
        if (live) engine.act(this.game, "corp", "unbroken-subroutines", { card: cardRef(enc.ice) });
        else engine.act(this.game, entry.side, entry.command, args);
      } else if (entry.kind === "say") engine.say(this.game, entry.side, { username: entry.user }, entry.text);
      else engine.concede(this.game, entry.side);
    });
    return entry;
  }

  until(stop: (entry: any, r: Replayed) => boolean, feed = false) {
    while (!this.done && !stop(this.entries[this.next], this)) {
      if (feed && this.entries[this.next].side === this.botSide && this.entries[this.next].kind === "act") this.bot.decide(this.view());
      this.step();
    }
    return this;
  }

  decide() {
    const move = this.bot.decide(this.view());
    return { move, record: this.bot.records[this.bot.records.length - 1] };
  }
}
