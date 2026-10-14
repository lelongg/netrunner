import { readFile, writeFile } from "node:fs/promises";
import * as engine from "../engine/engine.js";
import { basicCommands, cardCommands, promptOf, runCommands } from "../src/game/actions.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const cards = JSON.parse(await read("../public/data/cards.json"));
const byTitle = new Map(cards.map((c) => [c.title, c]));
engine.loadCards(cards);
engine.loadDictionary("en", (await read("../public/i18n/en/messages.ftl")) + (await read("../public/i18n/en/ui.ftl")));
const matchups = engine.precons();

const games = Number(process.argv[2] ?? 20);
const maxActions = Number(process.argv[3] ?? 1500);
const only = process.argv[4] !== undefined ? Number(process.argv[4]) : undefined;

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
const seeded = (rng, f) => {
  const random = Math.random;
  Math.random = rng;
  try {
    return f();
  } finally {
    Math.random = random;
  }
};
const deck = (p) => ({ identity: byTitle.get(p.identity), cards: p.cards.map(({ qty, title }) => ({ qty, card: byTitle.get(title) })) });

function visibleCards(view, side) {
  const out = [];
  const walk = (x) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (x.cid && (x.zone || x.type === "Identity")) out.push(x);
    for (const v of Object.values(x)) if (v && typeof v === "object") walk(v);
  };
  walk(view.corp);
  walk(view.runner);
  return out;
}

function candidates(view, side, pick) {
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  const out = [];
  if (prompt && ptype !== "run" && ptype !== "waiting") {
    const choices = prompt.choices;
    if (ptype === "select") {
      for (const c of visibleCards(view, side)) if ((prompt.selectable ?? []).includes(c.cid)) out.push(["select", { card: c, eid: prompt.eid }]);
    }
    if (Array.isArray(choices)) {
      for (const c of choices) if (c.value !== "Hide") out.push(["choice", { eid: prompt.eid, choice: { uuid: c.uuid } }]);
    } else if (choices === "credit") out.push(["choice", { eid: prompt.eid, choice: pick(view[side].credit + 1) }]);
    else if (ptype === "trace") out.push(["choice", { eid: prompt.eid, choice: pick(Number(choices) + 1) }]);
    else if (choices?.number != null) out.push(["choice", { eid: prompt.eid, choice: (choices.minimum ?? 0) + pick(choices.number - (choices.minimum ?? 0) + 1) }]);
    else if (choices?.counter) out.push(["choice", { eid: prompt.eid, choice: pick(2) }]);
    else if (choices?.["card-title"] !== undefined) out.push(["choice", { eid: prompt.eid, choice: "Hedge Fund" }]);
    if (prompt["offer-bad-pub?"]) out.push(["bad-pub-choice", { eid: prompt.eid }]);
    return out;
  }
  const base = view.run || view.encounters ? runCommands(view, side) : basicCommands(view, side);
  for (const c of base) if (c.enabled !== false && c.command !== "toggle-auto-no-action") out.push([c.command, c.args ?? null, c.then]);
  for (const card of visibleCards(view, side)) {
    for (const c of cardCommands(card, view, side)) {
      if (c.enabled === false || c.command === "derez") continue;
      out.push([c.command, c.args ?? null, c.then]);
    }
  }
  return out;
}

const failures = [];
for (let g = 0; g < games; g++) {
  const m = only ?? g % matchups.length;
  const seed = Array.from(crypto.getRandomValues(new Uint32Array(4)));
  const rng = sfc32(...seed);
  let pickState = seed[0];
  const pick = (n) => {
    pickState = (pickState * 1103515245 + 12345) >>> 0;
    return n > 0 ? pickState % n : 0;
  };
  const setup = { gameid: `fuzz-${g}`, format: "casual", corp: { user: { username: "corp" }, deck: deck(matchups[m].corp) }, runner: { user: { username: "runner" }, deck: deck(matchups[m].runner) } };
  const game = seeded(rng, () => engine.createGame(setup));
  const log = [];
  let n = 0;
  let errors = 0;
  while (n < maxActions && !engine.winner(game)) {
    const sides = ["corp", "runner"];
    const options = sides.map((s) => [s, candidates(engine.view(game, s), s, pick)]).filter(([, c]) => c.length);
    if (!options.length) {
      const v = engine.view(game, "corp");
      const r = engine.view(game, "runner");
      const brief = (p) => p && { type: p["prompt-type"], msg: engine.renderMessage(p.msg), choices: JSON.stringify(p.choices)?.slice(0, 200), selectable: p.selectable?.length };
      failures.push({
        kind: "stuck", m, seed, n,
        state: { active: v["active-player"], turn: v.turn, endTurn: v["end-turn"], corpClick: v.corp.click, runnerClick: r.runner.click, run: v.run, p12: [v["corp-phase-12"], v["runner-phase-12"]], post: [v["corp-post-discard"], v["runner-post-discard"]] },
        corpPrompt: brief(v.corp["prompt-state"]), runnerPrompt: brief(r.runner["prompt-state"]),
        last: log.slice(-4).map(([s, c]) => `${s}:${c}`),
      });
      break;
    }
    const [side, list] = options[pick(options.length)];
    const [command, args, then] = list[pick(list.length)];
    log.push([side, command, args]);
    try {
      seeded(rng, () => engine.act(game, side, command, args));
      if (then === "install-list") {
        const v = engine.view(game, side);
        const opts = side === "corp" ? v.corp["install-list"] : v.runner["runnable-list"];
        if (opts?.length) {
          const server = opts[pick(opts.length)];
          const follow = side === "corp" ? [server === "Expend" ? "expend" : "play", { card: args.card, server }] : ["run", { server }];
          log.push([side, ...follow]);
          seeded(rng, () => engine.act(game, side, ...follow));
        }
      }
    } catch (e) {
      errors++;
      failures.push({ kind: "exception", m, seed, n, command, message: String(e?.message ?? e).slice(0, 300), stack: String(e?.stack ?? "").split("\n").slice(0, 12).join("\n"), log: log.slice() });
      if (errors > 3) break;
    }
    n++;
  }
  console.log(`game ${g} match ${m}: ${n} actions, winner ${engine.winner(game) ?? "-"}, errors ${errors}`);
}

const summary = failures.map(({ log, ...f }) => f);
console.log(JSON.stringify(summary, null, 1).slice(0, 6000));
await writeFile(new URL("../fuzz-failures.json", import.meta.url), JSON.stringify(failures));
