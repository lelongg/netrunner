import { bestBreak, coverage, estimateRun, gainOf, iceThreat, isIcebreaker, rezCostOf, strengthOf, hostedBreaker } from "./tactics.ts";
import { byCommand } from "./observe.ts";
import type { Candidate } from "../../game/candidates.ts";
import type { Observation, Proposal } from "./types.ts";
import type { RunTrial } from "./trial.ts";

export const labelCost = (label: string) => Number(label.match(/(\d+)\s*\[credits?\]/i)?.[1] ?? 0);
export const fromCandidate = (c: Candidate, score: number, why: string, kind: string, exact = true): Proposal => ({ move: { command: c.command, args: c.args }, score, why, kind, exact });
export const holdRez = (obs: Observation, score: number, why: string): Proposal | null => {
  const next = byCommand(obs, "continue")[0];
  return next ? fromCandidate(next, score, why, "pass") : null;
};

export const runCredits = (obs: Observation) => Number(obs.view.runner?.["run-credit"] ?? 0) + (obs.view.runner?.["play-area"] ?? []).reduce((n: number, c: any) => n + Number(c?.counter?.credit ?? 0), 0);
export const leechCounters = (obs: Observation) => (obs.view.runner?.rig?.program ?? []).filter((c: any) => /give -1 strength/i.test(obs.info(c).text ?? "")).reduce((n: number, c: any) => n + Number(c?.counter?.virus ?? 0), 0);

export function wastefulRez(obs: Observation, ice: any, server: Observation["servers"][number]): { wasteful: boolean; why: string } {
  const cost = rezCostOf(ice);
  const grip = Number(obs.view.runner?.["hand-count"] ?? obs.view.runner?.hand?.length ?? 5);
  const purse = Number(obs.view.runner?.credit ?? 0) + runCredits(obs);
  const position = Number(obs.run?.position ?? 0);
  if (position <= 0) return { wasteful: false, why: "" };
  const ahead = { ...server, ices: server.ices.slice(0, position).map((i: any) => (i.rezzed ? i : { ...i, rezzed: true, subroutines: i.subroutines ?? [] })) };
  const est = estimateRun(obs, ahead, 0, purse);
  const getsIn = est.exact && !est.blocked && est.damage < grip && est.credits - leechCounters(obs) <= purse;
  const tax = bestBreak(obs, { ...ice, rezzed: true, subroutines: ice.subroutines ?? [] })?.cost.value ?? 0;
  const wasteful = getsIn && cost >= 5 && cost > tax && obs.credits - cost < 3;
  return { wasteful, why: `${ice.title} costs ${cost} to rez and ${tax} to break: the Runner gets through ${server.label} anyway with ${purse} for the run, keep the credits` };
}

export function taxedRez(obs: Observation, ice: any, threat: { etr: boolean; damage: number; creditLoss: number; tag: boolean }, grip: number): string | null {
  const cost = rezCostOf(ice);
  const premium = cost - Number((obs.info(ice) as any).cost ?? cost);
  if (premium <= 0) return null;
  const trial = (obs.memory.notes.rezTrials as Record<string, { rez: RunTrial | null; pass: RunTrial | null }> | undefined)?.[ice.cid];
  if (trial?.rez && trial.pass) {
    const { rez, pass } = trial;
    if (!rez.reached && pass.reached) return null;
    const gained = cost - ((rez.corpCredits ?? cost) - (pass.corpCredits ?? 0));
    const payoff = rez.credits - pass.credits + gained + (rez.damage - pass.damage) * 1.5 + (rez.tags - pass.tags) * 2;
    if (payoff >= premium) return null;
    return `${ice.title} costs ${premium} more than usual and, played out on the engine, ${rez.reached ? "does not stop the run" : "the run stops either way"} and only does ${payoff} worth: rez it later at its normal cost`;
  }
  if (threat.etr || threat.damage >= grip) return null;
  const payoff = threat.damage * 1.5 + threat.creditLoss + gainOf(obs.info(ice).text) + (threat.tag ? 2 : 0);
  if (payoff >= premium) return null;
  return `${ice.title} costs ${premium} more than usual and only does ${payoff} worth on this run without stopping it: rez it later at its normal cost`;
}

