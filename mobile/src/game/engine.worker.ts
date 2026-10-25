import { type Card, type EngineApi, importEngine } from "../engine";
import { GameRunner, type Op, type Probe } from "./runner";
import { type Bot, makeBot } from "../bot/index";
import type { Side } from "../engine";

type Request = { k: "init"; base: string } | { k: "run"; id: number; game: number; ops: Op[]; sides: ("corp" | "runner" | "spectator")[] } | { k: "probe"; id: number; game: number; side: "corp" | "runner"; probes: Probe[] } | { k: "drop"; game: number };

let engine: Promise<EngineApi> | null = null;
const games = new Map<number, GameRunner>();
const byTitle = new Map<string, Card>();
const bots = new Map<string, Bot>();

function trialStep(side: Side, deck: unknown) {
  const key = `${side}:${JSON.stringify(deck ?? null)}`;
  let bot = bots.get(key);
  if (!bot) bots.set(key, (bot = makeBot(side, (deck as any) ?? undefined, (title) => byTitle.get(title) as any, "policy")));
  return (view: any, mover: Side) => bot!.trialMove?.(view, mover) ?? null;
}

async function load(base: string) {
  const text = async (path: string) => {
    const res = await fetch(new URL(path, base));
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.text();
  };
  const [api, cards, messages, ui] = await Promise.all([importEngine(), text("data/cards.json"), text("i18n/en/messages.ftl"), text("i18n/en/ui.ftl")]);
  const list = JSON.parse(cards) as Card[];
  for (const c of list) byTitle.set((c as any).title, c);
  api.loadCards(list);
  api.loadDictionary("en", messages + "\n" + ui);
  api.setLanguage("en");
  return api;
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const msg = event.data;
  if (msg.k === "init") {
    engine ??= load(msg.base);
    return;
  }
  if (msg.k === "drop") {
    games.delete(msg.game);
    return;
  }
  try {
    const api = await engine!;
    let runner = games.get(msg.game);
    if (!runner) {
      games.set(msg.game, (runner = new GameRunner(api)));
      runner.trialStep = trialStep;
    }
    const result = msg.k === "probe" ? runner.probe(msg.side, msg.probes) : runner.run(msg.ops, msg.sides);
    (self as unknown as Worker).postMessage({ id: msg.id, result });
  } catch (e) {
    (self as unknown as Worker).postMessage({ id: msg.id, error: e instanceof Error ? e.message : String(e) });
  }
};
