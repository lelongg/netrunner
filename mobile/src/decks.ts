import type { Card, CardDb, Deck, DeckEntry, PreconDeck, Side } from "./engine";

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
  const sideName = side === "corp" ? "Corp" : "Runner";
  const entries = [...found.entries()].filter(([c]) => c.side === sideName);
  const identity = entries.find(([c]) => c.type === "Identity")?.[0];
  if (!identity) throw new Error(`No ${sideName} identity found in this deck`);
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
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(#|\/\/)/.test(line)) continue;
    const before = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i);
    const after = before ? null : line.match(/^(.+?)\s+[x×]\s*(\d+)$/i);
    const qty = before ? Number(before[1]) : after ? Number(after[2]) : 1;
    const title = before ? before[2] : after ? after[1] : line;
    const card = find(title);
    if (card) found.set(card, (found.get(card) ?? 0) + qty);
    else if (!/^[A-Za-z ]+\(\d+\)$/.test(line)) unknown.push(title);
  }
  const deck = build(name, side, found);
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
    const json = await res.json();
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
      return card ? [{ qty, card }] : [];
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
}

export const toWire = (d: Deck): WireDeck => ({
  name: d.name,
  identity: d.identity.title,
  cards: d.cards.map((e) => [e.card.title, e.qty]),
});

export function fromWire(w: WireDeck, db: CardDb): Deck {
  return fromPrecon({ name: w.name, identity: w.identity, cards: w.cards.map(([title, qty]) => ({ qty, title })) }, db);
}

export const playableDeck = (d: Deck): Deck => ({ ...d, cards: d.cards.filter((e) => e.card.type !== "Identity") });

export const engineDeck = (d: Deck) => ({ identity: d.identity, cards: d.cards.map(({ qty, card }) => ({ qty, card })) });

const STORE = "nsg.decks";

export function savedDecks(): (WireDeck & { side: Side })[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}

export function saveDeck(deck: Deck, side: Side) {
  try {
    const all = savedDecks().filter((d) => !(d.name === deck.name && d.side === side));
    localStorage.setItem(STORE, JSON.stringify([{ ...toWire(deck), side }, ...all].slice(0, 30)));
  } catch {
    /* storage unavailable */
  }
}