export function ruinousRez(obs: Observation, cost: number, server: Observation["servers"][number], stops: boolean, kills = false): string | null {
  if (stops || kills || cost < 3 || obs.credits - cost >= 2) return null;
  const runnerPoints = Number(obs.view.runner?.["agenda-point"] ?? 0);
  if (runnerPoints + 2 >= Number(obs.view.runner?.["agenda-point-req"] ?? 7)) return null;
  const early = !server.remote && cost >= 5 && obs.turn <= 4;
  const agendas = server.key === "hq" ? obs.hand.filter((c) => c.type === "Agenda").length / Math.max(1, obs.hand.length) : 0;
  if (early && agendas >= 0.5) return null;
  return `rezzing for ${cost} would leave ${obs.credits - cost} on turn ${obs.turn} and does not stop the run on ${server.label}: keep the credits`;
}

export function runServer(obs: Observation) {
  const key = obs.run?.server?.[0];
  return obs.servers.find((s) => s.key === key) ?? null;
}

export function corpRun(obs: Observation, reserve = 0): Proposal | null {
  const ice = obs.currentIce;
  const fire = byCommand(obs, "unbroken-subroutines")[0];
  if (fire) return fromCandidate(fire, 90, "fire the unbroken subroutines", "fire");
  const rez = ice ? byCommand(obs, "rez", (c) => (c.args as any)?.card?.cid === ice.cid)[0] : undefined;
  if (rez && ice && !ice.rezzed) {
    const cost = rezCostOf(ice);
    const server = runServer(obs);
    const protects = server && (server.content.length > 0 || !server.remote);
    const runnerCredits = Number(obs.view.runner?.credit ?? 0);
    const grip = Number(obs.view.runner?.["hand-count"] ?? obs.view.runner?.hand?.length ?? 5);
    const threat = iceThreat({ ...ice, subroutines: ice.subroutines ?? [] }, obs.info(ice), runnerCredits, grip);
    const agendaBehind = !!server && (server.content.some((c: any) => c.type === "Agenda") || (server.key === "hq" && obs.hand.some((c) => c.type === "Agenda")));
    const bites = threat.etr || threat.damage > 0 || threat.tag || threat.encounterTags > 0 || threat.creditLoss >= Math.max(2, cost - 1) || !threat.exact;
    const affordable = cost <= obs.credits - reserve && (obs.credits - cost >= 2 || threat.etr || agendaBehind);
    const taxed = taxedRez(obs, ice, threat, grip);
    if (protects && taxed) return holdRez(obs, 14, taxed);
    const ruin = server ? ruinousRez(obs, cost, server, threat.etr, threat.damage >= grip) : null;
    if (protects && ruin) return holdRez(obs, 14, ruin);
    const waste = server ? wastefulRez(obs, ice, server) : null;
    if (affordable && protects && bites && !waste?.wasteful) return fromCandidate(rez, 80, `rez ${ice.title} for ${cost} to protect ${server?.label}`, "rez");
    if (protects && waste?.wasteful) return holdRez(obs, 14, waste.why);
    if (protects && cost <= obs.credits - reserve && !bites) return holdRez(obs, 12, `${ice.title} would not stop or hurt the Runner at ${runnerCredits} credits: keep ${cost} credits`);
  }
  const next = byCommand(obs, "continue")[0];
  return next ? fromCandidate(next, 10, "nothing to do during this run step", "pass") : null;
}

