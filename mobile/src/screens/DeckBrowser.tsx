import { useEffect, useState } from "preact/hooks";
import type { CardDb, Side } from "../engine";
import { type Decklist, FACTIONS, fetchDecklists } from "../nrdb";
import { type FormatKey, FORMATS, analyze } from "../deckrules";
import { IdentityThumb } from "./IdentityThumb";

interface Props {
  side: Side;
  db: CardDb;
  selected?: string;
  onPick: (list: Decklist) => void;
  format?: FormatKey;
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function DeckBrowser({ side, db, selected, onPick, format }: Props) {
  const [faction, setFaction] = useState<string | null>(null);
  const [standard, setStandard] = useState(true);
  const [lists, setLists] = useState<Decklist[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = async (next: number, reset: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetchDecklists(db, side, faction, next, format);
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
  }, [side, faction, format]);

  const shown = lists.filter((l) => l.deck && (format ? format === "casual" || analyze(l.deck, format).legal : !standard || l.standard));
  const filtering = !!format && format !== "casual";
  const [want, setWant] = useState(10);

  useEffect(() => {
    if (filtering && !busy && !error && hasMore && shown.length < want && page < 30) load(page + 1, false);
  }, [busy, page, shown.length, want]);

  return (
    <div class="deck-browser">
      <div class="chips">
        <button class={faction === null ? "on" : ""} onClick={() => setFaction(null)}>
          All
        </button>
        {FACTIONS[side].map(([id, label]) => (
          <button class={faction === id ? "on" : ""} onClick={() => setFaction(id)}>
            {label}
          </button>
        ))}
        {format ? (
          <span class="chip-note">{FORMATS.find((f) => f.key === format)!.label} legal only</span>
        ) : (
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
        {!busy && !error && shown.length === 0 && <li class="hint">{format && format !== "casual" ? `No legal decklist in the last ${page * 20} published.` : "No playable decklist on this page."}</li>}
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
