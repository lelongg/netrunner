import type { Card, CardDb, Deck, Side } from "./engine";

const API = "https://api.netrunnerdb.com/api/v3/public/decklists";
const PAGE = 20;

export const FACTIONS: Record<Side, [string, string][]> = {
  corp: [
    ["haas_bioroid", "HB"],
    ["jinteki", "Jinteki"],
    ["nbn", "NBN"],
    ["weyland_consortium", "Weyland"],
  ],
  runner: [
    ["anarch", "Anarch"],
    ["criminal", "Criminal"],
    ["shaper", "Shaper"],
  ],
};

export interface Decklist {
  id: string;
  name: string;
  user: string;
  created: string;
  deck?: Deck;
  missing: string[];
  standard: boolean;
}

export const cardId = (title: string) =>
  title
    .replace(/['’™®"]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const byId = new WeakMap<CardDb, Map<string, Card>>();
function lookup(db: CardDb) {
  let map = byId.get(db);
  if (!map) {
    map = new Map(db.all.map((c) => [cardId(c.title), c]));
    byId.set(db, map);
  }
  return map;
}

const standardLegal = (card: Card) => (card.format as any)?.standard?.legal === true;

function toDecklist(item: any, db: CardDb): Decklist {
  const a = item.attributes;
  const cards = lookup(db);
  const missing: string[] = [];
  const identity = cards.get(a.identity_card_id);
  if (!identity) missing.push(a.identity_card_id);
  const entries = Object.entries(a.card_slots as Record<string, number>).flatMap(([id, qty]) => {
    const card = cards.get(id);
    if (!card) missing.push(id);
    return card && card.type !== "Identity" ? [{ qty, card }] : [];
  });
  const deck = identity && !missing.length ? { name: a.name, identity, cards: entries } : undefined;
  return {
    id: item.id,
    name: a.name,
    user: a.user_id,
    created: a.created_at,
    deck,
    missing,
    standard: !!deck && standardLegal(deck.identity) && deck.cards.every((e) => standardLegal(e.card)),
  };
}

export async function fetchDecklists(db: CardDb, side: Side, faction: string | null, page: number) {
  const params = new URLSearchParams({ "filter[side_id]": side, sort: "-created_at", "page[size]": String(PAGE), "page[number]": String(page) });
  if (faction) params.set("filter[faction_id]", faction);
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`NetrunnerDB answered ${res.status}`);
  const json = await res.json();
  return {
    items: (json.data ?? []).filter((d: any) => d.attributes.follows_basic_deckbuilding_rules).map((d: any) => toDecklist(d, db)) as Decklist[],
    hasMore: !!json.links?.next,
  };
}
