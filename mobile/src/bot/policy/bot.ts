import type { Side } from "../../engine.ts";
import { basicCommands, promptOf, runCommands } from "../../game/actions.ts";
import { serverName } from "../../game/describe.ts";
import { corpFreeProposals, corpProposals, genericPlan, runnerProposals } from "./generic.ts";
import { emptyMemory, noteRun, observe, updateMemory } from "./observe.ts";
import { type AnyDeck, deckList, fingerprint } from "./registry.ts";
import { cardPrompt } from "./cards.ts";
import { genericPrompt, mulliganProposal, selectMove, selectable } from "./prompts.ts";
import { breakSubChoice, corpRun, runnerRun } from "./runs.ts";
import { isEconomy, isIcebreaker } from "./tactics.ts";
import { evaluate } from "./evaluate.ts";
import { type AsyncSimulator, type SimOutcome, type SimReport, type Simulator, simulatable } from "./simulate.ts";
import type { AsyncTrial, RunTrial, Trial } from "./trial.ts";
import type { DecisionRecord, DeckList, DeckPolicy, Lookup, Memory, Move, Observation, Plan, Proposal } from "./types.ts";

const FREE_KINDS = new Set(["score", "rez-economy", "rez", "end"]);
const TURN_COMMANDS = new Set(["start-turn", "end-phase-12", "phase-12-pass-priority", "end-post-discard", "post-discard-pass-priority"]);

export interface BotOptions {
  random?: () => number;
  render?: (msg: unknown) => string;
  record?: boolean;
  maxRecords?: number;
  rescue?: boolean;
  deck?: AnyDeck;
  simulate?: Simulator;
  trial?: Trial;
  simWeight?: number;
  simulated?: number;
  measuredBase?: number;
}

export interface AsyncTools {
  simulate?: AsyncSimulator;
  trial?: AsyncTrial;
}

interface Context {
  obs: Observation;
  stage: DecisionRecord["stage"];
  ranked: Proposal[];
  unhandled?: string;
  signature: string;
  started: number;
}

function cloneMemory(m: Memory): Memory {
  return { seen: new Map(m.seen), firstSeen: new Map(m.firstSeen), installedAt: new Map(m.installedAt), opponentTitles: new Set(m.opponentTitles), duds: new Set(m.duds), runs: [...m.runs], runsThisTurn: m.runsThisTurn, turnKey: m.turnKey, notes: structuredClone(m.notes) };
}

function driveSync(gen: Generator<Move[], SimReport | null, SimOutcome>, simulate: Simulator): SimReport | null {
  let step = gen.next();
  while (!step.done) step = gen.next(simulate(step.value));
  return step.value;
}

async function driveAsync(gen: Generator<Move[], SimReport | null, SimOutcome>, simulate: AsyncSimulator): Promise<SimReport | null> {
  let step = gen.next();
  while (!step.done) step = gen.next(await simulate(step.value));
  return step.value;
}

const moveKey = (m: Move) => `${m.command}:${m.say ?? ""}:${JSON.stringify(m.args ?? null)}`;

export class PolicyBot {
  readonly side: Side;
  readonly policy: DeckPolicy | null;
  readonly memory: Memory = emptyMemory();
  readonly records: DecisionRecord[] = [];
  plan: Plan | null = null;
  unhandled = 0;
  refused = 0;
  private n = 0;
  private banned = new Set<string>();
  private last = { key: "", signature: "", count: 0 };
  private pending = { key: "", signature: "" };
  private pendingKind: { key: string; kind: string } | null = null;
  private confirmed = false;
  private turnKey = "";
  private pendingRun: { key: string; server: string; accessed: string[]; points: number; breached: boolean; turn: number } | null = null;
  private lookup: Lookup;
  private random: () => number;
  private render: (msg: unknown) => string;
  private record: boolean;
  private maxRecords: number;
  private rescue: boolean;
  private deck: DeckList | null;
  private simulate: Simulator | null;
  private trial: Trial | null;
  private simWeight: number;
  private simulated: number;
  private measuredBase: number;
  private trials = new Map<string, { key: string; trial: RunTrial | null }>();

