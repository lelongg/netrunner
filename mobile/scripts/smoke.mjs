import { readFile } from "node:fs/promises";
import * as engine from "../engine/engine.js";

const cards = JSON.parse(await readFile(new URL("../public/data/cards.json", import.meta.url), "utf8"));
const byTitle = new Map(cards.map((c) => [c.title, c]));
const deck = (identity, list) => ({
  identity: byTitle.get(identity),
  cards: Object.entries(list).map(([title, qty]) => ({ qty, card: byTitle.get(title) })),
});

console.log("cards loaded:", engine.loadCards(cards));

const game = engine.createGame({
  gameid: "smoke",
  format: "casual",
  corp: {
    user: { username: "corp" },
    deck: deck("Haas-Bioroid: Engineering the Future", {
      "Hedge Fund": 3, "Ice Wall": 3, "Enigma": 3, "Priority Requisition": 3,
      "Hostile Takeover": 3, "PAD Campaign": 3, "Wall of Static": 3, "Melange Mining Corp.": 3,
    }),
  },
  runner: {
    user: { username: "runner" },
    deck: deck('Kate "Mac" McCaffrey: Digital Tinker', {
      "Sure Gamble": 3, "Corroder": 3, "Diesel": 3, "Gordian Blade": 3,
      "Daily Casts": 3, "Armitage Codebusting": 3, "Easy Mark": 3, "Infiltration": 3,
    }),
  },
});

const show = (label) => {
  const v = engine.view(game, "corp");
  const r = engine.view(game, "runner");
  console.log(
    `${label}: turn=${v.turn} active=${v["active-player"]} corp(credits=${v.corp.credit}, clicks=${v.corp.click}, hand=${v.corp.hand.length})`,
    `runner(credits=${r.runner.credit}, clicks=${r.runner.click}, hand=${r.runner.hand.length})`,
    `corp sees runner hand: ${JSON.stringify(v.runner.hand).slice(0, 40)}`,
  );
};

const choose = (side, value) => {
  const prompt = engine.view(game, side)[side]["prompt-state"];
  const choice = prompt.choices.find((c) => c.value === value);
  return engine.act(game, side, "choice", { eid: prompt.eid, choice: { uuid: choice.uuid } });
};

show("start");
choose("corp", "Keep");
choose("runner", "Keep");
show("kept");
console.log("start-turn", engine.act(game, "corp", "start-turn", null).ok);
show("corp turn");
for (let i = 0; i < 2; i++) engine.act(game, "corp", "credit", null);
const hand = engine.view(game, "corp").corp.hand;
const card = hand.find((c) => c.type === "Operation" && c.cost <= 7) ?? hand.find((c) => c.type !== "Operation");
console.log("corp plays", card.title);
engine.act(game, "corp", "play", card.type === "Operation" ? { card } : { card, server: "New remote" });
show("corp clicked");
const res = engine.act(game, "corp", "end-turn", null);
console.log("diff keys", Object.keys(res.diffs), JSON.stringify(res.diffs.runner).length, "bytes runner diff");
engine.act(game, "runner", "start-turn", null);
show("runner turn");
engine.act(game, "runner", "run", { server: "HQ" });
let rv = engine.view(game, "runner");
console.log("run:", JSON.stringify(rv.run)?.slice(0, 200));
for (let i = 0; i < 6 && engine.view(game, "runner").run; i++) {
  const p = engine.view(game, "runner").runner["prompt-state"];
  if (p && p.choices && p.choices.length) {
    console.log("prompt:", p.msg, p.choices.map((c) => c.value));
    choose("runner", p.choices[0].value);
  } else {
    engine.act(game, "runner", "continue", null);
  }
}
show("after run");
const log = engine.view(game, "runner").log;
console.log("log entries:", log.length);
console.log(JSON.stringify(log.slice(-6), null, 1).slice(0, 1500));
console.log("view size runner:", JSON.stringify(engine.view(game, "runner")).length);

const ftl = async (lang) =>
  (await Promise.all(["messages.ftl", "ui.ftl"].map((f) =>
    readFile(new URL(`../../resources/public/i18n/${lang}/${f}`, import.meta.url), "utf8")))).join("\n");
engine.loadDictionary("en", await ftl("en"));
engine.loadDictionary("fr", await ftl("fr"));
for (const lang of ["en", "fr"]) {
  engine.setLanguage(lang);
  console.log(`--- log (${lang})`);
  for (const entry of engine.view(game, "runner").log.slice(-8)) console.log(engine.renderMessage(entry.text));
  console.log("prompt:", engine.renderMessage(engine.view(game, "corp").corp["prompt-state"]?.msg));
}
