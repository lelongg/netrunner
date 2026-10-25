import { advancement } from "../../game/actions.ts";
import type { RunTrial } from "./trial.ts";
import type { CardInfo, Estimate, Observation, ServerInfo } from "./types.ts";
import { hiddenBreaker } from "./value.ts";

export const ICE_TYPES = ["Barrier", "Code Gate", "Sentry"] as const;
export type IceType = (typeof ICE_TYPES)[number];
const BREAKER_TYPES: Record<string, IceType> = { Fracter: "Barrier", Decoder: "Code Gate", Killer: "Sentry" };

export const subtypes = (card: any): string[] => card?.subtypes ?? [];
export const isIcebreaker = (card: any) => subtypes(card).includes("Icebreaker");
export const strengthOf = (card: any) => Number(card?.["current-strength"] ?? card?.strength ?? 0);
export const rezCostOf = (card: any) => Number(card?.["current-rez-cost"] ?? card?.cost ?? 0);
export const playCostOf = (card: any) => Number(card?.["current-cost"] ?? card?.cost ?? 0);
export const plain = (text = "") => text.replace(/<[^>]+>/g, "");
export const gainOf = (text = "") => Number(plain(text).match(/gain (\d+)\s*\[credit\]/i)?.[1] ?? 0);
export const isTrap = (text = "") => /when the runner accesses this/i.test(plain(text)) && !/agenda/i.test(plain(text).slice(0, 20));
export const isEconomy = (text = "") => /\[credit\]/i.test(text) && /(gain|take|place|load)/i.test(plain(text));
export const iceTypes = (card: any): IceType[] => subtypes(card).filter((s): s is IceType => (ICE_TYPES as readonly string[]).includes(s));

export interface BreakerProfile {
  card: any;
  breaks: IceType[] | "AI";
  strength: number;
  breakCost: number;
  subsPerBreak: number;
  pumpCost: number;
  pumpStrength: number;
  exact: boolean;
}

export function breakerProfile(card: any, info: CardInfo): BreakerProfile | null {
  if (!isIcebreaker(card)) return null;
  const subs = subtypes(card);
  const breaks: IceType[] | "AI" = subs.includes("AI") ? "AI" : Object.entries(BREAKER_TYPES).flatMap(([b, ice]) => (subs.includes(b) ? [ice] : []));
  const text = plain(info.text ?? "");
  const brk = text.match(/(\d+)\s*\[credit\]:\s*break (?:up to )?(\d+)?\s*(?:barrier|code gate|sentry)?\s*subroutines?/i);
  const pump = text.match(/(\d+)\s*\[credit\]:\s*\+\s*(\d+|X) strength/i);
  const exact = !!brk && !!pump && pump[2] !== "X";
  return {
    card,
    breaks,
    strength: strengthOf(card),
    breakCost: brk ? Number(brk[1]) : 1,
    subsPerBreak: brk?.[2] ? Number(brk[2]) : 1,
    pumpCost: pump ? Number(pump[1]) : 1,
    pumpStrength: pump ? (pump[2] === "X" ? 1 : Number(pump[2])) : 1,
    exact,
  };
}

export function canBreak(profile: BreakerProfile, ice: any): boolean {
  if (profile.breaks === "AI") return true;
  const types = iceTypes(ice);
  return types.length > 0 && types.some((t) => (profile.breaks as IceType[]).includes(t));
}

export function breakCost(profile: BreakerProfile, ice: any): Estimate {
  const subs = (ice.subroutines ?? []).filter((s: any) => !s.broken && !s.fired).length || 1;
  const diff = Math.max(0, strengthOf(ice) - profile.strength);
  const pumps = profile.pumpStrength > 0 ? Math.ceil(diff / profile.pumpStrength) : diff;
  const breaks = Math.ceil(subs / Math.max(1, profile.subsPerBreak));
  return { value: pumps * profile.pumpCost + breaks * profile.breakCost, exact: profile.exact };
}

export function rigProfiles(obs: Observation): BreakerProfile[] {
  return (obs.view.runner?.rig?.program ?? []).map((c: any) => breakerProfile(c, obs.info(c))).filter((p: BreakerProfile | null): p is BreakerProfile => !!p);
}

export function coverage(obs: Observation): Set<IceType> {
  const out = new Set<IceType>();
  for (const p of rigProfiles(obs)) {
    if (p.breaks === "AI") ICE_TYPES.forEach((t) => out.add(t));
    else p.breaks.forEach((t) => out.add(t));
  }
  return out;
}

export interface IceThreat {
  etr: boolean;
  damage: number;
  creditLoss: number;
  tag: boolean;
  encounterTags: number;
  exact: boolean;
}