  constructor(side: Side, policy: DeckPolicy | null, lookup: Lookup, options: BotOptions = {}) {
    this.side = side;
    this.policy = policy && policy.side === side ? policy : null;
    this.lookup = lookup;
    this.random = options.random ?? Math.random;
    this.render = options.render ?? ((m) => (typeof m === "string" ? m : JSON.stringify(m ?? "")));
    this.record = options.record ?? false;
    this.maxRecords = options.maxRecords ?? 5000;
    this.rescue = options.rescue ?? false;
    this.deck = options.deck ? this.ownDeck(deckList(options.deck)) : null;
    this.simulate = options.simulate ?? null;
    this.trial = options.trial ?? null;
    this.simWeight = options.simWeight ?? 1;
    this.simulated = options.simulated ?? 6;
    this.measuredBase = options.measuredBase ?? 24;
  }

  private ownDeck(list: DeckList): DeckList {
    const fp = fingerprint(list);
    return this.policy?.decks.find((d) => fingerprint(d) === fp) ?? list;
  }

  get policyId() {
    return this.policy ? `${this.policy.id}@${this.policy.version}` : `generic-${this.side}`;
  }

  decide(view: any): Move | null {
    if (this.trial) for (const [label, key] of this.trialsWanted(view)) this.storeTrial(label, key, this.trial(label));
    const ctx = this.rank(view);
    if (!ctx) return null;
    if (this.simulate) for (const p of this.toSimulate(ctx)) this.applyReport(p, driveSync(this.simulation(p, ctx.obs), this.simulate));
    return this.choose(ctx);
  }

  async decideAsync(view: any, tools: AsyncTools): Promise<Move | null> {
    if (tools.trial) for (const [label, key] of this.trialsWanted(view)) this.storeTrial(label, key, await tools.trial(label));
    const ctx = this.rank(view);
    if (!ctx) return null;
    if (tools.simulate) for (const p of this.toSimulate(ctx)) this.applyReport(p, await driveAsync(this.simulation(p, ctx.obs), tools.simulate));
    return this.choose(ctx);
  }

  trialMove(view: any, side: Side): Move | null {
    if (!view || view.winner) return null;
    if (side === this.side) {
      const plan = this.plan;
      const obs = observe(view, this.side, cloneMemory(this.memory), this.lookup, this.render, this.random, this.deck);
      const { proposals } = this.consider(obs);
      this.plan = plan;
      return [...proposals].sort((a, b) => b.score - a.score)[0]?.move ?? null;
    }
    const obs = observe(view, side, emptyMemory(), this.lookup, this.render, this.random, null);
    if (obs.prompt && obs.promptType !== "run" && obs.promptType !== "waiting") return [...genericPrompt(obs, null)].sort((a, b) => b.score - a.score)[0]?.move ?? null;
    return (side === "corp" ? corpRun(obs) : runnerRun(obs))?.move ?? null;
  }

  private trialsWanted(view: any): [string, string][] {
    if (this.side !== "runner" || !view || view.winner || view.run || view["active-player"] !== "runner" || !(Number(view.runner?.click ?? 0) > 0)) return [];
    const prompt = promptOf(view, this.side);
    if (prompt && prompt["prompt-type"] !== "run") return [];
    const rig = ["program", "hardware", "resource"].flatMap((z) => (view.runner?.rig?.[z] ?? []).map((c: any) => `${c.cid}${c.counter ? JSON.stringify(c.counter) : ""}`)).join(",");
    const base = `${view.turn}:${view.runner?.click}:${view.runner?.credit}:${view.runner?.hand?.length}:${view.runner?.tag?.total ?? 0}:${rig}`;
    const out: [string, string][] = [];
    for (const [key, server] of Object.entries<any>(view.corp?.servers ?? {})) {
      const ices: any[] = server.ices ?? [];
      if (!ices.length || ices.some((i) => !i.rezzed)) continue;
      const label = serverName(key);
      const sig = `${base}|${ices.map((i) => `${i.cid}:${i.strength ?? ""}:${(i.subroutines ?? []).map((s: any) => (s.broken ? "b" : s.fired ? "f" : "-")).join("")}`).join(",")}|${(server.content ?? []).map((c: any) => `${c.cid}:${c.rezzed ? 1 : 0}`).join(",")}`;
      const cached = this.trials.get(label);
      if (cached?.key === sig) continue;
      out.push([label, sig]);
    }
    return out;
  }

