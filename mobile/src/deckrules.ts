import type { Card, Deck, DeckEntry } from "./engine";

export const FORMATS = [
  { key: "standard", label: "Standard" },
  { key: "startup", label: "Startup" },
  { key: "eternal", label: "Eternal" },
  { key: "system-gateway", label: "Gateway" },
  { key: "throwback", label: "Throwback" },
  { key: "casual", label: "Casual" },
] as const;

export type FormatKey = (typeof FORMATS)[number]["key"];

export const ETERNAL_POINTS = 7;

export const TYPE_ORDER: Record<"Corp" | "Runner", string[]> = {
  Corp: ["Agenda", "Asset", "Upgrade", "Operation", "ICE"],
  Runner: ["Event", "Hardware", "Resource", "Program"],
};

export const isNeutral = (card: Card) => !card.faction || card.faction.startsWith("Neutral");

export function influenceOf(identity: Card, card: Card) {
  return card.faction === identity.faction || isNeutral(card) ? 0 : Number(card.factioncost ?? 0);
}

export function legality(card: Card, format: FormatKey): "legal" | "banned" | "rotated" | "restricted" {
  if (format === "casual") return "legal";
  const f = (card.format as Record<string, { legal?: boolean; banned?: boolean; rotated?: boolean; restricted?: boolean }> | undefined)?.[format];
  if (!f || f.rotated) return "rotated";
  if (f.banned) return "banned";
  if (f.restricted) return "restricted";
  return f.legal ? "legal" : "rotated";
}

export const eternalPoints = (card: Card) => Number((card.format as any)?.eternal?.points ?? 0);

export const deckLimit = (card: Card) => Number(card["deck-limit"] ?? 3);

export function agendaRange(size: number): [number, number] {
  const base = 2 * Math.floor(size / 5) + 2;
  return [base, base + 1];
}

export interface Problem {
  level: "error" | "warning";
  text: string;
}

export interface Analysis {
  size: number;
  minimum: number;
  influence: number;
  influenceLimit: number | null;
  points: number;
  pointsRange: [number, number] | null;
  eternal: number;
  problems: Problem[];
  legal: boolean;
}

export function analyze(deck: Deck, format: FormatKey): Analysis {
  const { identity } = deck;
  const corp = identity.side === "Corp";
  const size = deck.cards.reduce((n, e) => n + e.qty, 0);
  const minimum = Number(identity.minimumdecksize ?? (corp ? 40 : 40));
  const influenceLimit = identity.influencelimit == null ? null : Number(identity.influencelimit);
  const influence = deck.cards.reduce((n, e) => n + influenceOf(identity, e.card) * e.qty, 0);
  const points = deck.cards.reduce((n, e) => n + Number(e.card.agendapoints ?? 0) * e.qty, 0);
  const pointsRange = corp ? agendaRange(size) : null;
  const problems: Problem[] = [];
  if (size < minimum) problems.push({ level: "error", text: `${minimum - size} more card${minimum - size > 1 ? "s" : ""} needed (minimum ${minimum})` });
  if (influenceLimit != null && influence > influenceLimit) problems.push({ level: "error", text: `${influence - influenceLimit} influence over the limit` });
  if (pointsRange && (points < pointsRange[0] || points > pointsRange[1])) problems.push({ level: "error", text: `Agenda points must be ${pointsRange[0]} or ${pointsRange[1]} for ${size} cards (now ${points})` });
  for (const e of deck.cards) {
    if (e.qty > deckLimit(e.card)) problems.push({ level: "error", text: `${e.card.title}: at most ${deckLimit(e.card)} ${deckLimit(e.card) > 1 ? "copies" : "copy"}` });
    if (e.card.side !== identity.side) problems.push({ level: "error", text: `${e.card.title} is a ${e.card.side} card` });
    if (corp && e.card.type === "Agenda" && !isNeutral(e.card) && e.card.faction !== identity.faction) problems.push({ level: "error", text: `${e.card.title}: agendas must be neutral or from your faction` });
  }
  let eternal = 0;
  if (format !== "casual") {
    const name = FORMATS.find((f) => f.key === format)!.label;
    for (const c of [identity, ...deck.cards.map((e) => e.card)]) {
      const l = legality(c, format);
      if (l === "banned") problems.push({ level: "error", text: `${c.title} is banned in ${name}` });
      else if (l === "rotated") problems.push({ level: "error", text: `${c.title} is not in ${name}` });
    }
    const restricted = deck.cards.filter((e) => legality(e.card, format) === "restricted");
    if (restricted.length > 1) problems.push({ level: "error", text: `Only one restricted card allowed (${restricted.map((e) => e.card.title).join(", ")})` });
    if (format === "eternal") {
      eternal = [identity, ...deck.cards.map((e) => e.card)].reduce((n, c) => n + eternalPoints(c), 0);
      if (eternal > ETERNAL_POINTS) problems.push({ level: "error", text: `${eternal} Eternal points, ${ETERNAL_POINTS} allowed` });
    }
  }
  return { size, minimum, influence, influenceLimit, points, pointsRange, eternal, problems, legal: !problems.some((p) => p.level === "error") };
}

export function groupByType(deck: Deck) {
  const order = TYPE_ORDER[deck.identity.side] ?? [];
  const byType = new Map<string, DeckEntry[]>();
  for (const entry of deck.cards) {
    const list = byType.get(entry.card.type) ?? [];
    list.push(entry);
    byType.set(entry.card.type, list);
  }
  const rank = (t: string) => (order.includes(t) ? order.indexOf(t) : order.length);
  return [...byType.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([type, entries]) => ({ type, count: entries.reduce((n, e) => n + e.qty, 0), entries: [...entries].sort((a, b) => a.card.title.localeCompare(b.card.title)) }));
}

export function costCurve(deck: Deck) {
  const buckets = new Map<number, number>();
  for (const e of deck.cards) {
    if (e.card.type === "Agenda" || e.card.cost == null) continue;
    const c = Math.min(6, Number(e.card.cost));
    buckets.set(c, (buckets.get(c) ?? 0) + e.qty);
  }
  return Array.from({ length: 7 }, (_, i) => ({ cost: i, count: buckets.get(i) ?? 0 }));
}

export function subtypeSpread(deck: Deck, type: string, keys: string[]) {
  const out = new Map(keys.map((k) => [k, 0]));
  for (const e of deck.cards) {
    if (e.card.type !== type) continue;
    const subs = (e.card.subtypes as string[] | undefined) ?? [];
    const k = keys.find((key) => subs.some((s) => s.toLowerCase() === key.toLowerCase()));
    if (k) out.set(k, out.get(k)! + e.qty);
  }
  return [...out.entries()].map(([label, count]) => ({ label, count }));
}

export function influenceByFaction(deck: Deck) {
  const out = new Map<string, number>();
  for (const e of deck.cards) {
    const inf = influenceOf(deck.identity, e.card) * e.qty;
    if (inf) out.set(e.card.faction!, (out.get(e.card.faction!) ?? 0) + inf);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}

export function toText(deck: Deck) {
  const lines = [deck.identity.title, ""];
  for (const g of groupByType(deck)) {
    lines.push(`${g.type} (${g.count})`);
    for (const e of g.entries) lines.push(`${e.qty}x ${e.card.title}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
