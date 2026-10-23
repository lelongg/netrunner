import { bestBreak, coverage, estimateRun, iceThreat, isIcebreaker, rezCostOf, strengthOf, hostedBreaker } from "./tactics.ts";
import { byCommand } from "./observe.ts";
import type { Candidate } from "../../game/candidates.ts";
import type { Observation, Proposal } from "./types.ts";

export const labelCost = (label: string) => Number(label.match(/(\d+)\s*\[credits?\]/i)?.[1] ?? 0);
export const fromCandidate = (c: Candidate, score: number, why: string, kind: string, exact = true): Proposal => ({ move: { command: c.command, args: c.args }, score, why, kind, exact });

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
    if (cost <= obs.credits - reserve && protects) return fromCandidate(rez, 80, `rez ${ice.title} for ${cost} to protect ${server?.label}`, "rez");
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
  const hosted = hostedBreaker(obs, ice);
  if (hosted) {
    const use = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === hosted.cid)[0] ?? byCommand(obs, "runner-ability", (c) => (c.args as any)?.card?.cid === hosted.cid)[0];
    if (use) return { proposal: fromCandidate(use, 86, `break ${ice.title} with the counters on ${hosted.title}`, "break"), threat };
  }
  const full = byCommand(obs, "dynamic-ability", (c) => /fully break/i.test(c.label))
    .map((c) => ({ c, cost: labelCost(c.label) }))
    .sort((a, b) => a.cost - b.cost)[0];
  if (full && full.cost <= obs.credits) return { proposal: fromCandidate(full.c, 85, `fully break ${ice.title} for ${full.cost}`, "break"), threat };
  const option = bestBreak(obs, ice);
  if (!option) return null;
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