  private storeTrial(label: string, key: string, trial: RunTrial | null) {
    this.trials.set(label, { key, trial });
    const notes = (this.memory.notes.runTrials ??= {}) as Record<string, RunTrial | null>;
    for (const [l, t] of this.trials) notes[l] = t.trial;
    for (const l of Object.keys(notes)) if (!this.trials.has(l)) delete notes[l];
  }

  private rank(view: any): Context | null {
    if (!view || view.winner) return null;
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const turnKey = `${view.turn}:${view["active-player"]}`;
    if (turnKey !== this.turnKey) {
      this.turnKey = turnKey;
      this.banned.clear();
    }
    updateMemory(this.memory, view, this.side);
    if (this.memory.notes.kindsTurn !== turnKey) {
      this.memory.notes.kindsTurn = turnKey;
      this.memory.notes.kinds = [];
      this.memory.notes.pointsAtTurnStart = Number(view[this.side]?.["agenda-point"] ?? 0);
    }
    this.trackRun(view);
    this.memory.notes.scoredPointsThisTurn = Math.max(0, Number(view[this.side]?.["agenda-point"] ?? 0) - Number(this.memory.notes.pointsAtTurnStart ?? 0));
    const obs = observe(view, this.side, this.memory, this.lookup, this.render, this.random, this.deck);
    const { stage, proposals, unhandled } = this.consider(obs);
    const signature = this.signature(obs);
    const ranked = proposals.filter((p) => !this.banned.has(moveKey(p.move))).sort((a, b) => b.score - a.score);
    return { obs, stage, ranked, unhandled, signature, started };
  }

  private toSimulate(ctx: Context): Proposal[] {
    if (ctx.stage !== "click" && ctx.stage !== "free" && ctx.stage !== "prompt") return [];
    const top = ctx.ranked[0]?.score ?? 0;
    return ctx.ranked.slice(0, this.simulated).filter((p) => p.score >= top - 12 * this.simWeight && simulatable(p, ctx.obs));
  }

  private applyReport(p: Proposal, report: SimReport | null) {
    if (!report) return;
    if (report.refused) {
      p.score = -500;
      p.why += " (the engine refused it)";
      return;
    }
    const delta = Math.max(-6, Math.min(6, report.delta));
    p.score += delta * this.simWeight;
    p.why += ` [${report.delta >= 0 ? "+" : ""}${report.delta.toFixed(1)}${report.unresolved ? " unresolved" : ""}]`;
  }

  private *simulation(p: Proposal, obs: Observation): Generator<Move[], SimReport | null, SimOutcome> {
    const before = evaluate(obs.view, this.side);
    const moves = [p.move];
    const memory = cloneMemory(this.memory);
    const plan = this.plan;
    let lastPrompt = "";
    for (let step = 0; step < 6; step++) {
      const out = yield moves;
      if (out.refused) return { refused: true, delta: 0, steps: step, unresolved: false };
      if (!out.view) return null;
      const delta = evaluate(out.view, this.side) - before;
      const prompt = promptOf(out.view, this.side);
      const type = prompt?.["prompt-type"];
      if (!prompt || type === "waiting" || type === "run") return { refused: false, delta, steps: step, unresolved: false };
      const key = `${prompt.eid?.eid ?? ""}:${this.render(prompt.msg)}`;
      if (key === lastPrompt || step === 5) return { refused: false, delta, steps: step, unresolved: true };
      lastPrompt = key;
      const next = observe(out.view, this.side, memory, this.lookup, this.render, this.random, this.deck);
      const answers = this.answerPrompt(next).sort((a, b) => b.score - a.score);
      this.plan = plan;
      if (!answers.length) return { refused: false, delta, steps: step, unresolved: true };
      moves.push(answers[0].move);
    }
    return { refused: false, delta: 0, steps: 6, unresolved: true };
  }

