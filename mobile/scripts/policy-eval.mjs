import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import * as engine from "../engine/engine.js";
import { HeuristicBot } from "../src/bot/heuristic.ts";
import { PolicyBot } from "../src/bot/policy/bot.ts";
import { engineSimulator } from "../src/bot/policy/simulate.ts";
import { engineTrial } from "../src/bot/policy/trial.ts";
import { positionFeatures } from "../src/bot/policy/features.ts";
import { fingerprint, findPolicy, listPolicies } from "../src/bot/policy/registry.ts";
import "../src/bot/policy/decks/index.ts";
import { CORE_CORP_DECKS, CORE_RUNNER_DECKS, coreDeck } from "../src/bot/policy/decks/core.ts";
import { parseDecklist } from "../src/decks.ts";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { basicCommands, cardCommands, promptOf, runCommands } from "../src/game/actions.ts";
import { gameLines, logLines, serverName } from "../src/game/describe.ts";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Usage: node --experimental-strip-types scripts/policy-eval.mjs [options]
  --games N          games to play (default 10)
  --corp KIND        policy | ref | heuristic | random (default policy)
  --runner KIND      policy | ref | heuristic | random (default policy)
  --ref COMMIT       the frozen policy checkout that "ref" plays (default: scripts/policy-reference.json)
  --matchup I        preconstructed matchup index: 0 beginner, 1 intermediate (default 0)
  --corp-deck KEY    core deck for the Corp (core-hb, core-jinteki, core-nbn, core-weyland) instead of the matchup's
  --runner-deck KEY  core deck for the Runner (core-anarch, core-criminal, core-shaper) instead of the matchup's
  --grid             play every core Corp deck against every core Runner deck and print the table
  --corp-list FILE   a decklist text file (one "3x Card" per line, identity first) for the Corp
  --runner-list FILE a decklist text file for the Runner
  --split NAME       seed set: design | tune | test (default design); seeds never overlap between splits
  --seed N           base seed inside the split (default 1)
  --max-actions N    actions before a game is declared unfinished (default 3000)
  --out DIR          write games.jsonl, situations.jsonl and situations.md there
  --full             keep every decision record in games.jsonl (large)
  --verbose          print one line per game
  --positions FILE   append one JSON line per Corp turn start (features and the game's outcome) for the learned evaluation
  --weights FILE     learned evaluation weights (from scripts/fit-eval.mjs) used as the turn search's leaf value
  --search KIND      turn search for the Corp: 1 | corp | both (default off)`);
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
const here = fileURLToPath(new URL(".", import.meta.url));
const reference = JSON.parse(readFileSync(join(here, "policy-reference.json"), "utf8"));
const refCommit = String(args.ref ?? reference.commit);
const ref = ["corp", "runner"].some((s) => args[s] === "ref") ? await loadReference(refCommit) : null;

async function loadReference(commit) {
  const git = (...a) => execFileSync("git", a, { cwd: here, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  const sha = git("rev-parse", "--verify", `${commit}^{commit}`);
  const dir = join(here, "..", ".policy-ref", sha.slice(0, 12));
  if (!existsSync(join(dir, "mobile", "src", "bot", "policy", "bot.ts"))) {
    if (existsSync(dir)) git("worktree", "remove", "--force", dir);
    git("worktree", "add", "--detach", dir, sha);
  }
  const policy = join(dir, "mobile", "src", "bot", "policy");
  const { PolicyBot } = await import(join(policy, "bot.ts"));
  const { findPolicy, listPolicies } = await import(join(policy, "registry.ts"));
  await import(join(policy, "decks", "index.ts"));
  const { coreDeck } = await import(join(policy, "decks", "core.ts"));
  return { sha, dir, PolicyBot, findPolicy, listPolicies, coreDeck };
}
const cardDb = { all: cards, byTitle, byCode: new Map(cards.map((c) => [c.code, c])) };
const listDeck = (file, side) => {
  const deck = parseDecklist(readFileSync(file, "utf8"), side, cardDb, file);
  return { key: `list:${file}`, name: `${deck.identity.title} (${file.replace(/^.*\//, "")})`, identity: deck.identity.title, cards: deck.cards.map((e) => ({ qty: e.qty, title: e.card.title })) };
};

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

function makePlayer(kind, side, precon, random, game) {
  if (kind === "random") return { kind, id: "random", decide: null };
  if (kind === "heuristic") return { kind, id: "heuristic", bot: new HeuristicBot(side, lookup, random) };
  const tree = kind === "ref" ? ref : { PolicyBot, findPolicy };
  const match = tree.findPolicy(side, { identity: precon.identity, cards: precon.cards });
  const simulate = kind === "ref" || args.sim === "0" || (typeof args.sim === "string" && args.sim !== side && args.sim !== "both") ? undefined : engineSimulator(engine, game, side);
  const holder = {};
  const trial = simulate && args.trial !== "0" ? engineTrial(engine, game, side, (v, s) => holder.bot.trialMove(v, s)) : undefined;
  const bot = new tree.PolicyBot(side, match?.policy ?? null, lookup, { random, render, record: true, rescue: false, deck: { identity: precon.identity, cards: precon.cards }, simulate, trial, simWeight: args["sim-weight"] != null ? Number(args["sim-weight"]) : undefined, search: args.search === "1" || args.search === side || args.search === "both", searchWeight: args["search-weight"] != null ? Number(args["search-weight"]) : undefined, searchCap: args["search-cap"] != null ? Number(args["search-cap"]) : undefined, measuredBase: args["measured-base"] != null ? Number(args["measured-base"]) : undefined, weights });
  holder.bot = bot;
  const id = `${kind === "ref" ? `ref@${ref.sha.slice(0, 7)}:` : ""}${bot.policyId}${match && !match.exact ? " (nearest deck)" : ""}`;
  return { kind, id, bot, fallback: !match };
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

function playGame({ seed, matchup, players, maxActions, full, m = matchups[matchup] }) {
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
  const P = { corp: makePlayer(players.corp, "corp", m.corp, botRandom("corp"), game), runner: makePlayer(players.runner, "runner", m.runner, botRandom("runner"), game) };
  const situations = [];
  const actions = [];
  let n = 0;
  let errors = 0;
  let stuck = false;
  let decisionMs = { corp: [], runner: [] };
  const lastPlan = { corp: null, runner: null };
  const mistakes = {};
  const note = (k) => (mistakes[k] = (mistakes[k] ?? 0) + 1);
  let lastRunServer = null;
  let runnerPoints = 0;
  const thinInstalls = [];
  const remoteAgendas = (view) => Object.entries(view.corp?.servers ?? {}).flatMap(([key, s]) => (key.startsWith("remote") ? (s.content ?? []).filter((c) => c.type === "Agenda").map((c) => ({ key, cid: c.cid, card: c, ices: s.ices ?? [] })) : []));
  let knownAgendas = new Set();
  const planChanges = { corp: 0, runner: 0 };
  let planTurn = "";
  const idle = { corp: { turn: -1, kinds: [] }, runner: { turn: -1, kinds: [] } };
  const positions = [];
  let positionTurn = -1;
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
        if (positionsFile && side === "corp" && rec?.stage === "click" && views.corp.turn !== positionTurn && Number(views.corp.corp?.click ?? 0) === 3) {
          positionTurn = views.corp.turn;
          positions.push({ seed, matchup: m.key ?? matchup, turn: views.corp.turn, features: positionFeatures(p.bot.observeView(views.corp)) });
        }
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
    if (v.run?.server?.[0]) lastRunServer = serverName(String(v.run.server[0]));
    const pts = Number(v.runner?.["agenda-point"] ?? 0);
    if (pts > runnerPoints && lastRunServer) {
      const thin = thinInstalls.find((x) => x.server === lastRunServer && Number(v.turn) - x.turn <= 2);
      if (thin) note("corp:thin-install-stolen");
      if (/^Server/.test(lastRunServer)) {
        note("corp:stolen-from-remote");
        if (P.corp.bot instanceof PolicyBot && mistakes["corp:stolen-from-remote"] <= 2) situations.push(snapshot(v, "corp", P.corp.bot, P.corp.bot.records[P.corp.bot.records.length - 1], "remote-steal", `an agenda was stolen from ${lastRunServer}`));
      }
    }
    runnerPoints = pts;
    const prompted = ["corp", "runner"].find((s) => moves[s] && promptOf(views[s], s) && promptOf(views[s], s)["prompt-type"] !== "run");
    const side = prompted ?? (moves[v["active-player"]] ? v["active-player"] : ["corp", "runner"].find((s) => moves[s]));
    if (!side) {
      stuck = true;
      for (const s of ["corp", "runner"]) if (P[s].bot instanceof PolicyBot) situations.push(snapshot(views[s], s, P[s].bot, P[s].bot.records[P[s].bot.records.length - 1], "stuck", "nobody could move: the game is blocked"));
      break;
    }
    const move = moves[side];
    if (move.command === "credit" && Number(views[side][side]?.credit ?? 0) >= (side === "corp" ? 12 : 10)) {
      note(`${side}:rich-credit-click`);
      if (P[side].bot instanceof PolicyBot && (mistakes[`${side}:rich-credit-click`] ?? 0) <= 2) situations.push(snapshot(views[side], side, P[side].bot, P[side].bot.records[P[side].bot.records.length - 1], "rich-click", "clicked for a credit while already rich"));
    }
    actions.push([side, move.say ? "say" : move.command, move.say ?? move.args ?? null]);
    try {
      seeded(rng, () => (move.say ? engine.say(game, side, { username: side }, move.say) : engine.act(game, side, move.command, move.args ?? null)));
    } catch (e) {
      errors++;
      if (args.verbose) {
        const p = promptOf(engine.view(game, side), side);
        console.error(`engine error at action ${n} (${side} ${move.command} ${JSON.stringify(move.say ?? move.args ?? null)}): ${e?.message ?? JSON.stringify(e)} | prompt: ${p ? `${p["prompt-type"]} "${render(p.msg)}" from ${p.card?.title ?? "?"} choices ${JSON.stringify((p.choices ?? []).map((c) => (typeof c.value === "string" ? c.value : c.title ?? c.value)))}` : "none"}`);
      }
    }
    P[side].bot?.applied?.(move);
    if (side === "corp") {
      const now = engine.view(game, "corp");
      for (const a of remoteAgendas(now)) {
        if (knownAgendas.has(a.cid)) continue;
        knownAgendas.add(a.cid);
        const need = Number(a.card.advancementcost ?? a.card["current-advancement-requirement"] ?? 0);
        const runnerCredits = Number(now.runner?.credit ?? 0);
        const grip = Number(now.runner?.["hand-count"] ?? now.runner?.hand?.length ?? 0);
        const unrezzed = a.ices.filter((i) => !i.rezzed).reduce((sum, i) => sum + Number(i["current-rez-cost"] ?? i.cost ?? 0), 0);
        if (a.ices.length <= 1 && need >= 4 && runnerCredits >= 4 && grip >= 3) {
          note("corp:thin-install");
          thinInstalls.push({ turn: Number(now.turn ?? 0), server: serverName(a.key) });
        }
        if (unrezzed > Number(now.corp?.credit ?? 0)) note("corp:unrezzable-install");
      }
    }
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
    return b && "records" in b ? { refused: b.refused, unhandled: b.unhandled, decisions: b.records.length, avgMs: Number(avg(decisionMs[s]).toFixed(3)), maxMs: Number(max(decisionMs[s]).toFixed(2)) } : { avgMs: Number(avg(decisionMs[s]).toFixed(3)), maxMs: Number(max(decisionMs[s]).toFixed(2)) };
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
    mistakes,
    records: full ? { corp: P.corp.bot?.records, runner: P.runner.bot?.records } : undefined,
    positions,
  };
}

const games = Number(args.games ?? 10);
const players = { corp: String(args.corp ?? "policy"), runner: String(args.runner ?? "policy") };
const matchup = Number(args.matchup ?? 0);
const split = String(args.split ?? "design");
const base = Number(args.seed ?? 1);
const maxActions = Number(args["max-actions"] ?? 3000);
const weights = args.weights ? JSON.parse(readFileSync(String(args.weights), "utf8")) : null;
const positionsFile = args.positions ? String(args.positions) : null;
const outRoot = args.out ? String(args.out) : null;
const splitBase = hash32(`split:${split}`) % 1_000_000;
const pickDeck = (key, side) => {
  const d = coreDeck(String(key));
  if (!d || d.side !== side) throw new Error(`Unknown ${side} core deck: ${key}`);
  return d;
};
const chosen = (side) => (args[`${side}-list`] ? listDeck(String(args[`${side}-list`]), side) : args[`${side}-deck`] ? pickDeck(args[`${side}-deck`], side) : null);
const asPlayed = (deck, side) => (players[side] === "ref" && deck.key ? (ref.coreDeck(deck.key) ?? deck) : deck);
const matchupOf = (corp, runner) => ({ key: `${corp.key ?? corp.name}+${runner.key ?? runner.name}`, title: `${corp.name} vs ${runner.name}`, corp: asPlayed(corp, "corp"), runner: asPlayed(runner, "runner") });
const pairs = args.grid
  ? CORE_CORP_DECKS.flatMap((c) => CORE_RUNNER_DECKS.map((r) => matchupOf(c, r)))
  : [chosen("corp") || chosen("runner") ? matchupOf(chosen("corp") ?? matchups[matchup].corp, chosen("runner") ?? matchups[matchup].runner) : matchups[matchup]];

const ci = (k, n) => {
  if (!n) return "";
  const p = k / n;
  const z = 1.96;
  const d = (z * Math.sqrt((p * (1 - p)) / n)).toFixed(2);
  return `±${d}`;
};

async function series(m, out) {
  if (out) await mkdir(out, { recursive: true });
  const results = [];
  const started = performance.now();
  for (let g = 0; g < games; g++) {
    const seed = (splitBase * 1000 + base + g) >>> 0;
    const r = playGame({ seed, matchup, players, maxActions, full: !!args.full, m });
    results.push(r);
    if (positionsFile && r.positions.length) await appendFile(positionsFile, r.positions.map((p) => JSON.stringify({ ...p, winner: r.winner, corpWon: r.winner === "corp" ? 1 : 0, players })).join("\n") + "\n");
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
  console.log(`${m.title} · split ${split} seed ${base} · corp=${players.corp} (${results[0]?.players.corp}) runner=${players.runner} (${results[0]?.players.runner})`);
  console.log(`${games} games in ${elapsed.toFixed(0)}s | corp wins ${wins.corp} (${(wins.corp / games).toFixed(2)} ${ci(wins.corp, games)}), runner wins ${wins.runner} (${(wins.runner / games).toFixed(2)} ${ci(wins.runner, games)}), unfinished ${wins.none} | avg turn ${avg(finished.map((r) => r.turn))}, avg actions ${avg(finished.map((r) => r.actions))} | stuck ${results.filter((r) => r.stuck).length}, engine errors ${sum((r) => r.errors)} | reasons ${JSON.stringify(reasons)}`);
  for (const s of ["corp", "runner"]) {
    const b = results.map((r) => r.bots[s]);
    const policy = b.some((x) => x.decisions != null);
    console.log(`${s}: decision avg ${avg(b.map((x) => x.avgMs))}ms max ${Math.max(...b.map((x) => x.maxMs)).toFixed(1)}ms${policy ? ` | refused ${sum((r) => r.bots[s].refused)}, unhandled ${sum((r) => r.bots[s].unhandled)}` : ""}${results[0]?.fallback[s] ? " | FALLBACK: no deck policy matched, generic policy used" : ""}`);
  }
  const mistakes = {};
  for (const r of results) for (const [k, c] of Object.entries(r.mistakes ?? {})) mistakes[k] = (mistakes[k] ?? 0) + c;
  console.log(`situations: ${JSON.stringify(kinds)}${out ? ` → ${out}` : ""}`);
  console.log(`mistakes over ${games} games: ${JSON.stringify(mistakes)}`);
  if (out) {
    const md = [];
    md.push(`# Situations · ${m.title} · ${players.corp} vs ${players.runner} · split ${split} seed ${base}`, "");
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
        const decks = m.corp.key ? ` --corp-deck ${m.corp.key} --runner-deck ${m.runner.key}` : ` --matchup ${matchup}`;
        md.push(`Replay: \`--split ${split} --seed ${r.seed - splitBase * 1000} --games 1${decks} --corp ${players.corp} --runner ${players.runner}\``, "");
      }
    }
    await writeFile(join(out, "situations.md"), md.join("\n"));
    await writeFile(join(out, "summary.json"), JSON.stringify({ matchup: m.key ?? matchup, title: m.title, decks: { corp: m.corp.name, runner: m.runner.name }, players, split, seed: base, games, wins, reasons, stuck: results.filter((r) => r.stuck).length, errors: sum((r) => r.errors), situations: kinds, mistakes, policies: listPolicies().map((p) => `${p.id}@${p.version}`) }, null, 2));
  }
  return { wins, results, errors: sum((r) => r.errors), stuck: results.filter((r) => r.stuck).length, mistakes };
}

if (ref) console.log(`reference policies: commit ${ref.sha.slice(0, 12)} · ${ref.listPolicies().map((p) => `${p.id}@${p.version}`).join(", ")}`);
const table = [];
for (const m of pairs) {
  const out = outRoot ? (pairs.length > 1 ? join(outRoot, m.key.replace(/[^a-z0-9-]+/gi, "_")) : outRoot) : null;
  const r = await series(m, out);
  table.push({ corpKey: m.corp.key ?? m.corp.name, runnerKey: m.runner.key ?? m.runner.name, ...r.wins, errors: r.errors, stuck: r.stuck, fallback: r.results[0]?.fallback, mistakes: r.mistakes });
}
if (pairs.length > 1) {
  console.log("");
  console.log(`| Corp \\ Runner | ${CORE_RUNNER_DECKS.map((r) => r.name.replace(/ \(SG Only\)$/, "")).join(" | ")} |`);
  console.log(`|---|${CORE_RUNNER_DECKS.map(() => "---").join("|")}|`);
  for (const c of CORE_CORP_DECKS) {
    const cells = CORE_RUNNER_DECKS.map((r) => {
      const t = table.find((x) => x.corpKey === c.key && x.runnerKey === r.key);
      return t ? `${t.corp} (${(t.corp / games).toFixed(2)} ${ci(t.corp, games)})${t.none ? ` · ${t.none} unfinished` : ""}${t.errors ? ` · ${t.errors} errors` : ""}` : "-";
    });
    console.log(`| ${c.name.replace(/ \(SG Only\)$/, "")} | ${cells.join(" | ")} |`);
  }
  console.log("");
  console.log(`Cells are Corp wins out of ${games} games · corp=${players.corp} runner=${players.runner}.`);
  const byDeck = (side, decks) => decks.map((d) => {
    const rows = table.filter((x) => x[`${side}Key`] === d.key);
    const total = {};
    for (const row of rows) for (const [k, c] of Object.entries(row.mistakes ?? {})) if (k.startsWith(`${side}:`)) total[k.slice(side.length + 1)] = (total[k.slice(side.length + 1)] ?? 0) + c;
    return `${d.name.replace(/ \(SG Only\)$/, "")}: ${JSON.stringify(total)}`;
  });
  console.log("");
  console.log(`Corp mistakes per deck over ${games * CORE_RUNNER_DECKS.length} games:`);
  for (const line of byDeck("corp", CORE_CORP_DECKS)) console.log(`  ${line}`);
  console.log(`Runner mistakes per deck over ${games * CORE_CORP_DECKS.length} games:`);
  for (const line of byDeck("runner", CORE_RUNNER_DECKS)) console.log(`  ${line}`);
}
