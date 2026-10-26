import { useEffect, useMemo, useState } from "preact/hooks";
import type { CardDb, Side } from "../engine";
import { type Decklist, FACTIONS, fetchDecklists } from "../nrdb";
import { type FormatKey, analyze } from "../deckrules";
import { Icon } from "../icons";
import { IdentityThumb } from "./IdentityThumb";
import { FactionLogo } from "../FactionLogo";

interface Props {
  side: Side;
  db: CardDb;
  selected?: string;
  onPick: (list: Decklist) => void;
  format?: FormatKey;
}

const plain = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function DeckBrowser({ side, db, selected, onPick, format }: Props) {
  const [faction, setFaction] = useState<string | null>(null);
  const [standard, setStandard] = useState(true);
  const [lists, setLists] = useState<Decklist[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<{ code: string; title: string }[]>([]);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);
  const sideName = side === "corp" ? "Corp" : "Runner";
  const term = plain(q);
  const identities = useMemo(() => (term.length >= 2 ? db.all.filter((c) => c.side === sideName && c.type === "Identity" && plain(c.title).includes(term)).map((c) => String(c.code)) : []), [term, side]);
  const suggestions = useMemo(() => {
    const t = plain(text.trim());
    if (t.length < 3) return [];
    const seen = new Set(cards.map((c) => c.title));
    return db.all.filter((c) => c.side === sideName && c.type !== "Identity" && !seen.has(c.title) && plain(c.title).includes(t)).slice(0, 4);
  }, [text, side, cards]);
  const addCard = (c: { code: unknown; title: string }) => {
    setCards((prev) => [...prev, { code: String(c.code), title: c.title }].slice(0, 3));
    setText("");
    setQ("");
  };

  const load = async (next: number, reset: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetchDecklists(db, side, faction, next, format, { q, identities, cards: cards.map((c) => c.code) });
      setLists((prev) => (reset ? res.items : [...prev, ...res.items]));
      setHasMore(res.hasMore);
      setPage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setLists([]);
    setWant(10);
    load(1, true);
  }, [side, faction, format, q, cards.map((c) => c.code).join()]);

  const shown = lists.filter((l) => l.deck && (format ? format === "casual" || analyze(l.deck, format).legal : !standard || l.standard));
  const filtering = !!format && format !== "casual";
  const [want, setWant] = useState(10);

  useEffect(() => {
    if (filtering && !busy && !error && hasMore && shown.length < want && page < 30) load(page + 1, false);
  }, [busy, page, shown.length, want]);

  return (
    <div class="deck-browser">
      <label class="search">
        <Icon name="search" />
        <input type="search" value={text} placeholder="Deck, player, identity or card" onInput={(e) => setText((e.target as HTMLInputElement).value)} />
      </label>
      {(suggestions.length > 0 || cards.length > 0) && (
        <div class="chips scroll-chips deck-search-cards">
          {cards.map((c) => (
            <button class="on" onClick={() => setCards((prev) => prev.filter((x) => x.code !== c.code))} aria-label={`Remove ${c.title}`}>
              {c.title} ×
            </button>
          ))}
          {suggestions.map((c) => (
            <button onClick={() => addCard(c)} aria-label={`Only decks with ${c.title}`}>
              + {c.title}
            </button>
          ))}
        </div>
      )}
      <div class="chips scroll-chips">
        <button class={faction === null ? "on" : ""} onClick={() => setFaction(null)}>
          All
        </button>
        {FACTIONS[side].map(([id, label]) => (
          <button class={`faction-chip ${faction === id ? "on" : ""}`} onClick={() => setFaction(id)}>
            <FactionLogo faction={id} />
            {label}
          </button>
        ))}
        {!format && (
          <button class={`toggle ${standard ? "on" : ""}`} onClick={() => setStandard(!standard)} aria-pressed={standard}>
            Standard only
          </button>
        )}
      </div>
      <ul class="deck-list">
        {shown.map((l) => (
          <li>
            <button class={`with-id ${selected === l.name ? "on" : ""}`} onClick={() => onPick(l)}>
              <IdentityThumb title={l.deck!.identity.title} db={db} />
              <strong>{l.name}</strong>
              <span>
                {l.deck!.identity.title} · {l.user} · {day(l.created)}
              </span>
            </button>
          </li>
        ))}
        {!busy && !error && shown.length === 0 && <li class="hint">{q || cards.length ? "No decklist matches." : format && format !== "casual" ? `No legal decklist in the last ${page * 20} published.` : "No playable decklist on this page."}</li>}
        {hasMore && (
          <li>
            <button class="more" disabled={busy} onClick={() => (filtering ? setWant(shown.length + 10) : load(page + 1, false))}>
              {busy ? "Loading…" : "Load more"}
            </button>
          </li>
        )}
        {busy && !hasMore && <li class="hint">Loading…</li>}
      </ul>
      {error && <p class="error">{error}</p>}
      <p class="hint">Latest published decklists from NetrunnerDB.</p>
    </div>
  );
}
