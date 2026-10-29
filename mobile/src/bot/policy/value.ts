import { knownDeck } from "./decks/known.ts";
import { CLICK_AS_CREDITS, breakCost, breakerProfile, canBreak, clickThrough, coverage, iceThreat, plain, rigProfiles } from "./tactics.ts";
import type { Observation, ServerInfo } from "./types.ts";

export interface AgendaOutlook {
  agendas: number;
  points: number;
  unknownCards: number;
  density: number;
  averagePoints: number;
}

const cardsOf = (obs: Observation, deck: { cards: { qty: number; title: string }[] }) => deck.cards.map((c) => ({ ...c, info: obs.info({ title: c.title }) as any }));

function assumedDeck(obs: Observation) {
  const deck = knownDeck(obs.opp.identity?.title);
  if (!deck) return undefined;
  const titles = new Set(deck.cards.map((c) => c.title));
  for (const t of obs.memory.opponentTitles) if (t !== deck.identity && !titles.has(t)) return undefined;
  return deck;
}

export function agendaOutlook(obs: Observation): AgendaOutlook | null {
  const deck = assumedDeck(obs);
  if (!deck || obs.side !== "runner") return null;
  const agendas = cardsOf(obs, deck).filter((c) => c.info.type === "Agenda");
  let left = agendas.reduce((n, c) => n + c.qty, 0);
  let points = agendas.reduce((n, c) => n + c.qty * Number(c.info.agendapoints ?? 0), 0);
  const gone = [...(obs.opp.scored ?? []), ...(obs.me.scored ?? []), ...(obs.opp.discard ?? []).filter((c: any) => c.type === "Agenda")];
  for (const c of gone) {
    left--;
    points -= Number(c.agendapoints ?? (obs.info(c) as any).agendapoints ?? 0);
  }
  const seenInstalled = [...obs.memory.seen.values()].filter((s) => s.type === "Agenda" && s.zone === "servers");
  for (const s of seenInstalled) {
    left--;
    points -= Number((obs.info({ title: s.title }) as any).agendapoints ?? 0);
  }
  left = Math.max(0, left);
  points = Math.max(0, points);
  const facedown = obs.servers.filter((s) => s.remote).flatMap((s) => s.content).filter((c: any) => !c.rezzed && !c.title && !obs.memory.seen.has(c.cid)).length;
  const { hq: knownHq, rd: knownRd } = knownCentrals(obs);
  const unknownCards = Math.max(1, Number(obs.opp["deck-count"] ?? 0) + Number(obs.opp["hand-count"] ?? 0) - knownHq - knownRd + facedown);
  return { agendas: left, points, unknownCards, density: Math.min(1, left / unknownCards), averagePoints: left ? points / left : 0 };
}

export function knownCentrals(obs: Observation): { hq: number; rd: number } {
  const hq = Math.min(Number(obs.opp["hand-count"] ?? 0), ((obs.memory.notes.hqKnown ?? []) as string[]).length);
  const rd = Math.min(Number(obs.opp["deck-count"] ?? 0), ((obs.memory.notes.rdKnown ?? []) as string[]).length);
  return { hq, rd };
}

export function accessesOn(obs: Observation, server: ServerInfo): number {
  let n = 1;
  if (server.key === "hq" && obs.rig.some((c: any) => c.title === "Docklands Pass") && !obs.memory.runs.some((r) => r.turn === obs.turn && r.server === "HQ")) n += 1;
  return n;
}

export function passiveGains(obs: Observation, server: ServerInfo, accesses: number): number {
  let credits = 0;
  const central = !server.remote;
  const identity = plain((obs.info(obs.me.identity) as any)?.text ?? "");
  if (central && /gain 1\s*\[credit\] for each card you accessed/i.test(identity)) credits += accesses;
  if (obs.rig.some((c: any) => c.title === "Pennyshaver")) credits += 1;
  if (central && obs.rig.some((c: any) => c.title === "Leech")) credits += 1;
  return credits;
}

export function centralValue(obs: Observation, server: ServerInfo): number | null {
  const outlook = agendaOutlook(obs);
  if (!outlook) return null;
  const accesses = accessesOn(obs, server);
  const need = Number(obs.me["agenda-point-req"] ?? 7) - Number(obs.me["agenda-point"] ?? 0);
  const closing = outlook.averagePoints >= need ? 1.5 : 1;
  const known = knownCentrals(obs);
  const size = Number(obs.opp["hand-count"] ?? 0);
  const fresh = server.key === "hq" ? accesses * (Math.max(0, size - known.hq) / Math.max(1, size)) : server.key === "rd" ? Math.max(0, accesses - known.rd) : accesses;
  const expectedPoints = Math.min(1, outlook.density * fresh) * outlook.averagePoints * closing;
  const credits = passiveGains(obs, server, accesses);
  return expectedPoints * 7 + credits * 0.6;
}