export function encounterPlan(obs: Observation): { proposal: Proposal; threat: ReturnType<typeof iceThreat> } | null {
  const ice = obs.currentIce;
  if (!ice?.rezzed || !obs.encounter) return null;
  const threat = iceThreat(ice, obs.info(ice), obs.credits);
  const live = (ice.subroutines ?? []).some((s: any) => !s.broken && !s.fired);
  if (!live) return null;
  const worth = threat.etr || threat.damage > 0 || threat.creditLoss > 0 || threat.tag;
  if (!worth) return null;
  const facing = threat.etr || threat.tag || threat.damage >= obs.hand.length - 1 ? Infinity : threat.damage * 2 + threat.creditLoss;
  const hosted = hostedBreaker(obs, ice);
  if (hosted) {
    const use = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === hosted.cid)[0] ?? byCommand(obs, "runner-ability", (c) => (c.args as any)?.card?.cid === hosted.cid)[0];
    if (use) return { proposal: fromCandidate(use, 86, `break ${ice.title} with the counters on ${hosted.title}`, "break"), threat };
  }
  const full = byCommand(obs, "dynamic-ability", (c) => /fully break/i.test(c.label))
    .map((c) => ({ c, cost: labelCost(c.label) }))
    .sort((a, b) => a.cost - b.cost)[0];
  if (full && full.cost <= obs.credits && full.cost <= facing) return { proposal: fromCandidate(full.c, 85, `fully break ${ice.title} for ${full.cost}`, "break"), threat };
  const option = bestBreak(obs, ice);
  if (!option || option.cost.value > facing) return null;
  if (threat.etr && option.cost.exact && option.cost.value > obs.credits + runCredits(obs)) return null;
  const breaker = option.profile.card;
  if (option.profile.strength < strengthOf(ice)) {
    const pump = byCommand(obs, "dynamic-ability", (c) => /match strength/i.test(c.label) && (c.args as any)?.card?.cid === breaker.cid)[0];
    if (pump && labelCost(pump.label) + option.profile.breakCost <= obs.credits) return { proposal: fromCandidate(pump, 80, `pump ${breaker.title} to match ${ice.title}`, "pump", option.cost.exact), threat };
    return null;
  }
  const brk = byCommand(obs, "ability", (c) => /^.*: .*break/i.test(c.label) && (c.args as any)?.card?.cid === breaker.cid)[0];
  if (brk && option.profile.breakCost <= obs.credits) return { proposal: fromCandidate(brk, 80, `break ${ice.title} with ${breaker.title}`, "break", option.cost.exact), threat };
  return null;
}

export function runnerRun(obs: Observation, maxDamage?: number): Proposal | null {
  const ice = obs.currentIce;
  if (obs.encounter && ice?.rezzed) {
    const plan = encounterPlan(obs);
    if (plan) return plan.proposal;
    const next = byCommand(obs, "continue")[0];
    return next ? fromCandidate(next, 20, "let the subroutines fire", "pass") : null;
  }
  const jack = byCommand(obs, "jack-out")[0];
  if (jack && obs.run?.phase === "movement" && obs.run.position > 0) {
    const server = runServer(obs);
    const ahead = server ? { ...server, ices: server.ices.slice(0, obs.run.position) } : null;
    if (ahead) {
      const est = estimateRun(obs, ahead);
      const hand = obs.hand.length;
      const limit = maxDamage ?? Math.max(0, hand - 1);
      if (est.damage > limit) return fromCandidate(jack, 70, `jack out: ${est.damage} damage ahead with ${hand} cards in hand`, "jack-out", est.exact);
      if (est.blocked && est.damage > 0) return fromCandidate(jack, 60, "jack out: the next ice cannot be broken and hurts", "jack-out", est.exact);
      if (est.blocked && ahead.ices.every((i: any) => i.rezzed)) return fromCandidate(jack, 55, `jack out: the ice ahead costs ${est.credits} and ends the run`, "jack-out", est.exact);
    }
  }
  const next = byCommand(obs, "start-next-phase")[0] ?? byCommand(obs, "continue")[0];
  return next ? fromCandidate(next, 10, "continue the run", "pass") : null;
}

export function breakSubChoice(obs: Observation): Proposal | null {
  if (!/^break a subroutine/i.test(obs.promptText)) return null;
  const list: any[] = Array.isArray(obs.prompt.choices) ? obs.prompt.choices : [];
  const label = (c: any) => String(typeof c.value === "string" ? c.value : "");
  const pick = list.find((c) => /end the run/i.test(label(c))) ?? list.find((c) => /damage|tag|lose/i.test(label(c))) ?? list.find((c) => c.value !== "Done" && c.value !== "Hide");
  const done = list.find((c) => c.value === "Done");
  const c = pick ?? done;
  return c ? { move: { command: "choice", args: { eid: obs.prompt.eid, choice: { uuid: c.uuid } } }, score: 80, why: pick ? `break "${label(pick)}"` : "done breaking", kind: "break" } : null;
}

export const hasBreakers = (obs: Observation) => obs.rig.some((c) => isIcebreaker(c));
export { coverage };
