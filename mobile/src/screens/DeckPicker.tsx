import { useMemo, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { CardImage } from "../game/CardImage";
import { useBackClose } from "../back";
import { DeckRow, DeckView } from "./Decks";
import { type WireDeck, defaultStored, deckSize, fromPrecon, fromWire, putDeck, savedDecks, toWire } from "../decks";
import { DeckBrowser } from "./DeckBrowser";
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

export function problemIn(format: GameFormat, db: CardDb, w: WireDeck): string | null {
  const rules = deckFormat(format);
  if (!rules || rules === "casual") return null;
  try {
    const a = analyze(fromWire(w, db), rules);
    return a.legal ? null : (a.problems.find((p) => p.level === "error")?.text ?? `Not legal in ${FORMATS.find((f) => f.key === rules)?.label}`);
  } catch {
    return "Unknown cards";
  }
}

function preconChoices(side: Side, db: CardDb, matchups: Matchup[], format: GameFormat): WireDeck[] {
  return matchups.flatMap((m) => {
    const p = m[side];
    const name = matchups.filter((o) => o[side].name === p.name).length > 1 ? `${p.name} · ${m.title}` : p.name;
    const wire = toWire({ ...fromPrecon(p, db), name });
    return format === "preconstructed" || !problemIn(format, db, wire) ? [wire] : [];
  });
}

export function defaultDeck(side: Side, db: CardDb, matchups: Matchup[], format: GameFormat): WireDeck | undefined {
  if (format !== "preconstructed") {
    const pinned = defaultStored(side);
    const own = (pinned && !problemIn(format, db, pinned) ? pinned : undefined) ?? savedDecks().find((d) => d.side === side && !problemIn(format, db, d));
    if (own) return { name: own.name, identity: own.identity, cards: own.cards, ref: own.id };
  }
  return preconChoices(side, db, matchups, format)[0];
}

export function DeckPicker({ side, db, matchups, value, onChange, onEditDecks, showCurrent = true, format = "casual" }: Props) {
  const rules = deckFormat(format);
  const problemOf = (w: WireDeck) => problemIn(format, db, w);
  const [viewing, setViewing] = useState(false);
  const mine = useMemo(
    () =>
      savedDecks()
        .filter((d) => d.side === side)
        .map((d) => ({ deck: d, problem: problemOf(d) }))
        .sort((a, b) => Number(!!a.problem) - Number(!!b.problem)),
    [value, format, side],
  );
  const precons = useMemo(() => preconChoices(side, db, matchups, format), [matchups, side, format]);
  const [browsing, setBrowsing] = useState(false);
  const current = useMemo(() => (value ? fromWire(value, db) : undefined), [value]);
  useBackClose(viewing, () => setViewing(false));
  useBackClose(browsing, () => setBrowsing(false));
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
      {mine.length > 0 && (
        <>
          <span class="label">Your decks</span>
          <ul class="deck-library">
            {mine.map(({ deck: d, problem }) => (
              <DeckRow key={d.id} db={db} stored={d} format={rules ?? "casual"} selected={value?.name === d.name} disabled={!!problem} issuesOnly onOpen={() => onChange({ name: d.name, identity: d.identity, cards: d.cards, ref: d.id })} />
            ))}
          </ul>
        </>
      )}
      {precons.length > 0 && (
        <>
          <span class="label">{mine.length || onlyPrecons ? "Precons" : "Ready to play"}</span>
          <ul class="deck-library">
            {precons.map((wire) => (
              <DeckRow db={db} stored={wire} format={rules ?? "casual"} selected={value?.name === wire.name} onOpen={() => onChange(wire)} issuesOnly />
            ))}
          </ul>
        </>
      )}
      {!onlyPrecons && rules && mine.length === 0 && precons.length === 0 && <p class="hint">No {side === "corp" ? "Corp" : "Runner"} deck of yours yet. Grab a published one to play right away:</p>}
      {!onlyPrecons && rules && (
        <button class="deck-editor-link" onClick={() => setBrowsing(true)}>
          <Icon name="search" />
          <strong>NetrunnerDB decklists</strong>
          <Icon name="arrow-right" />
        </button>
      )}
      {!onlyPrecons && onEditDecks && (
        <button class="deck-editor-link" onClick={onEditDecks}>
          <Icon name="deck" />
          <strong>{mine.length ? "Open the deck editor" : "Build your own deck"}</strong>
          <Icon name="arrow-right" />
        </button>
      )}
      {browsing && rules && (
        <div class="sheet-backdrop" onClick={() => setBrowsing(false)}>
          <div class="sheet panel deck-choose" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="NetrunnerDB decklists">
            <div class="row">
              <span class={`label who-${side}`}>NetrunnerDB · {FORMATS.find((f) => f.key === rules)?.label}</span>
              <button class="ghost" onClick={() => setBrowsing(false)} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <DeckBrowser
              side={side}
              db={db}
              format={rules}
              onPick={(l) => {
                if (!l.deck) return;
                const stored = putDeck({ ...toWire(l.deck), side, format: rules });
                setBrowsing(false);
                onChange({ name: stored.name, identity: stored.identity, cards: stored.cards, ref: stored.id });
              }}
            />
          </div>
        </div>
      )}
      {onlyPrecons && precons.length === 0 && <p class="hint">No preconstructed deck for this side.</p>}
    </div>
  );
}
