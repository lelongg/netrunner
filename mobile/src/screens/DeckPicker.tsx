import { useMemo, useState } from "preact/hooks";
import { type CardDb, type Matchup, type Side, cardImage } from "../engine";
import { type WireDeck, deckSize, fromPrecon, fromWire, importNrdb, parseDecklist, saveDeck, savedDecks, toWire } from "../decks";

interface Props {
  side: Side;
  db: CardDb;
  matchups: Matchup[];
  value?: WireDeck;
  onChange: (deck: WireDeck) => void;
}

type Tab = "precon" | "saved" | "import";

export function DeckPicker({ side, db, matchups, value, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("precon");
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const saved = useMemo(() => savedDecks().filter((d) => d.side === side), [value, tab]);
  const current = useMemo(() => (value ? fromWire(value, db) : undefined), [value]);

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
      {current && (
        <div class="deck-current">
          <img crossOrigin="anonymous" src={cardImage(current.identity.code, "small")} alt="" />
          <div>
            <strong>{current.name}</strong>
            <span>{current.identity.title}</span>
            <span>{deckSize(current)} cartes</span>
          </div>
        </div>
      )}
      <div class="tabs">
        {(["precon", "saved", "import"] as Tab[]).map((t) => (
          <button class={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "precon" ? "Préconstruits" : t === "saved" ? "Mes decks" : "Importer"}
          </button>
        ))}
      </div>
      {tab === "precon" && (
        <ul class="deck-list">
          {matchups.map((m) => {
            const p = m[side];
            return (
              <li>
                <button class={value?.name === p.name ? "on" : ""} onClick={() => pick(toWire(fromPrecon(p, db)))}>
                  <strong>{p.name}</strong>
                  <span>{m.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {tab === "saved" && (
        <ul class="deck-list">
          {saved.length === 0 && <li class="hint">Aucun deck importé pour ce camp.</li>}
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
            placeholder={"Lien NetrunnerDB\nou liste texte :\nHaas-Bioroid: Precision Design\n3x Hedge Fund\n…"}
          />
          <button class="primary" disabled={busy || !text.trim()} onClick={doImport}>
            {busy ? "Import…" : "Importer"}
          </button>
        </div>
      )}
      {error && <p class="error">{error}</p>}
    </div>
  );
}
