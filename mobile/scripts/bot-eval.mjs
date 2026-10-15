import { readFile } from "node:fs/promises";
import * as engine from "../engine/engine.js";
import { HeuristicBot } from "../src/bot/heuristic.ts";
import { basicCommands, cardCommands, promptOf, runCommands } from "../src/game/actions.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const cards = JSON.parse(await read("../public/data/cards.json"));
const byTitle = new Map(cards.map((c) => [c.title, c]));
engine.loadCards(cards);
engine.loadDictionary("en", (await read("../public/i18n/en/messages.ftl")) + (await read("../public/i18n/en/ui.ftl")));
const matchups = engine.precons();

const games = Number(process.argv[2] ?? 20);
const mode = process.argv[3] ?? "bot-vs-random";
const matchArg = process.argv[4];
const maxActions = 3000;

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
const lookup = (title) => byTitle.get(title);

function visibleCards(view) {
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

function randomMove(view, side, pick) {
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  const out = [];
  if (prompt && ptype !== "run") {
    if (ptype === "waiting") return null;
    const choices = prompt.choices;
    if (ptype === "select") for (const c of visibleCards(view)) if ((prompt.selectable ?? []).includes(c.cid)) out.push({ command: "select", args: { card: c, eid: prompt.eid } });
    if (Array.isArray(choices)) {
      for (const c of choices) if (c.value !== "Hide") out.push({ command: "choice", args: { eid: prompt.eid, choice: { uuid: c.uuid } } });
    } else if (choices === "credit") out.push({ command: "choice", args: { eid: prompt.eid, choice: 0 } });
    else if (ptype === "trace") out.push({ command: "choice", args: { eid: prompt.eid, choice: pick(Number(choices) + 1) } });
    else if (choices?.number != null) out.push({ command: "choice", args: { eid: prompt.eid, choice: choices.minimum ?? 0 } });
    else if (choices?.counter) out.push({ command: "choice", args: { eid: prompt.eid, choice: 0 } });
    else if (choices?.["card-title"] !== undefined) out.push({ command: "choice", args: { eid: prompt.eid, choice: "Hedge Fund" } });
    if (!out.length) out.push({ say: "/close-prompt" });
    return out[pick(out.length)];
  }
  const base = view.run || view.encounters ? runCommands(view, side) : basicCommands(view, side);
  for (const c of base) if (c.enabled !== false && c.command !== "toggle-auto-no-action" && c.command !== "generate-runnable-zones") out.push({ command: c.command, args: c.args ?? null });
  if (view["active-player"] === side && !view.run && view[side].click > 0) {
    for (const s of ["HQ", "R&D", "Archives"]) if (side === "runner") out.push({ command: "run", args: { server: s } });
    for (const card of visibleCards(view)) {
      for (const c of cardCommands(card, view, side)) {
        if (c.enabled === false || c.command === "derez") continue;
        if (c.command === "generate-install-list") out.push({ command: "play", args: { card: c.args.card, server: "New remote" } });
        else out.push({ command: c.command, args: c.args ?? null });
      }
    }
  }
  return out.length ? out[pick(out.length)] : null;
}

function playGame(m, players) {
  const seed = Array.from(crypto.getRandomValues(new Uint32Array(4)));
  const rng = sfc32(...seed);
  let pickState = seed[1];
  const pick = (n) => {
    pickState = (pickState * 1103515245 + 12345) >>> 0;
    return n > 0 ? pickState % n : 0;
  };
  const game = seeded(rng, () =>
    engine.createGame({ gameid: "eval", format: "casual", corp: { user: { username: "corp" }, deck: deck(matchups[m].corp) }, runner: { user: { username: "runner" }, deck: deck(matchups[m].runner) } }),
  );
  const bots = {
    corp: players.corp === "bot" ? new HeuristicBot("corp", lookup, () => pick(1000) / 1000) : null,
    runner: players.runner === "bot" ? new HeuristicBot("runner", lookup, () => pick(1000) / 1000) : null,
  };
  let actions = 0;
  let errors = 0;
  let stuck = false;
  while (actions < maxActions && !engine.winner(game)) {
    const moves = {};
    for (const side of ["corp", "runner"]) {
      const view = engine.view(game, side);
      moves[side] = bots[side] ? bots[side].decide(view) : randomMove(view, side, pick);
    }
    const v = engine.view(game, "corp");
    const prompted = ["corp", "runner"].find((s) => moves[s] && promptOf(engine.view(game, s), s) && promptOf(engine.view(game, s), s)["prompt-type"] !== "run");
    const side = prompted ?? (moves[v["active-player"]] ? v["active-player"] : ["corp", "runner"].find((s) => moves[s]));
    if (!side) {
      stuck = true;
      break;
    }
    const move = moves[side];
    try {
      seeded(rng, () => (move.say ? engine.say(game, side, { username: side }, move.say) : engine.act(game, side, move.command, move.args ?? null)));
    } catch {
      errors++;
    }
    actions++;
  }
  const v = engine.view(game, "corp");
  const lines = v.log.map((e) => engine.renderMessage(e.text));
  const count = (re) => lines.filter((l) => re.test(l)).length;
  const stats = {
    runs: count(/to make a run on/),
    breaches: count(/ breaches /),
    steals: count(/ steals /),
    accesses: count(/ accesses /),
    endRun: count(/end the run|ends the run|jacks out/i),
    rezIce: count(/rezzes .* (protecting|ice)/i),
    breaks: count(/to break/),
    targets: Object.entries(lines.reduce((m, l) => { const t = l.match(/make a run on (.*)\./)?.[1]; if (t) m[t] = (m[t] ?? 0) + 1; return m; }, {})).map(([k, n]) => `${k}:${n}`).join(" "),
    stealsWhere: lines.filter((l) => / steals /.test(l)).length,
    scored: count(/ scores? /),
    runnerCredits: v.runner.credit,
    rig: (v.runner.rig.program ?? []).map((c) => c.title).join("+"),
  };
  return { winner: engine.winner(game), reason: v.reason, turn: v.turn, actions, errors, stuck, points: [v.corp["agenda-point"], v.runner["agenda-point"]], stats };
}

const setups = {
  "bot-vs-random": [{ corp: "bot", runner: "random" }, { corp: "random", runner: "bot" }],
  "bot-vs-bot": [{ corp: "bot", runner: "bot" }],
  "random-vs-random": [{ corp: "random", runner: "random" }],
};
const verbose = process.env.VERBOSE === "1";
for (const players of setups[mode]) {
  const results = [];
  for (let g = 0; g < games; g++) {
    const m = matchArg !== undefined ? Number(matchArg) : g % 2;
    const r = playGame(m, players);
    results.push(r);
    if (verbose) console.log(JSON.stringify({ winner: r.winner, turn: r.turn, points: r.points, ...r.stats }));
  }
  const wins = { corp: 0, runner: 0, none: 0 };
  for (const r of results) wins[r.winner ?? "none"]++;
  const finished = results.filter((r) => r.winner);
  const avg = (xs) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "-");
  const reasons = {};
  for (const r of finished) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  console.log(
    `corp=${players.corp} runner=${players.runner}: ${games} games | corp wins ${wins.corp}, runner wins ${wins.runner}, unfinished ${wins.none} | avg turn ${avg(finished.map((r) => r.turn))}, avg actions ${avg(finished.map((r) => r.actions))} | stuck ${results.filter((r) => r.stuck).length}, errors ${results.reduce((n, r) => n + r.errors, 0)} | reasons ${JSON.stringify(reasons)}`,
  );
}
