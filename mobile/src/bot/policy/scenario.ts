import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as engine from "../../../engine/engine.js";
import type { Side } from "../../engine.ts";
import { candidateActions } from "../../game/candidates.ts";
import { PolicyBot } from "./bot.ts";
import { coreDeck } from "./decks/core.ts";
import "./decks/index.ts";
import { findPolicy } from "./registry.ts";
import { engineSimulator } from "./simulate.ts";
import { engineTrial } from "./trial.ts";
import type { DecisionRecord, Move, Proposal } from "./types.ts";

const byTitle = new Map<string, any>();
let loaded = false;

function load() {
  if (loaded) return;
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const cards = JSON.parse(readFileSync(`${root}public/data/cards.json`, "utf8"));
  for (const c of cards) byTitle.set(c.title, c);
  engine.loadCards(cards);
  engine.loadDictionary("en", readFileSync(`${root}public/i18n/en/messages.ftl`, "utf8") + readFileSync(`${root}public/i18n/en/ui.ftl`, "utf8"));
  engine.setLanguage("en");
  loaded = true;
}

function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 4294967296;
  };
}

const render = (m: unknown) => engine.renderMessage(m);
const other = (side: Side): Side => (side === "corp" ? "runner" : "corp");

export class Scenario {
  readonly game: any;
  readonly bots: Record<Side, PolicyBot>;

  constructor(corpKey: string, runnerKey: string, seed = 1, options: { search?: boolean } = {}) {
    load();
    const lists = { corp: coreDeck(corpKey)!, runner: coreDeck(runnerKey)! };
    const deck = (p: { identity: string; cards: { qty: number; title: string }[] }) => ({ identity: byTitle.get(p.identity), cards: p.cards.map(({ qty, title }) => ({ qty, card: byTitle.get(title) })) });
    const random = Math.random;
    Math.random = rng(seed);
    try {
      this.game = engine.createGame({ gameid: `scenario-${seed}`, format: "casual", corp: { user: { username: "corp" }, deck: deck(lists.corp) }, runner: { user: { username: "runner" }, deck: deck(lists.runner) } });
    } finally {
      Math.random = random;
    }
    const make = (side: Side) => {
      const list = { identity: lists[side].identity, cards: lists[side].cards };
      const holder: { bot?: PolicyBot } = {};
      const bot = new PolicyBot(side, findPolicy(side, list)?.policy ?? null, (title) => byTitle.get(title), {
        random: rng(seed + 7),
        render,
        record: true,
        deck: list,
        simulate: engineSimulator(engine, this.game, side),
        trial: engineTrial(engine, this.game, side, (v, s) => holder.bot!.trialMove(v, s)),
        search: options.search ?? false,
      });
      holder.bot = bot;
      return bot;
    };
    this.bots = { corp: make("corp"), runner: make("runner") };
    this.act("corp", "Choose: Keep");
    this.act("runner", "Choose: Keep");
    this.act("corp", "Start turn");
  }

  view(side: Side): any {
    return engine.view(this.game, side);
  }

  say(side: Side, text: string) {
    engine.say(this.game, side, { username: side }, text);
  }

  actions(side: Side) {
    return candidateActions(this.view(side), side, render);
  }

  act(side: Side, label: string) {
    const c = this.actions(side).find((x) => x.label.startsWith(label));
    if (!c) throw new Error(`no action "${label}" for ${side}; have: ${this.actions(side).map((x) => x.label).join(" | ")}`);
    engine.act(this.game, side, c.command, c.args ?? null);
  }

  clearHand(side: Side) {
    for (let i = 0; i < 20 && (this.view(side)[side]?.hand?.length ?? 0) > 0; i++) this.say(side, "/discard #1");
  }

  summon(side: Side, ...titles: string[]) {
    for (const t of titles) this.say(side, `/summon ${t}`);
  }

  credits(side: Side, n: number) {
    this.say(side, `/credit ${n}`);
  }

  clicks(side: Side, n: number) {
    this.say(side, `/click ${n}`);
  }

  install(side: Side, title: string, server?: string) {
    this.act(side, side === "corp" ? `Install ${title} in ${server}` : `${title}: Install`);
  }

  rez(title: string) {
    this.say("corp", "/rez-free");
    this.act("corp", `Select ${title}`);
  }

  endTurn(side: Side) {
    this.clicks(side, 0);
    this.act(side, "End turn");
    const next = other(side);
    for (let i = 0; i < 6; i++) {
      const prompt = this.view(side)[side]?.["prompt-state"];
      if (prompt && prompt["prompt-type"] === "select") this.say(side, "/discard #1");
      else break;
    }
    this.act(next, "Start turn");
  }

  runStep(side: Side) {
    const labels = ["Approach ice", "Continue", "Movement", "Approach server", "Breach server", "Let it fire"];
    const c = this.actions(side).find((x) => labels.some((l) => x.label.startsWith(l)));
    if (!c) throw new Error(`no run step for ${side}; have: ${this.actions(side).map((x) => x.label).join(" | ")}`);
    engine.act(this.game, side, c.command, c.args ?? null);
  }

  pass(side: Side) {
    const c = this.actions(side).find((x) => x.command === "continue");
    if (!c) throw new Error(`no pass for ${side}; have: ${this.actions(side).map((x) => x.label).join(" | ")}`);
    engine.act(this.game, side, c.command, c.args ?? null);
  }

  play(side: Side, move: Move) {
    engine.act(this.game, side, move.command, move.args ?? null);
  }

  decide(side: Side): Move | null {
    return this.bots[side].decide(this.view(side));
  }

  last(side: Side): DecisionRecord {
    return this.bots[side].records[this.bots[side].records.length - 1];
  }

  considered(side: Side): Proposal[] {
    return this.last(side).considered;
  }

  server(label: string) {
    const v = this.view("corp");
    const key = Object.keys(v.corp?.servers ?? {}).find((k) => (k === "hq" && label === "HQ") || (k === "rd" && label === "R&D") || (k === "archives" && label === "Archives") || (k.startsWith("remote") && label === `Server ${k.slice(6)}`));
    return key ? v.corp.servers[key] : undefined;
  }
}