  private choose(ctx: Context): Move | null {
    const { obs, stage, signature, started } = ctx;
    const ranked = [...ctx.ranked].sort((a, b) => b.score - a.score);
    let chosen: Proposal | null = ranked[0] ?? null;
    let refused = false;
    if (chosen) {
      const key = moveKey(chosen.move);
      if (key === this.last.key && signature === this.last.signature) {
        if (++this.last.count >= 2) {
          this.banned.add(key);
          this.refused++;
          refused = true;
          this.last = { key: "", signature: "", count: 0 };
          chosen = ranked.find((p) => !this.banned.has(moveKey(p.move))) ?? null;
        }
      } else if (!this.confirmed) this.last = { key, signature, count: 0 };
      if (chosen) this.pending = { key: moveKey(chosen.move), signature };
    }
    const note = ctx.unhandled;
    if (note) this.unhandled++;
    if (!chosen && note && this.rescue) chosen = this.rescueMove(obs);
    this.pendingKind = chosen && stage === "click" ? { key: moveKey(chosen.move), kind: chosen.kind } : null;
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
    if (this.record) {
      this.records.push({ n: this.n, turn: obs.turn, side: this.side, active: obs.active, stage, plan: this.plan, chosen, considered: ranked.slice(0, 12), refused: refused || undefined, unhandled: note, ms, signature, prompt: obs.prompt ? `${obs.prompt.card?.title ?? "?"} [${obs.promptType}]: ${obs.promptText}` : undefined });
      if (this.records.length > this.maxRecords) this.records.shift();
    }
    this.n++;
    return chosen?.move ?? null;
  }

  applied(move: Move) {
    this.confirmed = true;
    if (move.command === "toast") return;
    const key = moveKey(move);
    if (this.pendingKind && this.pendingKind.key === key) {
      (this.memory.notes.kinds as string[] | undefined)?.push(this.pendingKind.kind);
      this.pendingKind = null;
    }
    if (key !== this.last.key || this.pending.signature !== this.last.signature) this.last = { key, signature: this.pending.key === key ? this.pending.signature : "", count: 0 };
  }

  private rescueMove(obs: Observation): Proposal | null {
    if (obs.prompt && obs.promptType !== "run" && obs.promptType !== "waiting") return { move: { command: "say", say: "/close-prompt" }, score: -100, why: "rescue: close an unhandled prompt", kind: "rescue" };
    const c = obs.candidates.find((x) => ["continue", "end-turn", "jack-out"].includes(x.command));
    return c ? { move: { command: c.command, args: c.args }, score: -100, why: "rescue: pass", kind: "rescue" } : null;
  }

  private consider(obs: Observation): { stage: DecisionRecord["stage"]; proposals: Proposal[]; unhandled?: string } {
    const toast = obs.me.toast?.[0];
    if (toast) return { stage: "toast", proposals: [{ move: { command: "toast", args: { id: toast.id } }, score: 1000, why: "dismiss a toast", kind: "toast" }] };
    if (obs.prompt && obs.promptType !== "run") {
      if (obs.promptType === "waiting") return { stage: "idle", proposals: [] };
      const p = this.answerPrompt(obs);
      return { stage: "prompt", proposals: p, unhandled: p.length ? undefined : `prompt not handled: ${obs.promptType} "${obs.promptText}"${obs.prompt.card?.title ? ` from ${obs.prompt.card.title}` : ""}` };
    }
    const step = basicCommands(obs.view, this.side).find((c) => TURN_COMMANDS.has(c.command) && c.enabled !== false);
    if (step) return { stage: "turn", proposals: [{ move: { command: step.command, args: step.args }, score: 500, why: step.label, kind: "turn" }] };
    if (obs.run || obs.encounter) {
      const p = this.policy?.run?.(obs, this.currentPlan(obs)) ?? (this.side === "corp" ? corpRun(obs) : runnerRun(obs));
      const owed = runCommands(obs.view, this.side).some((c) => c.enabled !== false && c.command !== "toggle-auto-no-action");
      return { stage: "run", proposals: p ? [p] : [], unhandled: p || !owed ? undefined : `run step not handled: ${obs.run?.phase ?? "encounter"}` };
    }
    if (!obs.myTurn || obs.view["end-turn"]) return { stage: "idle", proposals: [] };
    const plan = this.currentPlan(obs);
    if (obs.clicks > 0) {
      const base = this.side === "corp" ? corpProposals(obs) : runnerProposals(obs);
      const all = this.policy?.proposals ? this.policy.proposals(obs, plan, base) : base;
      return { stage: "click", proposals: all, unhandled: all.length ? undefined : "no click action proposed" };
    }
    const base = this.side === "corp" ? corpFreeProposals(obs) : [];
    const free = (this.policy?.proposals ? this.policy.proposals(obs, plan, base) : base).filter((p) => FREE_KINDS.has(p.kind));
    const end = basicCommands(obs.view, this.side).find((c) => c.command === "end-turn");
    if (end) free.push({ move: { command: "end-turn" }, score: 0, why: "no clicks left", kind: "end" });
    return { stage: free.length ? "free" : "end", proposals: free };
  }

