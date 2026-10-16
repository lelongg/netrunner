import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as engine from "../engine/engine.js";
import type { EngineApi } from "../src/engine";
import type { Entry } from "../src/net/types";
import { Session } from "../src/session";

const store = new Map<string, string>();
const g = globalThis as any;
g.window ??= g;
g.location ??= new URL("http://localhost/");
g.addEventListener ??= () => {};
g.removeEventListener ??= () => {};
g.document ??= { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

declare const SCRIPTS: string;
const read = (path: string) => readFileSync(new URL(path, SCRIPTS), "utf8");
const cards = JSON.parse(read("../public/data/cards.json"));
engine.loadCards(cards);
engine.loadDictionary("en", read("../public/i18n/en/messages.ftl") + read("../public/i18n/en/ui.ftl"));
const byTitle = new Map(cards.map((c: any) => [c.title, c]));
const db = { byTitle, byCode: new Map(), all: cards } as any;
const api = engine as unknown as EngineApi;

const entries: Entry[] = JSON.parse(read("fixtures/journal-5VB3W.json"));

function corpState(session: Session) {
  const view = api.view((session as any).game, "corp");
  return { hand: (view.corp.hand ?? []).length, prompt: view.corp["prompt-state"]?.msg ?? null, discard: (view.corp.discard ?? []).length, active: view["active-player"] };
}

const resumed = (role: "host" | "guest") => Session.resume(api, db, { v: 2, role, transport: "relay", code: "TEST1", myName: role, entries, savedAt: 0 } as any);

function live(role: "host" | "guest", every: number) {
  const session = Session.resume(api, db, { v: 2, role, transport: "relay", code: "TEST1", myName: role, entries: [], savedAt: 0 } as any);
  for (let i = 0; i < entries.length; i += every) (session as any).receive(entries.slice(i, i + every));
  return session;
}

const expected = { hand: 5, prompt: null, discard: 1, active: "corp" };
const runs: [string, Session][] = [
  ["resumed host", resumed("host")],
  ["resumed guest", resumed("guest")],
  ["live host, one entry at a time", live("host", 1)],
  ["live guest, three entries at a time", live("guest", 3)],
];
for (const [name, session] of runs) {
  assert.deepEqual(corpState(session), expected, `${name}: the Corp's end-of-turn discard must apply`);
  (session as any).close?.();
}
console.log(`journal ok: ${entries.length} entries replay to the same state ${runs.length} ways`);
process.exit(0);
