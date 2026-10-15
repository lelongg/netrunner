import { useMemo, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { CardImage } from "../game/CardImage";
import { useBackClose } from "../back";
import { DeckBrowser } from "./DeckBrowser";
import { DeckViewer } from "./DeckViewer";
import { type WireDeck, deckSize, fromPrecon, fromWire, importNrdb, parseDecklist, saveDeck, savedDecks, toWire } from "../decks";

interface Props {
  side: Side;
  db: CardDb;
  matchups: Matchup[];
  value?: WireDeck;
  onChange: (deck: WireDeck) => void;
  showCurrent?: boolean;
}

type Tab = "precon" | "browse" | "saved" | "import";

export function DeckPicker({ side, db, matchups, value, onChange, showCurrent = true }: Props) {
  const [tab, setTab] = useState<Tab>("precon");
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);
  const saved = useMemo(() => savedDecks().filter((d) => d.side === side), [value, tab]);
  const current = useMemo(() => (value ? fromWire(value, db) : undefined), [value]);
  useBackClose(viewing, () => setViewing(false));

  const pick = (w: WireDeck) => {
    setError(undefined);
    onChange(w);
  };

  const doImport = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const deck = /netrunnerdb\.com|^[0-9a-f-]{36}$/i.test(text.trim())
        ? await importNrdb(text.trim(), side, db)
        : parseDecklist(text, side, db);
      saveDeck(deck, side);
      pick(toWire(deck));
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="deck-picker">
      {showCurrent && current && (
        <button class="deck-current" onClick={() => setViewing(true)} aria-label={`View deck ${current.name}`}>
          <CardImage class="deck-identity" code={current.identity.code} alt={current.identity.title} size="small" />
          <span class="deck-current-info">
            <strong>{current.name}</strong>
            <span>{current.identity.title}</span>
            <span>{deckSize(current)} cards</span>
          </span>
          <span class="label cyan">View</span>
        </button>
      )}
      {viewing && current && <DeckViewer deck={current} onClose={() => setViewing(false)} />}
      <div class="tabs">
        {(["precon", "browse", "saved", "import"] as Tab[]).map((t) => (
          <button class={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "precon" ? "Precons" : t === "browse" ? "NRDB" : t === "saved" ? "Mine" : "Import"}
          </button>
        ))}
      </div>
      {tab === "precon" && (
        <ul class="deck-list">
          {matchups.map((m) => {
            const p = m[side];
            const name = matchups.filter((o) => o[side].name === p.name).length > 1 ? `${p.name} · ${m.title}` : p.name;
            return (
              <li>
                <button class={value?.name === name ? "on" : ""} onClick={() => pick(toWire({ ...fromPrecon(p, db), name }))}>
                  <strong>{p.name}</strong>
                  <span>{m.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {tab === "browse" && (
        <DeckBrowser
          side={side}
          db={db}
          selected={value?.name}
          onPick={(l) => {
            saveDeck(l.deck!, side);
            pick(toWire(l.deck!));
          }}
        />
      )}
      {tab === "saved" && (
        <ul class="deck-list">
          {saved.length === 0 && <li class="hint">No imported deck for this side yet.</li>}
          {saved.map((d) => (
            <li>
              <button class={value?.name === d.name ? "on" : ""} onClick={() => pick(d)}>
                <strong>{d.name}</strong>
                <span>{d.identity}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {tab === "import" && (
        <div class="import">
          <textarea
            rows={6}
            value={text}
            onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
            placeholder={"NetrunnerDB link\nor a text decklist:\nHaas-Bioroid: Precision Design\n3x Hedge Fund\n…"}
          />
          <button class="primary" disabled={busy || !text.trim()} onClick={doImport}>
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      )}
      {error && <p class="error">{error}</p>}
    </div>
  );
}
