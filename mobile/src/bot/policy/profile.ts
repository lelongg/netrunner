import { ICE_TYPES, type IceType, gainOf, isTrap, plain } from "./tactics.ts";
import type { CardInfo, DeckList, Lookup } from "./types.ts";

export interface ProfileCard {
  title: string;
  qty: number;
  type: string;
  cost: number;
  subtypes: string[];
  text: string;
  info: CardInfo;
}

export interface DeckProfile {
  cards: ProfileCard[];
  economyEvents: Map<string, number>;
  clickEconomy: Set<string>;
  passiveEconomy: Set<string>;
  economy: Set<string>;
  drawCards: Map<string, number>;
  runEvents: Set<string>;
  breakers: Record<IceType, string[]>;
  aiBreakers: string[];
  consoles: Set<string>;
  ice: Record<IceType, string[]>;
  traps: Set<string>;
  damageOps: Set<string>;
  fastAdvance: Set<string>;
  tagSources: Set<string>;
  tagPunish: Set<string>;
  agendas: { title: string; qty: number; adv: number; points: number }[];
}

const BREAKER_TYPES: Record<string, IceType> = { Fracter: "Barrier", Decoder: "Code Gate", Killer: "Sentry" };
const cache = new WeakMap<DeckList, DeckProfile>();

export function profileOf(deck: DeckList, lookup: Lookup): DeckProfile {
  const hit = cache.get(deck);
  if (hit) return hit;
  const cards: ProfileCard[] = deck.cards.map((e) => {
    const info: any = lookup(e.title) ?? {};
    return { title: e.title, qty: e.qty, type: String(info.type ?? ""), cost: Number(info.cost ?? 0), subtypes: info.subtypes ?? [], text: plain(String(info.text ?? "")), info };
  });
  const p: DeckProfile = {
    cards,
    economyEvents: new Map(),
    clickEconomy: new Set(),
    passiveEconomy: new Set(),
    economy: new Set(),
    drawCards: new Map(),
    runEvents: new Set(),
    breakers: { Barrier: [], "Code Gate": [], Sentry: [] },
    aiBreakers: [],
    consoles: new Set(),
    ice: { Barrier: [], "Code Gate": [], Sentry: [] },
    traps: new Set(),
    damageOps: new Set(),
    fastAdvance: new Set(),
    tagSources: new Set(),
    tagPunish: new Set(),
    agendas: [],
  };
  for (const c of cards) {
    const t = c.text;
    const lower = t.toLowerCase();
    if (c.type === "Event" || c.type === "Operation") {
      const gain = gainOf(t);
      if (gain > c.cost) p.economyEvents.set(c.title, gain - c.cost);
      const draw = t.match(/draw (\d+) cards?/i);
      if (draw && !/when you score/i.test(t)) p.drawCards.set(c.title, Number(draw[1]));
      if (c.subtypes.includes("Run")) p.runEvents.add(c.title);
      if (/do (x|\d+) (net|meat) damage/i.test(t)) p.damageOps.add(c.title);
      if (/place (\d+) advancement counters?|gain \[click\]/i.test(t)) p.fastAdvance.add(c.title);
      if (/play only if the runner is tagged/i.test(t)) p.tagPunish.add(c.title);
    }
    if (c.type === "Resource" || c.type === "Asset" || c.type === "Hardware") {
      if (/\[click\][^.]*:\s*(take|place|gain) \d+\s*\[credit\]/i.test(t) || /\[click\],?\s*\[trash\]:\s*gain/i.test(t)) p.clickEconomy.add(c.title);
      if (/when your turn begins, (take|gain) \d+\s*\[credit\]/i.test(t) || /whenever a run begins, place \d+\s*\[credit\]/i.test(t) || /whenever you make a successful run, place \d+\s*\[credit\]/i.test(t)) p.passiveEconomy.add(c.title);
    }
    if (c.type === "Asset" && isTrap(t)) p.traps.add(c.title);
    if (c.subtypes.includes("Ambush") && c.type !== "Agenda") p.traps.add(c.title);
    if (c.subtypes.includes("Console")) p.consoles.add(c.title);
    if (c.subtypes.includes("Icebreaker")) {
      if (c.subtypes.includes("AI")) p.aiBreakers.push(c.title);
      for (const [b, ice] of Object.entries(BREAKER_TYPES)) if (c.subtypes.includes(b)) p.breakers[ice].push(c.title);
    }
    if (c.type === "ICE") {
      for (const ice of ICE_TYPES) if (c.subtypes.includes(ice)) p.ice[ice].push(c.title);
      if (/give the runner \d+ tag/i.test(lower) || /take 1 tag/i.test(lower)) p.tagSources.add(c.title);
    }
    if ((c.type === "Operation" || c.type === "Upgrade") && /give the runner \d+ tag/i.test(lower)) p.tagSources.add(c.title);
    if (c.type === "Agenda") p.agendas.push({ title: c.title, qty: c.qty, adv: Number((c.info as any).advancementcost ?? 0), points: Number((c.info as any).agendapoints ?? 0) });
  }
  for (const title of [...p.economyEvents.keys(), ...p.clickEconomy, ...p.passiveEconomy]) p.economy.add(title);
  cache.set(deck, p);
  return p;
}

export const breakerType = (card: any): IceType | "AI" | null => {
  const subs: string[] = card?.subtypes ?? [];
  if (subs.includes("AI")) return "AI";
  for (const [b, ice] of Object.entries(BREAKER_TYPES)) if (subs.includes(b)) return ice;
  return null;
};
