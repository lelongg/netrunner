import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as engine from "../engine/engine.js";
import { HeuristicBot } from "../src/bot/heuristic.ts";
import { PolicyBot } from "../src/bot/policy/bot.ts";
import { findPolicy } from "../src/bot/policy/registry.ts";
import "../src/bot/policy/decks/index.ts";
import { coreDeck } from "../src/bot/policy/decks/core.ts";
import { promptOf, runCommands } from "../src/game/actions.ts";
import { candidateActions } from "../src/game/candidates.ts";
import { gameLines, logLines } from "../src/game/describe.ts";

const args = parseArgs(process.argv.slice(2));
if (args.help || (!args.new && !args.state)) {
  console.log(`Play a game against the bot from this terminal, one decision per call.
  --new --side corp|runner [--matchup 0|1 | --corp-deck KEY --runner-deck KEY] [--seed N] [--bot policy|heuristic] --state FILE   start a game
  --state FILE                          show the board and the actions
  --state FILE --act ID [--amount N] [--text T]   perform one action, then let the bot play until the next decision
  --state FILE --log N                  show the last N log lines`);
  process.exit(0);
}

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const cards = JSON.parse(read("../public/data/cards.json"));
const byTitle = new Map(cards.map((c) => [c.title, c]));
engine.loadCards(cards);
engine.loadDictionary("en", read("../public/i18n/en/messages.ftl") + read("../public/i18n/en/ui.ftl"));
engine.setLanguage("en");
const matchups = engine.precons();
const lookup = (title) => byTitle.get(title);
const render = (m) => {
  try {
    return engine.renderMessage(m).replace(/\[(?:their|pronoun)\]/g, "their").replace(/\[(they|them|theirs|themself)\]/g, "$1");
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
const other = (s) => (s === "corp" ? "runner" : "corp");

const statePath = String(args.state);
let state;
if (args.new) {
  state = { seed: Number(args.seed ?? Date.now() % 1000000), matchup: Number(args.matchup ?? 0), decks: { corp: args["corp-deck"] ? String(args["corp-deck"]) : null, runner: args["runner-deck"] ? String(args["runner-deck"]) : null }, side: String(args.side ?? "runner"), bot: String(args.bot ?? "policy"), log: [], seen: 0 };
  writeFileSync(statePath, JSON.stringify(state));
} else {
  if (!existsSync(statePath)) throw new Error(`no game at ${statePath}; start one with --new`);
  state = JSON.parse(readFileSync(statePath, "utf8"));
}

const me = state.side;
const botSide = other(me);
const base = matchups[state.matchup];
const pickDeck = (key, side) => {
  const d = coreDeck(key);
  if (!d || d.side !== side) throw new Error(`Unknown ${side} core deck: ${key}`);
  return d;
};
const m = { ...base, corp: state.decks?.corp ? pickDeck(state.decks.corp, "corp") : base.corp, runner: state.decks?.runner ? pickDeck(state.decks.runner, "runner") : base.runner };
const seedWords = [state.seed, hash32(`${state.seed}:a`), hash32(`${state.seed}:b`), hash32(`${state.seed}:c`)];
const rng = sfc32(...seedWords);
const game = seeded(rng, () => engine.createGame({ gameid: `llm-${state.seed}`, format: "casual", corp: { user: { username: "corp" }, deck: deck(m.corp) }, runner: { user: { username: "runner" }, deck: deck(m.runner) } }));
let s = (hash32(`${state.seed}:bot`) >>> 0) || 1;
const botRandom = () => {
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 4294967296;
};
const precon = m[botSide];
const match = state.bot === "heuristic" ? null : findPolicy(botSide, { identity: precon.identity, cards: precon.cards });
const bot = state.bot === "heuristic" ? new HeuristicBot(botSide, lookup, botRandom) : new PolicyBot(botSide, match?.policy ?? null, lookup, { random: botRandom, render, record: true, rescue: true, deck: { identity: precon.identity, cards: precon.cards } });

const aligned = (side, a) => {
  const eid = a?.eid;
  if (!eid || typeof eid !== "object") return a ?? null;
  const current = promptOf(engine.view(game, side), side)?.eid;
  return current && current.eid !== eid.eid ? { ...a, eid: current } : a;
};
const apply = (side, move) => {
  const strip = (v) => JSON.stringify({ ...v, sequence: 0, corp: { ...v.corp, toast: 0 }, runner: { ...v.runner, toast: 0 } });
  const before = strip(engine.view(game, side));
  try {
    seeded(rng, () => (move.say ? engine.say(game, side, { username: side }, move.say) : engine.act(game, side, move.command, aligned(side, move.args))));
  } catch (e) {
    return false;
  }
  return strip(engine.view(game, side)) !== before;
};
let replayed = 0;
const replayEntry = ([side, command, a]) => {
  const move = command === "say" ? { say: a } : { command, args: a };
  if (side === botSide && args.records) {
    const now = bot.decide(engine.view(game, botSide));
    if (now && JSON.stringify([now.command, now.say ?? null]) !== JSON.stringify([move.command, move.say ?? null])) console.log(`DECISION DRIFT at entry ${replayed}: logged ${command}, now ${now.command}`);
  }
  const ok = apply(side, move);
  if (!ok) console.log(`REPLAY MISMATCH at entry ${replayed}: ${side} ${command} ${JSON.stringify(a).slice(0, 80)}`);
  replayed++;
  if (side === botSide) bot.applied?.(move);
  else bot.decide(engine.view(game, botSide));
};

const view = (side) => engine.view(game, side);
const blockingPrompt = (side) => {
  const p = promptOf(view(side), side);
  return p && p["prompt-type"] !== "run" && p["prompt-type"] !== "waiting";
};
const PASS = new Set(["continue", "start-next-phase", "start-turn", "end-phase-12", "phase-12-pass-priority", "end-post-discard", "post-discard-pass-priority"]);

function myCandidates() {
  return candidateActions(view(me), me, render).filter((c) => c.command !== "toggle-auto-no-action");
}

function autoMove() {
  const v = view(me);
  if (v.winner) return null;
  const toast = v[me]?.toast?.[0];
  if (toast) return { command: "toast", args: { id: toast.id } };
  if (blockingPrompt(me)) {
    const p = promptOf(v, me);
    const list = Array.isArray(p.choices) ? p.choices.filter((c) => c.value !== "Hide") : [];
    if (p["prompt-type"] !== "select" && list.length === 1 && !(p.selectable ?? []).length) return { command: "choice", args: { eid: p.eid, choice: { uuid: list[0].uuid } } };
    return null;
  }
  const cands = myCandidates();
  if (!cands.length) return null;
  if (v.run || v.encounters) {
    const runCmds = runCommands(v, me).filter((c) => c.enabled !== false && c.command !== "toggle-auto-no-action");
    if (!runCmds.length) return null;
    const ice = v.encounters?.ice;
    const live = ice?.rezzed && (ice.subroutines ?? []).some((s) => !s.broken && !s.fired);
    if (me === "corp") {
      const fire = runCmds.find((c) => c.command === "unbroken-subroutines");
      if (fire) return { command: fire.command, args: fire.args };
      const rez = runCmds.find((c) => c.command === "rez");
      if (rez) return null;
      const next = runCmds.find((c) => c.command === "continue");
      return next ? { command: next.command, args: next.args } : null;
    }
    if (v.encounters && live) return null;
    const jack = runCmds.find((c) => c.command === "jack-out");
    if (jack && v.run?.phase === "movement" && v.run.position > 0) return null;
    const next = runCmds.find((c) => c.command === "start-next-phase") ?? runCmds.find((c) => c.command === "continue");
    return next ? { command: next.command, args: next.args } : null;
  }
  const step = cands.find((c) => PASS.has(c.command));
  if (step && cands.length === 1) return { command: step.command, args: step.args };
  if (step && v["active-player"] !== me) return { command: step.command, args: step.args };
  return null;
}

let cachedMove = { seq: -1, move: null };
function botMove() {
  const v = view(botSide);
  if (v.winner) return null;
  if (cachedMove.seq === v.sequence) return cachedMove.move;
  cachedMove = { seq: v.sequence, move: bot.decide(v) };
  return cachedMove.move;
}

function whoseTurn() {
  const vc = view("corp");
  if (vc.winner) return null;
  const v = view(me);
  const inRun = !!(v.run || v.encounters);
  const mine = blockingPrompt(me) || myCandidates().some((c) => PASS.has(c.command)) || (inRun ? runCommands(v, me).some((c) => c.enabled !== false && c.command !== "toggle-auto-no-action") : vc["active-player"] === me && !vc["end-turn"] && myCandidates().length > 0) || !!v[me]?.toast?.length;
  const theirs = botMove();
  if (blockingPrompt(me)) return "me";
  if (theirs && blockingPrompt(botSide)) return "bot";
  const active = vc["active-player"];
  if (active === me && mine && !vc["end-turn"]) return "me";
  if (theirs) return "bot";
  return mine ? "me" : null;
}

function step() {
  let guard = 0;
  while (guard++ < 400) {
    const who = whoseTurn();
    if (!who) return;
    if (who === "bot") {
      const mv = botMove();
      if (!mv) return;
      apply(botSide, mv);
      bot.applied?.(mv);
      state.log.push([botSide, mv.say ? "say" : mv.command, mv.say ?? mv.args ?? null]);
      continue;
    }
    const auto = autoMove();
    if (!auto) return;
    apply(me, auto);
    state.log.push([me, auto.command, auto.args ?? null]);
  }
}

for (const entry of state.log) replayEntry(entry);

if (args.act !== undefined) {
  const cands = myCandidates();
  const id = Number(args.act);
  const c = cands[id - 1];
  if (!c) throw new Error(`no action ${id}`);
  let a = c.args;
  if (c.amount) a = { ...a, choice: Number(args.amount) };
  if (c.text) a = { ...a, choice: String(args.text) };
  const move = c.say ? { say: c.say } : { command: c.command, args: a };
  const before = JSON.stringify(view(me));
  const ok = apply(me, move);
  if (!ok || JSON.stringify(view(me)) === before) console.log("REFUSED: the engine did not accept that action.\n");
  else state.log.push([me, c.say ? "say" : c.command, c.say ?? a ?? null]);
}
if (args.act !== undefined || args.new || args.step) step();
writeFileSync(statePath, JSON.stringify(state));

const v = view(me);
const lines = gameLines(v, me, { render });
const logs = logLines(v, render).filter((t) => t && !/^\s*\[hr\]\s*$/i.test(t));
const fresh = logs.slice(state.seen);
state.seen = logs.length;
writeFileSync(statePath, JSON.stringify(state));
if (args.records) {
  const recs = (bot.records ?? []).filter((r) => r.stage !== "idle" && r.stage !== "turn").slice(-Number(args.records));
  for (const r of recs) console.log(`T${r.turn} ${r.stage} plan=${r.plan?.kind ?? "-"} => ${r.chosen ? `${r.chosen.kind}: ${r.chosen.why} [${r.chosen.score.toFixed(1)}]` : "nothing"}${r.unhandled ? ` UNHANDLED ${r.unhandled}` : ""}\n    alt: ${r.considered.slice(1, 4).map((c) => `${c.score.toFixed(0)} ${c.why}`).join(" / ")}`);
  process.exit(0);
}
if (args.log) {
  console.log(logs.slice(-Number(args.log)).join("\n"));
  process.exit(0);
}
console.log(lines.map(([, t]) => t).join("\n"));
console.log("\nLog since last look:");
console.log(fresh.slice(-40).map((t) => `  ${t}`).join("\n") || "  (nothing)");
if (!v.winner) {
  const cands = myCandidates();
  console.log("\nActions:");
  cands.forEach((c, i) => console.log(`  ${i + 1}. ${c.label}${c.amount ? ` (amount ${c.amount.min}-${c.amount.max})` : ""}${c.text ? " (text)" : ""}`));
}
