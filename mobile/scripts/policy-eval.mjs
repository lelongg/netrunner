import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import * as engine from "../engine/engine.js";
import { HeuristicBot } from "../src/bot/heuristic.ts";
import { PolicyBot } from "../src/bot/policy/bot.ts";
import { fingerprint, findPolicy, listPolicies } from "../src/bot/policy/registry.ts";
import "../src/bot/policy/decks/gateway-corp.ts";
import "../src/bot/policy/decks/gateway-runner.ts";
import { basicCommands, cardCommands, promptOf, runCommands } from "../src/game/actions.ts";
import { gameLines, logLines } from "../src/game/describe.ts";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Usage: node --experimental-strip-types scripts/policy-eval.mjs [options]
  --games N          games to play (default 10)
  --corp KIND        heuristic | policy | random (default policy)
  --runner KIND      heuristic | policy | random (default policy)
  --matchup I        preconstructed matchup index: 0 beginner, 1 intermediate (default 0)
  --split NAME       seed set: design | tune | test (default design); seeds never overlap between splits
  --seed N           base seed inside the split (default 1)
  --max-actions N    actions before a game is declared unfinished (default 3000)
  --out DIR          write games.jsonl, situations.jsonl and situations.md there
  --full             keep every decision record in games.jsonl (large)
  --verbose          print one line per game`);
  process.exit(0);
}

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const cards = JSON.parse(await read("../public/data/cards.json"));
const byTitle = new Map(cards.map((c) => [c.title, c]));
engine.loadCards(cards);
engine.loadDictionary("en", (await read("../public/i18n/en/messages.ftl")) + (await read("../public/i18n/en/ui.ftl")));
engine.setLanguage("en");
const matchups = engine.precons();
const lookup = (title) => byTitle.get(title);
const render = (m) => {
  try {
    return engine.renderMessage(m);
  } catch {
    return String(m ?? "");
  }
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

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
const hash32 = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};
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

function makePlayer(kind, side, precon, random) {
  if (kind === "random") return { kind, id: "random", decide: null };
  if (kind === "heuristic") return { kind, id: "heuristic", bot: new HeuristicBot(side, lookup, random) };
  const match = findPolicy(side, { identity: precon.identity, cards: precon.cards });
  const bot = new PolicyBot(side, match?.policy ?? null, lookup, { random, render, record: true, rescue: false });
  return { kind, id: bot.policyId, bot, fallback: !match };
}

const INTERESTING_KINDS = new Set(["refused", "unhandled", "stuck", "idle-turn", "plan-churn", "loss"]);

function snapshot(view, side, bot, record, kind, note) {
  const lines = gameLines(view, side, { render }).map(([, t]) => t);
  const log = logLines(view, render).filter((t) => t && !/^\s*\[hr\]\s*$/i.test(t)).slice(-8);
  return {
    kind,
    note,
    side,
    turn: view.turn,
    policy: bot?.policyId ?? "heuristic",
    plan: record?.plan ?? bot?.plan ?? null,
    chosen: record?.chosen ? { move: record.chosen.move, why: record.chosen.why, kind: record.chosen.kind, score: record.chosen.score } : null,
    considered: (record?.considered ?? []).map((p) => ({ why: p.why, kind: p.kind, score: Number(p.score.toFixed(2)), exact: p.exact })),
    unhandled: record?.unhandled,
    board: lines,
    log,
  };
}

function playGame({ seed, matchup, players, maxActions, full }) {
  const m = matchups[matchup];
  const seedWords = [seed, hash32(`${seed}:a`), hash32(`${seed}:b`), hash32(`${seed}:c`)];
  const rng = sfc32(...seedWords);
  let pickState = seedWords[1] >>> 0;
  const pick = (n) => {
    pickState = (pickState * 1103515245 + 12345) >>> 0;
    return n > 0 ? pickState % n : 0;
  };
  const botRandom = (salt) => {
    let s = (hash32(`${seed}:${salt}`) >>> 0) || 1;
    return () => {
      s = (s * 1103515245 + 12345) >>> 0;
      return s / 4294967296;
    };
  };
  const game = seeded(rng, () =>
    engine.createGame({ gameid: `eval-${seed}`, format: "casual", corp: { user: { username: "corp" }, deck: deck(m.corp) }, runner: { user: { username: "runner" }, deck: deck(m.runner) } }),
  );
  const P = { corp: makePlayer(players.corp, "corp", m.corp, botRandom("corp")), runner: makePlayer(players.runner, "runner", m.runner, botRandom("runner")) };
  const situations = [];
  const actions = [];
  let n = 0;
  let errors = 0;
  let stuck = false;
  let decisionMs = { corp: [], runner: [] };
  const lastPlan = { corp: null, runner: null };
  const planChanges = { corp: 0, runner: 0 };
  let planTurn = "";
  const idle = { corp: { turn: -1, kinds: [] }, runner: { turn: -1, kinds: [] } };
  while (n < maxActions && !engine.winner(game)) {
    const moves = {};
    const views = {};
    for (const side of ["corp", "runner"]) {
      views[side] = engine.view(game, side);
      const p = P[side];
      const t0 = performance.now();
      moves[side] = p.bot ? p.bot.decide(views[side]) : randomMove(views[side], side, pick);
      if (p.bot) decisionMs[side].push(performance.now() - t0);
      if (p.bot instanceof PolicyBot) {
        const rec = p.bot.records[p.bot.records.length - 1];
        if (rec && rec.n === p.bot.records.length - 1 + (p.bot.records.length > 5000 ? 0 : 0)) {
          if (rec.refused) situations.push(snapshot(views[side], side, p.bot, rec, "refused", "the same move was repeated without effect and got banned"));
          if (rec.unhandled && moves[side] === null) situations.push(snapshot(views[side], side, p.bot, rec, "unhandled", rec.unhandled));
          const turnKey = `${views[side].turn}:${views[side]["active-player"]}`;
          if (turnKey !== planTurn) {
            planTurn = turnKey;
            planChanges.corp = 0;
            planChanges.runner = 0;
          }
          if (rec.plan && lastPlan[side] && rec.plan.kind !== lastPlan[side].kind) {
            planChanges[side]++;
            if (planChanges[side] === 3) situations.push(snapshot(views[side], side, p.bot, rec, "plan-churn", `the plan changed ${planChanges[side]} times during one turn`));
          }
          lastPlan[side] = rec.plan;
          if (rec.stage === "click" && rec.chosen) {
            const t = idle[side];
            if (t.turn !== views[side].turn) {
              t.turn = views[side].turn;
              t.kinds = [];
            }
            t.kinds.push(rec.chosen.kind);
            if (t.kinds.length === 3 && t.kinds.every((k) => k === "credit" || k === "draw") && (views[side][side].credit ?? 0) >= 10) situations.push(snapshot(views[side], side, p.bot, rec, "idle-turn", "a whole turn of clicking for credits or cards while already rich"));
          }
        }
      }
    }
    const v = views.corp;
    const prompted = ["corp", "runner"].find((s) => moves[s] && promptOf(views[s], s) && promptOf(views[s], s)["prompt-type"] !== "run");
    const side = prompted ?? (moves[v["active-player"]] ? v["active-player"] : ["corp", "runner"].find((s) => moves[s]));
    if (!side) {
      stuck = true;
      for (const s of ["corp", "runner"]) if (P[s].bot instanceof PolicyBot) situations.push(snapshot(views[s], s, P[s].bot, P[s].bot.records[P[s].bot.records.length - 1], "stuck", "nobody could move: the game is blocked"));
      break;
    }
    const move = moves[side];
    actions.push([side, move.say ? "say" : move.command, move.say ?? move.args ?? null]);
    try {
      seeded(rng, () => (move.say ? engine.say(game, side, { username: side }, move.say) : engine.act(game, side, move.command, move.args ?? null)));
    } catch (e) {
      errors++;
    }
    P[side].bot?.applied?.(move);
    n++;
  }
  const v = engine.view(game, "corp");
  const winner = engine.winner(game);
  for (const s of ["corp", "runner"]) {
    if (winner && winner !== s && P[s].bot instanceof PolicyBot) situations.push(snapshot(engine.view(game, s), s, P[s].bot, P[s].bot.records[P[s].bot.records.length - 1], "loss", `lost by ${v.reason}`));
  }
  const lines = v.log.map((e) => render(e.text));
  const count = (re) => lines.filter((l) => re.test(l)).length;
  const stealsFrom = {};
  lines.forEach((l, i) => {
    if (!/ steals /.test(l)) return;
    const from = lines.slice(Math.max(0, i - 3), i).reverse().map((x) => x.match(/accesses .* from (HQ|R&D|Archives|Server \d+)/)?.[1]).find(Boolean) ?? "?";
    const key = from.startsWith("Server") ? "remote" : from;
    stealsFrom[key] = (stealsFrom[key] ?? 0) + 1;
  });
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const max = (xs) => (xs.length ? Math.max(...xs) : 0);
  const botStats = (s) => {
    const b = P[s].bot;
    return b instanceof PolicyBot ? { refused: b.refused, unhandled: b.unhandled, decisions: b.records.length, avgMs: Number(avg(decisionMs[s]).toFixed(3)), maxMs: Number(max(decisionMs[s]).toFixed(2)) } : { avgMs: Number(avg(decisionMs[s]).toFixed(3)), maxMs: Number(max(decisionMs[s]).toFixed(2)) };
  };
  return {
    seed,
    matchup,
    matchupTitle: m.title,
    players: { corp: P.corp.id, runner: P.runner.id },
    fallback: { corp: !!P.corp.fallback, runner: !!P.runner.fallback },
    decks: { corp: fingerprint({ identity: m.corp.identity, cards: m.corp.cards }), runner: fingerprint({ identity: m.runner.identity, cards: m.runner.cards }) },
    winner,
    reason: v.reason ?? null,
    turn: v.turn,
    actions: n,
    errors,
    stuck,
    points: [v.corp["agenda-point"], v.runner["agenda-point"]],
    stats: { runs: count(/to make a run on/), steals: count(/ steals /), stealsFrom, scored: count(/ scores? /), rezIce: count(/ to rez /i), breaks: count(/to break/), corpCredits: v.corp.credit, runnerCredits: v.runner.credit, rig: (v.runner.rig.program ?? []).map((c) => c.title).join("+") },
    bots: { corp: botStats("corp"), runner: botStats("runner") },
    situations,
    log: actions,
    records: full ? { corp: P.corp.bot?.records, runner: P.runner.bot?.records } : undefined,
  };
}

const games = Number(args.games ?? 10);
const players = { corp: String(args.corp ?? "policy"), runner: String(args.runner ?? "policy") };
const matchup = Number(args.matchup ?? 0);
const split = String(args.split ?? "design");
const base = Number(args.seed ?? 1);
const maxActions = Number(args["max-actions"] ?? 3000);
const out = args.out ? String(args.out) : null;
if (out) await mkdir(out, { recursive: true });
const splitBase = hash32(`split:${split}`) % 1_000_000;
const results = [];
const started = performance.now();
for (let g = 0; g < games; g++) {
  const seed = (splitBase * 1000 + base + g) >>> 0;
  const r = playGame({ seed, matchup, players, maxActions, full: !!args.full });
  results.push(r);
  if (args.verbose) console.log(JSON.stringify({ seed: r.seed, winner: r.winner, reason: r.reason, turn: r.turn, points: r.points, stuck: r.stuck, errors: r.errors, situations: r.situations.map((s) => s.kind).join(","), ...r.stats }));
  if (out) {
    const { situations, ...rest } = r;
    await appendFile(join(out, "games.jsonl"), JSON.stringify(rest) + "\n");
    for (const s of situations) await appendFile(join(out, "situations.jsonl"), JSON.stringify({ seed: r.seed, matchup: r.matchup, players: r.players, split, ...s }) + "\n");
  }
}
const elapsed = (performance.now() - started) / 1000;
const wins = { corp: 0, runner: 0, none: 0 };
for (const r of results) wins[r.winner ?? "none"]++;
const finished = results.filter((r) => r.winner);
const avg = (xs) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "-");
const reasons = {};
for (const r of finished) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
const sum = (f) => results.reduce((n, r) => n + (f(r) ?? 0), 0);
const kinds = {};
for (const r of results) for (const s of r.situations) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
const ci = (k, n) => {
  if (!n) return "";
  const p = k / n;
  const z = 1.96;
  const d = (z * Math.sqrt((p * (1 - p)) / n)).toFixed(2);
  return `±${d}`;
};
console.log(`matchup ${matchup} (${matchups[matchup].title}) · split ${split} seed ${base} · corp=${players.corp} (${results[0]?.players.corp}) runner=${players.runner} (${results[0]?.players.runner})`);
console.log(`${games} games in ${elapsed.toFixed(0)}s | corp wins ${wins.corp} (${(wins.corp / games).toFixed(2)} ${ci(wins.corp, games)}), runner wins ${wins.runner} (${(wins.runner / games).toFixed(2)} ${ci(wins.runner, games)}), unfinished ${wins.none} | avg turn ${avg(finished.map((r) => r.turn))}, avg actions ${avg(finished.map((r) => r.actions))} | stuck ${results.filter((r) => r.stuck).length}, engine errors ${sum((r) => r.errors)} | reasons ${JSON.stringify(reasons)}`);
for (const s of ["corp", "runner"]) {
  const b = results.map((r) => r.bots[s]);
  const policy = b.some((x) => x.decisions != null);
  console.log(`${s}: decision avg ${avg(b.map((x) => x.avgMs))}ms max ${Math.max(...b.map((x) => x.maxMs)).toFixed(1)}ms${policy ? ` | refused ${sum((r) => r.bots[s].refused)}, unhandled ${sum((r) => r.bots[s].unhandled)}` : ""}${results[0]?.fallback[s] ? " | FALLBACK: no deck policy matched, generic policy used" : ""}`);
}
console.log(`situations: ${JSON.stringify(kinds)}${out ? ` → ${out}` : ""}`);
if (out) {
  const md = [];
  md.push(`# Situations · matchup ${matchup} · ${players.corp} vs ${players.runner} · split ${split} seed ${base}`, "");
  md.push(`Each situation shows only what the deciding side could see at that moment. Later revelations are not included.`, "");
  for (const r of results) {
    for (const s of r.situations) {
      md.push(`## ${s.kind} · game seed ${r.seed} · turn ${s.turn} · ${s.side} (${s.policy})`, "", `**Why flagged:** ${s.note}`, "");
      if (s.plan) md.push(`**Plan:** ${s.plan.kind} — ${s.plan.goal} (since turn ${s.plan.since})`, "");
      md.push("**Board (as seen by the deciding side):**", "", "```", ...s.board, "```", "");
      if (s.log.length) md.push("**Recent log:**", "", "```", ...s.log, "```", "");
      if (s.considered.length) md.push("**Candidates considered:**", "", ...s.considered.map((c) => `- ${c.score} · ${c.kind} · ${c.why}${c.exact === false ? " (estimate)" : ""}`), "");
      md.push(`**Chosen:** ${s.chosen ? `${s.chosen.kind} · ${s.chosen.why}` : "nothing"}`, "");
      if (s.unhandled) md.push(`**Unhandled:** ${s.unhandled}`, "");
      md.push(`Replay: \`--split ${split} --seed ${r.seed - splitBase * 1000} --games 1 --matchup ${matchup} --corp ${players.corp} --runner ${players.runner}\``, "");
    }
  }
  await writeFile(join(out, "situations.md"), md.join("\n"));
  await writeFile(join(out, "summary.json"), JSON.stringify({ matchup, players, split, seed: base, games, wins, reasons, stuck: results.filter((r) => r.stuck).length, errors: sum((r) => r.errors), situations: kinds, policies: listPolicies().map((p) => `${p.id}@${p.version}`) }, null, 2));
}
