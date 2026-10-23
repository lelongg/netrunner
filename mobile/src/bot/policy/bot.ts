import type { Side } from "../../engine.ts";
import { basicCommands, promptOf, runCommands } from "../../game/actions.ts";
import { corpFreeProposals, corpProposals, genericPlan, runnerProposals } from "./generic.ts";
import { emptyMemory, noteRun, observe, updateMemory } from "./observe.ts";
import { genericPrompt, mulliganProposal } from "./prompts.ts";
import { breakSubChoice, corpRun, runnerRun } from "./runs.ts";
import { isEconomy, isIcebreaker } from "./tactics.ts";
import type { DecisionRecord, DeckPolicy, Lookup, Memory, Move, Observation, Plan, Proposal } from "./types.ts";

const FREE_KINDS = new Set(["score", "rez-economy", "rez", "end"]);
const TURN_COMMANDS = new Set(["start-turn", "end-phase-12", "phase-12-pass-priority", "end-post-discard", "post-discard-pass-priority"]);

export interface BotOptions {
  random?: () => number;
  render?: (msg: unknown) => string;
  record?: boolean;
  maxRecords?: number;
  rescue?: boolean;
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
  private pendingRun: { server: string; cids: string[]; points: number; breached: boolean; turn: number } | null = null;
  private lookup: Lookup;
  private random: () => number;
  private render: (msg: unknown) => string;
  private record: boolean;
  private maxRecords: number;
  private rescue: boolean;

  constructor(side: Side, policy: DeckPolicy | null, lookup: Lookup, options: BotOptions = {}) {
    this.side = side;
    this.policy = policy && policy.side === side ? policy : null;
    this.lookup = lookup;
    this.random = options.random ?? Math.random;
    this.render = options.render ?? ((m) => (typeof m === "string" ? m : JSON.stringify(m ?? "")));
    this.record = options.record ?? false;
    this.maxRecords = options.maxRecords ?? 5000;
    this.rescue = options.rescue ?? false;
  }

  get policyId() {
    return this.policy ? `${this.policy.id}@${this.policy.version}` : `generic-${this.side}`;
  }

  decide(view: any): Move | null {
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
    }
    this.trackRun(view);
    const obs = observe(view, this.side, this.memory, this.lookup, this.render, this.random);
    const { stage, proposals, unhandled } = this.consider(obs);
    const signature = this.signature(obs);
    const ranked = proposals.filter((p) => !this.banned.has(moveKey(p.move))).sort((a, b) => b.score - a.score);
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
    const note = unhandled;
    if (note) this.unhandled++;
    if (!chosen && note && this.rescue) chosen = this.rescueMove(obs);
    this.pendingKind = chosen && stage === "click" ? { key: moveKey(chosen.move), kind: chosen.kind } : null;
    if (chosen?.move.command === "run") {
      const server = obs.servers.find((s) => s.label === (chosen!.move.args as any)?.server);
      this.pendingRun = { server: server?.label ?? "", cids: (server?.content ?? []).filter((c: any) => !c.rezzed && !c["advance-counter"]).map((c: any) => c.cid), points: obs.me["agenda-point"] ?? 0, breached: false, turn: obs.turn };
      this.memory.runsThisTurn++;
    }
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
    if (this.record) {
      this.records.push({ n: this.n, turn: obs.turn, side: this.side, active: obs.active, stage, plan: this.plan, chosen, considered: ranked.slice(0, 6), refused: refused || undefined, unhandled: note, ms, signature });
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
    const out = [deck, breakSubChoice(obs), ...genericPrompt(obs, this.plan)].filter((p): p is Proposal => !!p);
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
    if (!this.pendingRun && view.run && this.side === "runner") {
      const key = view.run.server?.[0];
      const label = key === "hq" ? "HQ" : key === "rd" ? "R&D" : key === "archives" ? "Archives" : key?.startsWith("remote") ? `Server ${key.slice(6)}` : String(key);
      this.pendingRun = { server: label, cids: [], points: view[this.side]?.["agenda-point"] ?? 0, breached: false, turn: Number(view.turn ?? 0) };
      this.memory.runsThisTurn++;
    }
    const pending = this.pendingRun;
    if (!pending) return;
    if (view.run) {
      if (view.run.successful || view.run.phase === "success") pending.breached = true;
      return;
    }
    const points = view[this.side]?.["agenda-point"] ?? 0;
    const stole = points > pending.points;
    if (pending.breached && !stole) pending.cids.forEach((cid) => this.memory.duds.add(cid));
    if (pending.breached && !stole && pending.server === "R&D") this.memory.notes.rdSeenTurn = Number(view.turn ?? 0);
    noteRun(this.memory, { turn: pending.turn, server: pending.server, successful: pending.breached, stole, accessed: [] });
    this.pendingRun = null;
  }

  private signature(obs: Observation) {
    return JSON.stringify([obs.clicks, obs.credits, obs.hand.length, promptOf(obs.view, this.side)?.eid, obs.run?.phase, obs.run?.position, obs.run?.["no-action"], obs.encounter?.["no-action"], (obs.view.log ?? []).length]);
  }
}