export function iceThreat(ice: any, info: CardInfo, runnerCredits?: number, runnerGrip?: number): IceThreat {
  const subs: any[] = ice.subroutines ?? [];
  const labels = subs.filter((s) => !s.broken && !s.fired).map((s) => String(typeof s.label === "string" ? s.label : ""));
  const text = plain(info.text ?? "");
  const source = labels.length ? labels.join("\n") : text;
  const unless = source.match(/end the run unless the runner (?:pays )?(?:suffers?|takes?) (\d+) (?:net|meat) damage/i);
  const damage = [...source.matchAll(/do (\d+) (?:net|meat|core|brain) damage/gi)].reduce((n, m) => n + Number(m[1]), 0) + (unless && (runnerGrip === undefined || runnerGrip > Number(unless[1])) ? Number(unless[1]) : 0);
  const loss = [...source.matchAll(/(?:runner loses|make the runner lose) (\d+)\s*\[credits?\]/gi)].reduce((n, m) => n + Number(m[1]), 0);
  const segments = source.split(/\n|\.\s+/).map((x) => x.trim());
  const poor = source.match(/end the run if the runner has (\d+)\s*\[credits?\] or (?:fewer|less)|if the runner has (\d+)\s*\[credits?\] or (?:fewer|less), end the run/i);
  const unconditional = segments.some((x) => /^end the run\.?$/i.test(x) || (/^end the run unless/i.test(x) && !unless && !poor));
  const etr = unconditional || (!!poor && (runnerCredits === undefined || runnerCredits - loss <= Number(poor[1] ?? poor[2]))) || (!!unless && runnerGrip !== undefined && runnerGrip <= Number(unless[1]));
  const encounterTags = Number(text.match(/when the runner encounters this ice, end the run unless the runner takes (\d+) tag/i)?.[1] ?? 0);
  return { etr, damage, creditLoss: loss, tag: /\btag\b/i.test(source), encounterTags, exact: labels.length > 0 };
}

export function tagPunisher(obs: Observation): boolean {
  if (/nbn|weyland/i.test(String(obs.opp.identity?.faction ?? ""))) return true;
  return [...obs.memory.opponentTitles].some((t) => /^(Public Trail|Retribution|Bigger Picture|Orbital Superiority)$/.test(t) || /if the runner is tagged, do \d+ meat damage/i.test(obs.info({ title: t }).text ?? ""));
}

export interface BreakOption {
  profile: BreakerProfile;
  cost: Estimate;
}

export function hostedBreaker(obs: Observation, ice: any): any | null {
  const runnerName = "Runner";
  for (const h of ice?.hosted ?? []) {
    if (h.side !== runnerName) continue;
    const text = plain(obs.info(h).text ?? "");
    if (/hosted virus counter:\s*break 1 subroutine on host ice/i.test(text) && Number(h.counter?.virus ?? 0) >= Math.max(1, (ice.subroutines ?? []).filter((s: any) => !s.broken && !s.fired).length || 1)) return h;
  }
  return null;
}

export function bestBreak(obs: Observation, ice: any, extra: BreakerProfile[] = []): BreakOption | null {
  const hosted = hostedBreaker(obs, ice);
  if (hosted) return { profile: { card: hosted, breaks: "AI", strength: 99, breakCost: 0, subsPerBreak: 1, pumpCost: 0, pumpStrength: 0, exact: true }, cost: { value: 0, exact: true } };
  let best: BreakOption | null = null;
  for (const profile of [...rigProfiles(obs), ...extra]) {
    if (!canBreak(profile, ice)) continue;
    const cost = breakCost(profile, ice);
    if (!best || cost.value < best.cost.value) best = { profile, cost };
  }
  return best;
}

export interface RunEstimate {
  server: ServerInfo;
  credits: number;
  exact: boolean;
  blocked: boolean;
  unrezzed: number;
  damage: number;
  tags: number;
  etrRisk: boolean;
}

export function estimateRun(obs: Observation, server: ServerInfo, unrezzedCost = 3, budget = Number(obs.view.runner?.credit ?? 0), extra: BreakerProfile[] = [], unrezzedBlock = 0): RunEstimate {
  let credits = 0;
  let exact = true;
  let blocked = false;
  let unrezzed = 0;
  let damage = 0;
  let tags = 0;
  let etrRisk = false;
  for (const ice of [...server.ices].reverse()) {
    if (!ice.rezzed) {
      unrezzed++;
      credits += unrezzedCost;
      exact = false;
      continue;
    }
    const option = bestBreak(obs, ice, extra);
    const threat = iceThreat(ice, obs.info(ice), Math.min(budget - credits, Number(obs.view.runner?.credit ?? 0) - credits));
    if (threat.encounterTags) {
      tags += threat.encounterTags;
      credits += threat.encounterTags * 2;
      if (tagPunisher(obs) && !(Number(obs.clicks ?? 0) >= 2 && Math.min(budget - credits, Number(obs.view.runner?.credit ?? 0)) >= 4)) blocked = true;
    }
    if (!option || credits + option.cost.value > budget) {
      if (threat.etr) blocked = true;
      damage += threat.damage;
      credits += threat.creditLoss;
      if (!threat.exact) exact = false;
      continue;
    }
    credits += option.cost.value;
    if (!option.cost.exact) exact = false;
  }
  for (const c of server.content) if (c.rezzed && c.title === "Manegarm Skunkworks" && Number(obs.clicks ?? 0) < 3) credits += 5;
  if (unrezzed && (coverage(obs).size < 3 || unrezzedBlock > 0.3)) etrRisk = true;
  if (unrezzed && unrezzedBlock >= 0.8) blocked = true;
  return { server, credits, exact, blocked, unrezzed, damage, tags, etrRisk };
}

