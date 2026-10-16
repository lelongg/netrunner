import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as engine from "../engine/engine.js";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const cards = JSON.parse(await read("../public/data/cards.json"));
const byTitle = new Map(cards.map((c) => [c.title, c]));

assert.equal(engine.loadCards(cards), cards.length);
engine.loadDictionary("en", (await read("../public/i18n/en/messages.ftl")) + (await read("../public/i18n/en/ui.ftl")));

const matchups = engine.precons();
assert.ok(matchups.length > 2, "preconstructed matchups available");
const deck = (p) => ({
  identity: byTitle.get(p.identity),
  cards: p.cards.map(({ qty, title }) => ({ qty, card: byTitle.get(title) })),
});
const { corp, runner } = matchups[0];

function sfc32(a, b, c, d) {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const setup = {
  gameid: "smoke",
  format: "casual",
  corp: { user: { username: "corp" }, deck: deck(corp) },
  runner: { user: { username: "runner" }, deck: deck(runner) },
};
const seed = Array.from(crypto.getRandomValues(new Uint32Array(4)));
const seeded = (rng, f) => {
  const random = Math.random;
  Math.random = rng;
  try {
    return f();
  } finally {
    Math.random = random;
  }
};
const boot = () => {
  const rng = sfc32(...seed);
  return { rng, game: seeded(rng, () => engine.createGame(setup)) };
};
const live = boot();
const game = live.game;
const entries = [];
const act = (side, command, args) => {
  entries.push([side, command, JSON.parse(JSON.stringify(args))]);
  return seeded(live.rng, () => engine.act(game, side, command, args));
};

const view = (side) => engine.view(game, side);
const prompt = (side) => view(side)[side]["prompt-state"];
const choose = (side, value) => {
  const p = prompt(side);
  const choice = p.choices.find((c) => c.value === value);
  assert.ok(choice, `${side} can choose ${value}`);
  return act(side, "choice", { eid: p.eid, choice: { uuid: choice.uuid } });
};

assert.equal(view("corp").corp.hand.length, 5);
assert.equal(view("corp").runner.hand.length, 0, "corp cannot see the grip");
assert.equal(view("corp").runner["hand-count"], 5);
choose("corp", "Keep");
choose("runner", "Keep");

act("corp", "start-turn", null);
assert.equal(view("corp").corp.click, 3);
const before = view("corp").corp.credit;
act("corp", "credit", null);
assert.equal(view("corp").corp.credit, before + 1);

const install = view("corp").corp.hand.find((c) => c.type !== "Operation");
act("corp", "play", { card: install, server: "New remote" });
const remote = view("runner").corp.servers.remote1;
assert.ok(remote, "remote server created");
assert.equal([...(remote.content ?? []), ...(remote.ices ?? [])][0].title, undefined, "installed card is hidden from the runner");

while (view("corp").corp.click > 0) act("corp", "credit", null);
act("corp", "end-turn", null);
const discard = prompt("corp");
if (discard?.["prompt-type"] === "select") {
  act("corp", "select", { card: view("corp").corp.hand[0], eid: discard.eid });
}

act("runner", "start-turn", null);
assert.equal(view("runner")["active-player"], "runner");
assert.equal(view("runner").runner.click, 4);
act("runner", "run", { server: "HQ" });
assert.ok(view("runner").run, "run started");
for (let i = 0; i < 20 && view("runner").run; i++) {
  const p = prompt("runner");
  const c = prompt("corp");
  if (c?.choices?.length && c["prompt-type"] !== "run") choose("corp", c.choices.at(-1).value);
  else if (c?.["prompt-type"] === "select") act("corp", "select", { card: null, eid: c.eid });
  else if (p?.choices?.length && p["prompt-type"] !== "run") choose("runner", p.choices.at(-1).value);
  else act("runner", "continue", null);
  if (view("corp").run && !prompt("corp")?.choices?.length && prompt("runner")?.["prompt-type"] === "run") act("corp", "continue", null);
}
assert.equal(view("runner").run, undefined, "run finished");
assert.equal(view("runner").runner.click, 3);

const log = view("runner").log.map((e) => engine.renderMessage(e.text));
assert.ok(log.some((l) => /make a run on HQ/.test(l)), "run is logged");
assert.ok(log.some((l) => /keeps .* hand/.test(l)), "msg maps are rendered via Fluent");
const replay = boot();
for (const [side, command, args] of entries) seeded(replay.rng, () => engine.act(replay.game, side, command, args));
const stable = (g, side) => JSON.stringify(engine.view(g, side), (k, v) => (k === "timestamp" || k === "start-date" ? undefined : v));
for (const side of ["corp", "runner"]) assert.equal(stable(replay.game, side), stable(game, side), `replaying the log reproduces the ${side} view`);

console.log(`smoke ok (replay of ${entries.length} actions identical): ${log.length} log lines, view ${JSON.stringify(view("runner")).length} bytes`);
