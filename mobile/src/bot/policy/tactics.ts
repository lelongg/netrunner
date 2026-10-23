import { advancement } from "../../game/actions.ts";
import type { CardInfo, Estimate, Observation, ServerInfo } from "./types.ts";

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
  exact: boolean;
}

export function iceThreat(ice: any, info: CardInfo): IceThreat {
  const subs: any[] = ice.subroutines ?? [];
  const labels = subs.filter((s) => !s.broken && !s.fired).map((s) => String(typeof s.label === "string" ? s.label : ""));
  const text = plain(info.text ?? "");
  const source = labels.length ? labels.join("\n") : text;
  const damage = [...source.matchAll(/do (\d+) (?:net|meat|core|brain) damage/gi)].reduce((n, m) => n + Number(m[1]), 0);
  const loss = [...source.matchAll(/runner loses (\d+)\s*\[credit\]/gi)].reduce((n, m) => n + Number(m[1]), 0);
  return { etr: /end the run/i.test(source), damage, creditLoss: loss, tag: /\btag\b/i.test(source), exact: labels.length > 0 };
}

export interface BreakOption {
  profile: BreakerProfile;
  cost: Estimate;
}

export function bestBreak(obs: Observation, ice: any): BreakOption | null {
  let best: BreakOption | null = null;
  for (const profile of rigProfiles(obs)) {
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
  etrRisk: boolean;
}

export function estimateRun(obs: Observation, server: ServerInfo, unrezzedCost = 3, budget = Number(obs.view.runner?.credit ?? 0)): RunEstimate {
  let credits = 0;
  let exact = true;
  let blocked = false;
  let unrezzed = 0;
  let damage = 0;
  let etrRisk = false;
  for (const ice of [...server.ices].reverse()) {
    if (!ice.rezzed) {
      unrezzed++;
      credits += unrezzedCost;
      exact = false;
      continue;
    }
    const option = bestBreak(obs, ice);
    const threat = iceThreat(ice, obs.info(ice));
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
  for (const c of server.content) if (c.rezzed && c.title === "Manegarm Skunkworks") credits += 5;
  if (unrezzed && coverage(obs).size < 3) etrRisk = true;
  return { server, credits, exact, blocked, unrezzed, damage, etrRisk };
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
    const threat = iceThreat(asRezzed, obs.info(ice));
    const types = iceTypes(ice);
    const covered = types.length > 0 && types.some((t) => cov.has(t));
    if (!covered) {
      if (threat.etr) blocked = true;
      continue;
    }
    const option = bestBreak(obs, asRezzed);
    if (option) {
      runnerCost += option.cost.value;
      if (!option.cost.exact) exact = false;
    } else exact = false;
  }
  for (const c of server.content) if (c.title === "Manegarm Skunkworks" && (c.rezzed || budget >= 2)) runnerCost += 5;
  const safe = server.ices.length > 0 && (blocked || runnerCost > runnerCredits + 2);
  return { blocked, runnerCost, rezCost, exact, safe, margin: blocked ? Infinity : runnerCost - runnerCredits };
}