export function runTrialOf(obs: Observation, server: ServerInfo): RunEstimate | null {
  const trial = (obs.memory.notes.runTrials as Record<string, RunTrial | null> | undefined)?.[server.label];
  if (!trial || server.ices.some((i: any) => !i.rezzed)) return null;
  return { server, credits: trial.credits, exact: true, blocked: !trial.reached, unrezzed: 0, damage: trial.damage, tags: trial.tags, etrRisk: false };
}

export function agendaProgress(card: any) {
  return { have: advancement(card), need: Number(card["current-advancement-requirement"] ?? card.advancementcost ?? Infinity) };
}

export function corpInstalled(obs: Observation): any[] {
  return obs.servers.flatMap((s) => [...s.content, ...s.ices]);
}

export function handSizeOf(obs: Observation): number {
  return Number(obs.me["hand-size"]?.total ?? 5);
}

export function tagged(view: any): boolean {
  return !!(view.runner?.tag?.["is-tagged"] || (view.runner?.tag?.total ?? 0) > 0);
}

export function jitter(obs: Observation, scale = 0.01) {
  return obs.random() * scale;
}

export interface Safety {
  blocked: boolean;
  runnerCost: number;
  rezCost: number;
  exact: boolean;
  safe: boolean;
  margin: number;
}

export function serverSafety(obs: Observation, server: ServerInfo): Safety {
  const cov = coverage(obs);
  let runnerCost = 0;
  let rezCost = 0;
  let blocked = false;
  let exact = true;
  const runnerCredits = Number(obs.view.runner?.credit ?? 0);
  let budget = obs.credits;
  for (const ice of [...server.ices].reverse()) {
    const asRezzed = ice.rezzed ? ice : { ...ice, subroutines: ice.subroutines ?? [], rezzed: true };
    if (!ice.rezzed) {
      const cost = rezCostOf(ice);
      rezCost += cost;
      if (cost > budget) {
        exact = false;
        continue;
      }
      budget -= cost;
    }
    const threat = iceThreat(asRezzed, obs.info(ice), runnerCredits + 4 - runnerCost, Number(obs.view.runner?.["hand-count"] ?? obs.view.runner?.hand?.length ?? 5));
    const types = iceTypes(ice);
    const covered = types.length > 0 && types.some((t) => cov.has(t));
    if (!covered) {
      const grip = Number(obs.view.runner?.["hand-count"] ?? obs.view.runner?.hand?.length ?? 5);
      const hidden = hiddenBreaker(obs, asRezzed);
      if (hidden && hidden.odds >= 0.25) {
        runnerCost += hidden.cost + 2;
        exact = false;
        continue;
      }
      if (threat.etr || (threat.damage > 0 && threat.damage >= grip)) blocked = true;
      runnerCost += threat.damage * 2 + threat.creditLoss;
      continue;
    }
    const option = bestBreak(obs, asRezzed);
    if (option) {
      runnerCost += option.cost.value;
      if (!option.cost.exact) exact = false;
    } else exact = false;
  }
  for (const c of server.content) if (c.title === "Manegarm Skunkworks" && (c.rezzed || budget >= 2)) runnerCost += 3;
  if (server.content.some((c: any) => c.title === "Anoetic Void")) {
    const activations = Math.min(Math.floor(obs.credits / 2), Math.floor(obs.hand.filter((c: any) => c.type !== "Agenda").length / 2));
    if (activations >= 2) blocked = true;
    else if (activations === 1) runnerCost += 6;
  }
  const trial = obs.side === "corp" ? (obs.memory.notes.runTrials as Record<string, RunTrial | null> | undefined)?.[server.label] : undefined;
  if (trial?.reached) {
    const grip = Number(obs.view.runner?.["hand-count"] ?? obs.view.runner?.hand?.length ?? 5);
    blocked = trial.damage > 0 && trial.damage >= grip;
    runnerCost = trial.credits + trial.damage * 2;
    exact = true;
  }
  const income = [...(obs.view.runner?.rig?.resource ?? []), ...(obs.view.runner?.rig?.hardware ?? [])].filter((c: any) => /(gain|take|place) \d+\s*\[credits?\]/i.test(plain(obs.info(c).text ?? ""))).length;
  const expected = runnerCredits + 4 + Math.min(4, income * 1.5);
  const safe = server.ices.length > 0 && (blocked || runnerCost > expected + 2);
  return { blocked, runnerCost, rezCost, exact, safe, margin: blocked ? Infinity : runnerCost - expected };
}
