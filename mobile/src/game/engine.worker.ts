import { type Card, type EngineApi, importEngine } from "../engine";
import { GameRunner, type Op } from "./runner";

type Request = { k: "init"; base: string } | { k: "run"; id: number; game: number; ops: Op[]; sides: ("corp" | "runner" | "spectator")[] } | { k: "drop"; game: number };

let engine: Promise<EngineApi> | null = null;
const games = new Map<number, GameRunner>();

async function load(base: string) {
  const text = async (path: string) => {
    const res = await fetch(new URL(path, base));
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.text();
  };
  const [api, cards, messages, ui] = await Promise.all([importEngine(), text("data/cards.json"), text("i18n/en/messages.ftl"), text("i18n/en/ui.ftl")]);
  api.loadCards(JSON.parse(cards) as Card[]);
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
    if (!runner) games.set(msg.game, (runner = new GameRunner(api)));
    const result = runner.run(msg.ops, msg.sides);
    (self as unknown as Worker).postMessage({ id: msg.id, result });
  } catch (e) {
    (self as unknown as Worker).postMessage({ id: msg.id, error: e instanceof Error ? e.message : String(e) });
  }
};
