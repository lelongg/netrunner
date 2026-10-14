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

const game = engine.createGame({
  gameid: "smoke",
  format: "casual",
  corp: { user: { username: "corp" }, deck: deck(corp) },
  runner: { user: { username: "runner" }, deck: deck(runner) },
});

const view = (side) => engine.view(game, side);
const prompt = (side) => view(side)[side]["prompt-state"];
const choose = (side, value) => {
  const p = prompt(side);
  const choice = p.choices.find((c) => c.value === value);
  assert.ok(choice, `${side} can choose ${value}`);
  return engine.act(game, side, "choice", { eid: p.eid, choice: { uuid: choice.uuid } });
};

assert.equal(view("corp").corp.hand.length, 5);
assert.equal(view("corp").runner.hand.length, 0, "corp cannot see the grip");
assert.equal(view("corp").runner["hand-count"], 5);
choose("corp", "Keep");
choose("runner", "Keep");

engine.act(game, "corp", "start-turn", null);
assert.equal(view("corp").corp.click, 3);
const before = view("corp").corp.credit;
engine.act(game, "corp", "credit", null);
assert.equal(view("corp").corp.credit, before + 1);

const install = view("corp").corp.hand.find((c) => c.type !== "Operation");
engine.act(game, "corp", "play", { card: install, server: "New remote" });
const remote = view("runner").corp.servers.remote1;
assert.ok(remote, "remote server created");
assert.equal([...(remote.content ?? []), ...(remote.ices ?? [])][0].title, undefined, "installed card is hidden from the runner");

while (view("corp").corp.click > 0) engine.act(game, "corp", "credit", null);
engine.act(game, "corp", "end-turn", null);
const discard = prompt("corp");
if (discard?.["prompt-type"] === "select") {
  engine.act(game, "corp", "select", { card: view("corp").corp.hand[0], eid: discard.eid });
}

engine.act(game, "runner", "start-turn", null);
assert.equal(view("runner")["active-player"], "runner");
assert.equal(view("runner").runner.click, 4);
engine.act(game, "runner", "run", { server: "HQ" });
assert.ok(view("runner").run, "run started");
for (let i = 0; i < 20 && view("runner").run; i++) {
  const p = prompt("runner");
  if (p?.choices?.length && p["prompt-type"] !== "run") choose("runner", p.choices.at(-1).value);
  else engine.act(game, "runner", "continue", null);
  if (view("corp").run) engine.act(game, "corp", "continue", null);
}
assert.equal(view("runner").run, undefined, "run finished");
assert.equal(view("runner").runner.click, 3);

const log = view("runner").log.map((e) => engine.renderMessage(e.text));
assert.ok(log.some((l) => /make a run on HQ/.test(l)), "run is logged");
assert.ok(log.some((l) => /keeps .* hand/.test(l)), "msg maps are rendered via Fluent");
console.log(`smoke ok: ${log.length} log lines, view ${JSON.stringify(view("runner")).length} bytes`);
