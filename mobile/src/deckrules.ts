import type { Card, Deck, DeckEntry } from "./engine";
import { t } from "./i18n";

export const FORMATS = [
  { key: "standard", label: "Standard" },
  { key: "startup", label: "Startup" },
  { key: "eternal", label: "Eternal" },
  { key: "system-gateway", label: "Gateway" },
  { key: "core", label: "Core" },
  { key: "throwback", label: "Throwback" },
  { key: "casual", label: "Casual" },
] as const;

export type FormatKey = (typeof FORMATS)[number]["key"];

export const GAME_FORMATS = [
  ...FORMATS,
  { key: "preconstructed", label: "Precons" },
  { key: "chimera", label: "Chimera" },
  { key: "quick-draft", label: "Quick Draft" },
] as const;

export type GameFormat = (typeof GAME_FORMATS)[number]["key"];

const FORMAT_DESC_EN: Record<GameFormat, string> = {
  standard: "The current competitive pool and ban list.",
  startup: "System Gateway, Elevation and the newest set. Small and beginner friendly.",
  eternal: "Every card ever printed, with a short ban list.",
  "system-gateway": "Only the System Gateway starter cards.",
  core: "System Gateway and Elevation.",
  throwback: "The classic Fantasy Flight era cycles.",
  casual: "Any card. Only the basic deckbuilding rules apply.",
  preconstructed: "Preconstructed decks only.",
  chimera: "Each player is dealt a random deck when the game starts.",
  "quick-draft": "Both players draft their deck at the start of the game.",
};

const listed = (names: string[]) => (names.length > 1 ? t("{list} and {last}", { list: names.slice(0, -1).join(", "), last: names[names.length - 1] }) : (names[0] ?? ""));

const FORMAT_POOLS: Partial<Record<GameFormat, { base?: GameFormat; cycles: string[] }>> = {};

function describeFormat(f: GameFormat): string {
  const pool = FORMAT_POOLS[f];
  if (!pool) return t(FORMAT_DESC_EN[f]);
  return pool.base ? t("{base} + {cycles}.", { base: t(GAME_FORMATS.find((g) => g.key === pool.base)!.label), cycles: listed(pool.cycles) }) : `${listed(pool.cycles)}.`;
}

/** Format descriptions, translated each time they are read. */
export const FORMAT_DESC: Readonly<Record<GameFormat, string>> = Object.defineProperties(
  {} as Record<GameFormat, string>,
  Object.fromEntries(GAME_FORMATS.map((g) => [g.key, { get: () => describeFormat(g.key), enumerable: true }])),
);

export function applyFormatPools(pools: Partial<Record<GameFormat, { cycles: string[] }>>) {
  const cycles = (f: GameFormat) => pools[f]?.cycles ?? [];
  const describe = (f: GameFormat, base?: GameFormat) => {
    const own = cycles(f);
    if (!own.length) return;
    const from = base ? cycles(base) : [];
    const extra = own.filter((c) => !from.includes(c));
    FORMAT_POOLS[f] = base && from.length && from.every((c) => own.includes(c)) && extra.length ? { base, cycles: extra } : { cycles: own };
  };
  describe("core");
  describe("startup", "core");
  describe("standard", "startup");
}

export const isGameFormat = (f: unknown): f is GameFormat => GAME_FORMATS.some((g) => g.key === f);

export const dealtFormat = (f: GameFormat) => f === "chimera" || f === "quick-draft";

export const deckFormat = (f: GameFormat): FormatKey | null => (FORMATS.some((g) => g.key === f) ? (f as FormatKey) : null);

export const ETERNAL_POINTS = 7;

export const TYPE_ORDER: Record<"Corp" | "Runner", string[]> = {
  Corp: ["Agenda", "Asset", "Upgrade", "Operation", "ICE"],
  Runner: ["Event", "Hardware", "Resource", "Program"],
};

export const isNeutral = (card: Card) => !card.faction || card.faction.startsWith("Neutral");

export function influenceOf(identity: Card, card: Card) {
  return card.faction === identity.faction || isNeutral(card) ? 0 : Number(card.factioncost ?? 0);
}

const starterOnly = (card: Card) => /^Starter game only\./.test(String(card.text ?? ""));

export function legality(card: Card, format: FormatKey): "legal" | "banned" | "rotated" | "restricted" {
  if (format === "casual") return "legal";
  if (starterOnly(card)) return "banned";
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
  const pointsRange = corp ? agendaRange(Math.max(size, minimum)) : null;
  const problems: Problem[] = [];
  if (size < minimum) problems.push({ level: "error", text: minimum - size === 1 ? t("1 more card needed (minimum {min})", { min: minimum }) : t("{n} more cards needed (minimum {min})", { n: minimum - size, min: minimum }) });
  if (influenceLimit != null && influence > influenceLimit) problems.push({ level: "error", text: t("{n} influence over the limit", { n: influence - influenceLimit }) });
  if (pointsRange && (points < pointsRange[0] || points > pointsRange[1])) problems.push({ level: "error", text: t("Agenda points must be {a} or {b} for {size} cards (now {points})", { a: pointsRange[0], b: pointsRange[1], size: Math.max(size, minimum), points }) });
  for (const e of deck.cards) {
    if (e.qty > deckLimit(e.card)) problems.push({ level: "error", text: deckLimit(e.card) > 1 ? t("{card}: at most {n} copies", { card: e.card.title, n: deckLimit(e.card) }) : t("{card}: at most {n} copy", { card: e.card.title, n: deckLimit(e.card) }) });
    if (e.card.side !== identity.side) problems.push({ level: "error", text: e.card.side === "Corp" ? t("{card} is a Corp card", { card: e.card.title }) : t("{card} is a Runner card", { card: e.card.title }) });
    if (corp && e.card.type === "Agenda" && !isNeutral(e.card) && e.card.faction !== identity.faction) problems.push({ level: "error", text: t("{card}: agendas must be neutral or from your faction", { card: e.card.title }) });
  }
  let eternal = 0;
  if (format !== "casual") {
    const name = t(FORMATS.find((f) => f.key === format)!.label);
    for (const c of [identity, ...deck.cards.map((e) => e.card)]) {
      const l = legality(c, format);
      if (starterOnly(c)) problems.push({ level: "error", text: t("{card} is for starter games only", { card: c.title }) });
      else if (l === "banned") problems.push({ level: "error", text: t("{card} is banned in {format}", { card: c.title, format: name }) });
      else if (l === "rotated") problems.push({ level: "error", text: t("{card} is not in {format}", { card: c.title, format: name }) });
    }
    const restricted = deck.cards.filter((e) => legality(e.card, format) === "restricted");
    if (restricted.length > 1) problems.push({ level: "error", text: t("Only one restricted card allowed ({cards})", { cards: restricted.map((e) => e.card.title).join(", ") }) });
    if (format === "eternal") {
      eternal = [identity, ...deck.cards.map((e) => e.card)].reduce((n, c) => n + eternalPoints(c), 0);
      if (eternal > ETERNAL_POINTS) problems.push({ level: "error", text: t("{n} Eternal points, {max} allowed", { n: eternal, max: ETERNAL_POINTS }) });
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
