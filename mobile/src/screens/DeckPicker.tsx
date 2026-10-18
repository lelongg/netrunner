import { useMemo, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { CardImage } from "../game/CardImage";
import { useBackClose } from "../back";
import { DeckBrowser } from "./DeckBrowser";
import { IdentityThumb } from "./IdentityThumb";
import { DeckViewer } from "./DeckViewer";
import { type WireDeck, deckSize, fromPrecon, fromWire, importNrdb, parseDecklist, saveDeck, savedDecks, toWire } from "../decks";
import { type GameFormat, FORMATS, analyze, deckFormat } from "../deckrules";

interface Props {
  side: Side;
  db: CardDb;
  matchups: Matchup[];
  value?: WireDeck;
  onChange: (deck: WireDeck) => void;
  showCurrent?: boolean;
  format?: GameFormat;
}

type Tab = "precon" | "browse" | "saved" | "import";

export function DeckPicker({ side, db, matchups, value, onChange, showCurrent = true, format = "casual" }: Props) {
  const rules = deckFormat(format);
  const legal = (w: WireDeck) => {
    if (!rules || rules === "casual") return true;
    try {
      return analyze(fromWire(w, db), rules).legal;
    } catch {
      return false;
    }
  };
  const tabs: Tab[] = format === "preconstructed" ? ["precon"] : ["precon", "browse", "saved", "import"];
  const [tab, setTab] = useState<Tab>("precon");
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);
  const saved = useMemo(() => savedDecks().filter((d) => d.side === side && legal(d)), [value, tab, format]);
  const precons = useMemo(() => matchups.filter((m) => format === "preconstructed" || legal(toWire(fromPrecon(m[side], db)))), [matchups, side, format]);
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
      if (!legal(toWire(deck))) throw new Error(`${deck.name} is not legal in ${FORMATS.find((f) => f.key === rules)?.label}. It was saved under Mine.`);
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
        {tabs.map((t) => (
          <button class={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "precon" ? "Precons" : t === "browse" ? "NRDB" : t === "saved" ? "Mine" : "Import"}
          </button>
        ))}
      </div>
      {tab === "precon" && (
        <ul class="deck-list">
          {precons.length === 0 && <li class="hint">No preconstructed deck is legal in this format.</li>}
          {precons.map((m) => {
            const p = m[side];
            const name = matchups.filter((o) => o[side].name === p.name).length > 1 ? `${p.name} · ${m.title}` : p.name;
            return (
              <li>
                <button class={`with-id ${value?.name === name ? "on" : ""}`} onClick={() => pick(toWire({ ...fromPrecon(p, db), name }))}>
                  <IdentityThumb title={p.identity} db={db} />
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
          format={rules ?? undefined}
          onPick={(l) => {
            saveDeck(l.deck!, side);
            pick(toWire(l.deck!));
          }}
        />
      )}
      {tab === "saved" && (
        <ul class="deck-list">
          {saved.length === 0 && <li class="hint">{rules && rules !== "casual" ? "No deck of yours for this side is legal in this format." : "No deck of yours for this side yet. Build one from Decks on the home screen."}</li>}
          {saved.map((d) => (
            <li>
              <button class={`with-id ${value?.name === d.name ? "on" : ""}`} onClick={() => pick({ name: d.name, identity: d.identity, cards: d.cards })}>
                <IdentityThumb title={d.identity} db={db} />
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