  private currentPlan(obs: Observation): Plan {
    const next = this.policy ? this.policy.plan(obs, this.plan) : genericPlan(obs, this.plan);
    this.plan = next;
    return next;
  }

  private answerPrompt(obs: Observation): Proposal[] {
    if (obs.promptType === "mulligan") {
      const advice = this.policy?.mulligan?.(obs) ?? this.genericMulligan(obs);
      const p = mulliganProposal(obs, advice.keep, advice.why);
      return p ? [p] : [];
    }
    const deck = this.policy?.prompt?.(obs, this.currentPlan(obs));
    const out = [deck, breakSubChoice(obs), ...cardPrompt(obs), ...genericPrompt(obs, this.plan)].filter((p): p is Proposal => !!p);
    if (this.simulate && obs.promptType === "select") {
      const keys = new Set(out.map((p) => moveKey(p.move)));
      for (const card of selectable(obs).slice(0, 8)) {
        const p: Proposal = { move: selectMove(obs, card), score: this.measuredBase, why: `select ${card.title ?? "a facedown card"}: measured`, kind: "select" };
        if (!keys.has(moveKey(p.move)) && simulatable(p, obs)) out.push(p);
      }
    }
    out.forEach((p, i) => (p.score -= i * 0.001));
    return out;
  }

  private genericMulligan(obs: Observation): { keep: boolean; why: string } {
    if (this.side === "corp") {
      const ice = obs.hand.some((c) => c.type === "ICE");
      const econ = obs.hand.some((c) => isEconomy(obs.info(c).text));
      return ice && econ ? { keep: true, why: "ice and economy in hand" } : ice ? { keep: true, why: "ice in hand" } : { keep: false, why: "no ice in hand" };
    }
    const econ = obs.hand.some((c) => isEconomy(obs.info(c).text));
    const breaker = obs.hand.some((c) => isIcebreaker(c));
    return econ || breaker ? { keep: true, why: econ ? "economy in hand" : "a breaker in hand" } : { keep: false, why: "neither economy nor breakers" };
  }

  private trackRun(view: any) {
    if (this.side !== "runner") return;
    if (!this.pendingRun && view.run) {
      const key = String(view.run.server?.[0] ?? "");
      this.pendingRun = { key, server: serverName(key), accessed: [], points: view[this.side]?.["agenda-point"] ?? 0, breached: false, turn: Number(view.turn ?? 0) };
      this.memory.runsThisTurn++;
    }
    const pending = this.pendingRun;
    if (!pending) return;
    if (view.run) {
      if (view.run.successful || view.run.phase === "success") pending.breached = true;
      const prompt = promptOf(view, this.side);
      const cid = prompt?.card?.cid;
      if (cid && /accessed/i.test(String(prompt?.msg ?? ""))) {
        const installed = (view.corp?.servers?.[pending.key]?.content ?? []).find((c: any) => c.cid === cid);
        const title = prompt?.card?.title ?? installed?.title;
        if (installed && title) this.memory.seen.set(cid, { cid, title, type: prompt?.card?.type ?? installed.type, zone: "servers", turn: Number(view.turn ?? 0) });
        if (title && !pending.accessed.includes(title)) pending.accessed.push(title);
      }
      return;
    }
    const points = view[this.side]?.["agenda-point"] ?? 0;
    const stole = points > pending.points;
    if (pending.breached && !stole && pending.key.startsWith("remote")) {
      for (const c of view.corp?.servers?.[pending.key]?.content ?? []) if (!c.rezzed) this.memory.duds.add(c.cid);
    }
    if (pending.breached && !stole && pending.key === "rd") this.memory.notes.rdSeenTurn = Number(view.turn ?? 0);
    noteRun(this.memory, { turn: pending.turn, server: pending.server, successful: pending.breached, stole, accessed: pending.accessed });
    this.pendingRun = null;
  }

  private signature(obs: Observation) {
    return JSON.stringify([obs.clicks, obs.credits, obs.hand.length, promptOf(obs.view, this.side)?.eid, obs.promptText, obs.run?.phase, obs.run?.position, obs.run?.["no-action"], obs.encounter?.["no-action"], (obs.view.log ?? []).length]);
  }
}
