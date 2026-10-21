import type { Card, CardDb, Deck, DeckEntry, Matchup, PreconDeck, Side } from "./engine";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function finder(db: CardDb) {
  const byNorm = new Map(db.all.map((c) => [normalize(c.title), c]));
  return (name: string): Card | undefined => {
    const clean = name.replace(/\s*[•●★]+\s*/g, " ").trim();
    return (
      db.byTitle.get(clean) ??
      byNorm.get(normalize(clean)) ??
      byNorm.get(normalize(clean.replace(/\s*\([^)]*\)\s*$/, "")))
    );
  };
}

function build(name: string, side: Side, found: Map<Card, number>): Deck {
  const ids = [...found.keys()].filter((c) => c.type === "Identity");
  const sideName = ids.some((c) => c.side === (side === "corp" ? "Corp" : "Runner")) || !ids.length ? (side === "corp" ? "Corp" : "Runner") : ids[0].side;
  const entries = [...found.entries()].filter(([c]) => c.side === sideName);
  const identity = entries.find(([c]) => c.type === "Identity")?.[0];
  if (!identity) throw new Error("No identity found in this deck");
  const cards: DeckEntry[] = entries
    .filter(([c]) => c.type !== "Identity")
    .map(([card, qty]) => ({ qty, card }))
    .sort((a, b) => a.card.type.localeCompare(b.card.type) || a.card.title.localeCompare(b.card.title));
  return { name, identity, cards };
}

export function parseDecklist(text: string, side: Side, db: CardDb, name = "Imported deck"): Deck {
  const find = finder(db);
  const found = new Map<Card, number>();
  const unknown: string[] = [];
  let title0: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(#|\/\/)/.test(line)) continue;
    const before = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i);
    const after = before ? null : line.match(/^(.+?)\s+[x×]\s*(\d+)$/i);
    const qty = before ? Number(before[1]) : after ? Number(after[2]) : 1;
    const title = before ? before[2] : after ? after[1] : line;
    const card = find(title);
    if (card) found.set(card, (found.get(card) ?? 0) + qty);
    else if (!found.size && !unknown.length && !before && !after) title0 = line;
    else if (!/^[A-Za-z ]+\(\d+\)$/.test(line)) unknown.push(title);
  }
  const deck = build(title0 ?? name, side, found);
  if (unknown.length) console.warn("Unknown cards", unknown);
  return deck;
}

export async function importNrdb(url: string, side: Side, db: CardDb): Promise<Deck> {
  const id = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b\d{3,}\b)/i)?.[1];
  if (!id) throw new Error("Unrecognized NetrunnerDB link");
  const kinds = url.includes("/deck/") ? ["deck", "decklist"] : ["decklist", "deck"];
  for (const kind of kinds) {
    const res = await fetch(`https://netrunnerdb.com/api/2.0/public/${kind}/${id}`);
    if (!res.ok) continue;
    const json: any = await res.json();
    const data = json.data?.[0];
    if (!data) continue;
    const found = new Map<Card, number>();
    for (const [code, qty] of Object.entries(data.cards as Record<string, number>)) {
      const card = db.byCode.get(code);
      if (card) found.set(card, (found.get(card) ?? 0) + qty);
    }
    return build(data.name ?? "Deck NetrunnerDB", side, found);
  }
  throw new Error("Deck not found on NetrunnerDB (is it published or shared?)");
}

export function fromPrecon(p: PreconDeck, db: CardDb): Deck {
  const identity = db.byTitle.get(p.identity);
  if (!identity) throw new Error(`Unknown identity: ${p.identity}`);
  return {
    name: p.name,
    identity,
    cards: p.cards.flatMap(({ qty, title }) => {
      const card = db.byTitle.get(title);
      return card && card.type !== "Identity" ? [{ qty, card }] : [];
    }),
  };
}

export function deckSize(deck: Deck) {
  return deck.cards.reduce((n, e) => n + e.qty, 0);
}

