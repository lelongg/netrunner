import { useMemo, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { CardImage } from "../game/CardImage";
import { useBackClose } from "../back";
import { DeckRow, DeckView } from "./Decks";
import { type WireDeck, deckSize, fromPrecon, fromWire, savedDecks, toWire } from "../decks";
import { Icon } from "../icons";
import { type GameFormat, FORMATS, analyze, deckFormat } from "../deckrules";

interface Props {
  side: Side;
  db: CardDb;
  matchups: Matchup[];
  value?: WireDeck;
  onChange: (deck: WireDeck) => void;
  onEditDecks?: () => void;
  showCurrent?: boolean;
  format?: GameFormat;
}

export function DeckPicker({ side, db, matchups, value, onChange, onEditDecks, showCurrent = true, format = "casual" }: Props) {
  const rules = deckFormat(format);
  const problemOf = (w: WireDeck): string | null => {
    if (!rules || rules === "casual") return null;
    try {
      const a = analyze(fromWire(w, db), rules);
      return a.legal ? null : (a.problems.find((p) => p.level === "error")?.text ?? `Not legal in ${FORMATS.find((f) => f.key === rules)?.label}`);
    } catch {
      return "Unknown cards";
    }
  };
  const [viewing, setViewing] = useState(false);
  const mine = useMemo(
    () =>
      savedDecks()
        .filter((d) => d.side === side)
        .map((d) => ({ deck: d, problem: problemOf(d) }))
        .sort((a, b) => Number(!!a.problem) - Number(!!b.problem)),
    [value, format, side],
  );
  const precons = useMemo(() => matchups.filter((m) => format === "preconstructed" || !problemOf(toWire(fromPrecon(m[side], db)))), [matchups, side, format]);
  const current = useMemo(() => (value ? fromWire(value, db) : undefined), [value]);
  useBackClose(viewing, () => setViewing(false));
  const onlyPrecons = format === "preconstructed";

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
      {viewing && current && <DeckView deck={current} onClose={() => setViewing(false)} />}
      {!onlyPrecons && (
        <>
          <span class="label">Your decks</span>
          <ul class="deck-library">
            {mine.length === 0 && <li class="hint">No {side === "corp" ? "Corp" : "Runner"} deck of yours yet.</li>}
            {mine.map(({ deck: d, problem }) => (
              <DeckRow key={d.id} db={db} stored={d} format={rules ?? "casual"} selected={value?.name === d.name} disabled={!!problem} issuesOnly onOpen={() => onChange({ name: d.name, identity: d.identity, cards: d.cards })} />
            ))}
          </ul>
          {onEditDecks && (
            <button class="deck-editor-link" onClick={onEditDecks}>
              <Icon name="deck" />
              <strong>Open the deck editor</strong>
              <Icon name="arrow-right" />
            </button>
          )}
        </>
      )}
      {precons.length > 0 && (
        <>
          <span class="label">Precons</span>
          <ul class="deck-library">
            {precons.map((m) => {
              const p = m[side];
              const name = matchups.filter((o) => o[side].name === p.name).length > 1 ? `${p.name} · ${m.title}` : p.name;
              const wire = toWire({ ...fromPrecon(p, db), name });
              return <DeckRow db={db} stored={wire} format={rules ?? "casual"} selected={value?.name === name} onOpen={() => onChange(wire)} issuesOnly />;
            })}
          </ul>
        </>
      )}
      {onlyPrecons && precons.length === 0 && <p class="hint">No preconstructed deck for this side.</p>}
    </div>
  );
}
