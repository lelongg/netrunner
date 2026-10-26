import type { Card, CardDb, Deck, Side } from "./engine";
import { relayUrl } from "./net/relay";
import { cardId } from "./cardid";
import { t } from "./i18n";

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

export interface DeckResult {
  place: number;
  players: number;
  date: string;
  title: string;
}

export interface Decklist {
  id: string;
  name: string;
  user: string;
  created: string;
  deck?: Deck;
  missing: string[];
  standard: boolean;
  result?: DeckResult;
  similarity?: number;
}

export { cardId } from "./cardid";

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

function fromIndex(row: any, db: CardDb): Decklist {
  const missing: string[] = [];
  const identity = db.byCode.get(String(row.identity));
  if (!identity) missing.push(String(row.identity));
  const entries = String(row.cards)
    .split(",")
    .filter(Boolean)
    .flatMap((slot) => {
      const [code, qty] = slot.split(":");
      const card = db.byCode.get(code);
      if (!card) missing.push(code);
      return card ? [{ qty: Number(qty), card }] : [];
    });
  const deck = identity && !missing.length ? { name: row.name, identity, cards: entries } : undefined;
  return {
    id: row.id,
    name: row.name,
    user: row.user,
    created: row.created,
    deck,
    missing,
    standard: !!deck && standardLegal(deck.identity) && deck.cards.every((e) => standardLegal(e.card)),
    result: row.result ? (typeof row.result === "string" ? JSON.parse(row.result) : row.result) : undefined,
    similarity: row.similarity ?? undefined,
  };
}

export interface DeckSearch {
  q?: string;
  identities?: string[];
  cards?: string[];
  identity?: string;
  sort?: "new" | "results";
  top?: number;
}

async function relayJson(path: string, params: URLSearchParams) {
  const base = relayUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}?${params}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export const fetchStats = (k: string) => relayJson("/decklists/stats", new URLSearchParams({ k }));

export async function fetchSimilar(db: CardDb, of: { id: string } | Deck, format = "casual") {
  const params = new URLSearchParams({ format });
  if ("id" in of) params.set("id", of.id);
  else {
    params.set("identity", String(of.identity.code));
    params.set("cards", of.cards.map((e) => `${e.card.code}:${e.qty}`).join(","));
  }
  const json = await relayJson("/decklists/similar", params);
  if (!json) throw new Error(t("The deck index is unreachable right now."));
  return (json.items as any[]).map((row) => fromIndex(row, db));
}

async function fromRelay(db: CardDb, side: Side, faction: string | null, page: number, format?: string, search: DeckSearch = {}) {
  const base = relayUrl();
  if (!base) return null;
  const params = new URLSearchParams({ side, page: String(page) });
  if (format) params.set("format", format);
  if (faction) params.set("faction", faction);
  if (search.q) params.set("q", search.q);
  if (search.q) for (const id of search.identities ?? []) params.append("id", id);
  if (search.cards?.length) params.set("cards", search.cards.join(","));
  if (search.identity) params.set("identity", search.identity);
  if (search.sort && search.sort !== "new") params.set("sort", search.sort);
  if (search.top) params.set("top", String(search.top));
  try {
    const res = await fetch(`${base}/decklists?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    return { items: (json.items as any[]).map((row) => fromIndex(row, db)), hasMore: !!json.hasMore };
  } catch {
    return null;
  }
}

export async function fetchDecklists(db: CardDb, side: Side, faction: string | null, page: number, format?: string, search: DeckSearch = {}) {
  const indexed = await fromRelay(db, side, faction, page, format, search);
  if (indexed) return indexed;
  if (search.q || search.cards?.length || search.identity || search.top || (search.sort && search.sort !== "new")) throw new Error(t("Search needs the deck index, which is unreachable right now."));
  const params = new URLSearchParams({ "filter[side_id]": side, sort: "-created_at", "page[size]": String(PAGE), "page[number]": String(page) });
  if (faction) params.set("filter[faction_id]", faction);
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(t("NetrunnerDB answered {status}", { status: res.status }));
  const json = await res.json();
  return {
    items: (json.data ?? []).filter((d: any) => d.attributes.follows_basic_deckbuilding_rules).map((d: any) => toDecklist(d, db)) as Decklist[],
    hasMore: !!json.links?.next,
  };
}