export interface WireDeck {
  name: string;
  identity: string;
  cards: [string, number][];
  ref?: string;
}

export const toWire = (d: Deck): WireDeck => ({
  name: d.name,
  identity: d.identity.title,
  cards: d.cards.map((e) => [e.card.title, e.qty]),
});

export function fromWire(w: WireDeck, db: CardDb): Deck {
  return fromPrecon({ name: w.name, identity: w.identity, cards: w.cards.map(([title, qty]) => ({ qty, title })) }, db);
}

export const engineDeck = (d: Deck) => ({ identity: d.identity, cards: d.cards.map(({ qty, card }) => ({ qty, card })) });

const STORE = "nsg.decks";
const MAX_DECKS = 80;

export interface StoredDeck extends WireDeck {
  side: Side;
  id: string;
  format?: string;
  updatedAt?: number;
}

const newDeckId = () => Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join("");

export function savedDecks(): StoredDeck[] {
  try {
    const raw: (WireDeck & { side: Side; id?: string })[] = JSON.parse(localStorage.getItem(STORE) ?? "[]");
    return raw.map((d) => ({ ...d, id: d.id ?? `${d.side}:${d.name}` }));
  } catch {
    return [];
  }
}

function writeDecks(all: StoredDeck[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(all.slice(0, MAX_DECKS)));
  } catch {
    /* storage unavailable */
  }
}

export function saveDeck(deck: Deck, side: Side) {
  const all = savedDecks();
  const same = all.find((d) => d.name === deck.name && d.side === side);
  writeDecks([{ ...toWire(deck), side, id: same?.id ?? newDeckId(), format: same?.format, updatedAt: Date.now() }, ...all.filter((d) => d !== same)]);
}

export function putDeck(deck: Omit<StoredDeck, "id"> & { id?: string }): StoredDeck {
  const stored: StoredDeck = { ...deck, id: deck.id ?? newDeckId(), updatedAt: Date.now() };
  writeDecks([stored, ...savedDecks().filter((d) => d.id !== stored.id)]);
  return stored;
}

const DEFAULT_KEY = (side: Side) => `nsg.defaultDeck.${side}`;

export function defaultDeckId(side: Side): string | undefined {
  try {
    return localStorage.getItem(DEFAULT_KEY(side)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setDefaultDeckId(side: Side, id: string | undefined) {
  try {
    if (id) localStorage.setItem(DEFAULT_KEY(side), id);
    else localStorage.removeItem(DEFAULT_KEY(side));
  } catch {}
}

export function defaultStored(side: Side): StoredDeck | undefined {
  const id = defaultDeckId(side);
  return id ? savedDecks().find((d) => d.id === id && d.side === side) : undefined;
}

export function latest(deck: WireDeck, side: Side): WireDeck {
  const saved = savedDecks();
  const found = (deck.ref && saved.find((d) => d.id === deck.ref)) || (!deck.ref && saved.find((d) => d.side === side && d.name === deck.name));
  return found ? { name: found.name, identity: found.identity, cards: found.cards, ref: found.id } : deck;
}

export function removeDeck(id: string) {
  writeDecks(savedDecks().filter((d) => d.id !== id));
}

const SEEDED = "nsg.seededStarters";

export function seedStarters(db: CardDb, matchups: Matchup[]) {
  try {
    if (localStorage.getItem(SEEDED) || savedDecks().length) return;
    localStorage.setItem(SEEDED, "1");
  } catch {
    return;
  }
  const starters = matchups.filter((m) => m.corp.name.includes("System Gateway"));
  for (const m of [...starters].reverse()) {
    for (const side of ["corp", "runner"] as Side[]) {
      const p = m[side];
      try {
        const stored = putDeck({ ...toWire({ ...fromPrecon(p, db), name: `${p.name} · ${m.title}` }), side, format: "casual" });
        if (m === starters[0]) setDefaultDeckId(side, stored.id);
      } catch {}
    }
  }
}