export function unseenIceDamage(obs: Observation): number | null {
  const deck = assumedDeck(obs);
  if (!deck) return null;
  const onBoard = new Map<string, number>();
  for (const s of obs.servers) for (const i of s.ices) if (i.title) onBoard.set(i.title, (onBoard.get(i.title) ?? 0) + 1);
  for (const c of obs.opp.discard ?? []) if (c.type === "ICE" && c.title) onBoard.set(c.title, (onBoard.get(c.title) ?? 0) + 1);
  let worst = 0;
  for (const c of cardsOf(obs, deck)) {
    if (c.info.type !== "ICE" || c.qty <= (onBoard.get(c.title) ?? 0)) continue;
    worst = Math.max(worst, iceThreat({ title: c.title, subtypes: c.info.subtypes ?? [], strength: Number(c.info.strength ?? 0), subroutines: [] }, c.info, obs.credits, obs.hand.length).damage);
  }
  return worst;
}

export interface UnrezzedPrice {
  cost: number;
  blocked: number;
  exact: boolean;
}

export function unrezzedPrice(obs: Observation, budget = obs.credits, corpBudget = Number(obs.opp.credit ?? 0)): UnrezzedPrice | null {
  const deck = assumedDeck(obs);
  if (!deck || obs.side !== "runner") return null;
  const onBoard = new Map<string, number>();
  for (const s of obs.servers) for (const i of s.ices) if (i.title) onBoard.set(i.title, (onBoard.get(i.title) ?? 0) + 1);
  for (const c of obs.opp.discard ?? []) if (c.type === "ICE" && c.title) onBoard.set(c.title, (onBoard.get(c.title) ?? 0) + 1);
  const profiles = rigProfiles(obs);
  let weight = 0;
  let cost = 0;
  let blocked = 0;
  for (const c of cardsOf(obs, deck)) {
    if (c.info.type !== "ICE") continue;
    const copies = Math.max(0, c.qty - (onBoard.get(c.title) ?? 0));
    if (!copies) continue;
    if (Number(c.info.cost ?? 0) > corpBudget) {
      weight += copies;
      continue;
    }
    const text = plain(c.info.text ?? "");
    const subs = (text.match(/\[subroutine\]/gi) ?? []).length || 1;
    const ice = { title: c.title, subtypes: c.info.subtypes ?? [], strength: Number(c.info.strength ?? 0), subroutines: Array.from({ length: subs }, () => ({})) };
    const option = profiles.filter((p) => canBreak(p, ice)).map((p) => breakCost(p, ice)).sort((a, b) => a.value - b.value)[0];
    weight += copies;
    const clickable = (ice.subtypes ?? []).includes("Bioroid") ? clickThrough({ ...ice, text: c.info.text }, Number(obs.clicks ?? 0) - 1) : 0;
    if (option && option.value <= budget) cost += copies * option.value;
    else if (clickable) cost += copies * clickable * CLICK_AS_CREDITS;
    else if (option) {
      blocked += copies;
      cost += copies * option.value;
    } else {
      const threat = iceThreat({ ...ice, subroutines: [] }, c.info, obs.credits, obs.hand.length);
      if (threat.etr) blocked += copies;
      cost += copies * (threat.damage * 2 + threat.creditLoss);
    }
  }
  if (!weight) return { cost: 0, blocked: 0, exact: false };
  return { cost: cost / weight, blocked: blocked / weight, exact: false };
}

export interface HiddenBreaker {
  cost: number;
  odds: number;
  title: string;
}

export function hiddenBreaker(obs: Observation, ice: any): HiddenBreaker | null {
  if (obs.side !== "corp") return null;
  const deck = assumedDeck(obs);
  if (!deck) return null;
  const cov = coverage(obs);
  const grip = Number(obs.opp["hand-count"] ?? 0);
  const unseen = Math.max(1, Number(obs.opp["deck-count"] ?? 0) + grip);
  const runnerCredits = Number(obs.opp.credit ?? 0);
  let best: HiddenBreaker | null = null;
  for (const c of cardsOf(obs, deck)) {
    if (!(c.info.subtypes ?? []).includes("Icebreaker")) continue;
    const seen = [...obs.memory.seen.values()].filter((s) => s.title === c.title).length;
    const copies = Math.max(0, c.qty - seen);
    if (!copies) continue;
    const profile = breakerProfile({ title: c.title, subtypes: c.info.subtypes, strength: Number(c.info.strength ?? 0) }, c.info);
    if (!profile || !canBreak(profile, ice)) continue;
    if (profile.breaks !== "AI" && (profile.breaks as string[]).every((t) => cov.has(t as any))) continue;
    const install = Number(c.info.cost ?? 0);
    const cost = install + breakCost(profile, ice).value;
    if (cost > runnerCredits || grip < 2) continue;
    const odds = 1 - Math.pow(1 - copies / unseen, grip);
    if (!best || odds > best.odds) best = { cost, odds, title: c.title };
  }
  return best;
}
