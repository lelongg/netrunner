import { useState } from "preact/hooks";
import type { Card, Deck, DeckEntry } from "../engine";
import { deckSize } from "../decks";
import { CardImage, ZoomableCardImage } from "../game/CardImage";
import { Pager } from "../game/Pager";
import { RichText } from "../game/RichText";
import { useSwipe } from "../game/swipe";
import { useBackClose } from "../back";

const TYPE_ORDER: Record<string, string[]> = {
  Corp: ["Agenda", "Asset", "Upgrade", "Operation", "ICE"],
  Runner: ["Event", "Hardware", "Resource", "Program"],
};

const influenceOf = (identity: Card, card: Card) =>
  card.faction === identity.faction || card.faction?.startsWith("Neutral") ? 0 : Number(card.factioncost ?? 0);

function groups(deck: Deck) {
  const order = TYPE_ORDER[deck.identity.side] ?? [];
  const byType = new Map<string, DeckEntry[]>();
  for (const entry of deck.cards) {
    const list = byType.get(entry.card.type) ?? [];
    list.push(entry);
    byType.set(entry.card.type, list);
  }
  const rank = (t: string) => (order.includes(t) ? order.indexOf(t) : order.length);
  return [...byType.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([type, entries]) => ({
      type,
      count: entries.reduce((n, e) => n + e.qty, 0),
      entries: entries.sort((a, b) => a.card.title.localeCompare(b.card.title)),
    }));
}

interface DetailProps {
  card: Card;
  qty?: number;
  influence: number;
  onClose: () => void;
  index: number;
  count: number;
  slide?: -1 | 1;
  onStep: (dir: -1 | 1) => void;
}

function CardDetail({ card, qty, influence, onClose, index, count, slide, onStep }: DetailProps) {
  const swipe = useSwipe(onStep);
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel swipeable" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={card.title} {...swipe}>
        <Pager index={index} count={count} onStep={onStep} />
        <div key={card.code} class={`sheet-head ${slide ? `slide-${slide < 0 ? "prev" : "next"}` : ""}`}>
          <ZoomableCardImage class="sheet-img" code={card.code} alt={card.title} size="large" />
          <div class="sheet-info">
            <span class="label">
              {card.type}
              {Array.isArray(card.subtypes) && card.subtypes.length ? ` · ${(card.subtypes as string[]).join(" · ")}` : ""}
            </span>
            <h2>{card.title}</h2>
            <span class="label">
              {card.faction}
              {qty ? ` · ×${qty}` : ""}
              {influence ? ` · ${influence} inf` : ""}
            </span>
            {card.text && <RichText class="card-text" text={card.text} />}
          </div>
        </div>
        <button class="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function DeckViewer({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [detail, setDetail] = useState<DeckEntry | { qty?: number; card: Card } | null>(null);
  const { identity } = deck;
  const size = deckSize(deck);
  const minimum = Number(identity.minimumdecksize ?? 0);
  const limit = identity.influencelimit as number | undefined;
  const influence = deck.cards.reduce((n, e) => n + influenceOf(identity, e.card) * e.qty, 0);
  const points = deck.cards.reduce((n, e) => n + Number(e.card.agendapoints ?? 0) * e.qty, 0);
  const sections = groups(deck);
  const ordered: { qty?: number; card: Card }[] = [{ card: identity }, ...sections.flatMap((s) => s.entries)];
  const position = detail ? ordered.findIndex((e) => e.card.code === detail.card.code) : -1;
  const [slide, setSlide] = useState<-1 | 1>();
  useBackClose(!!detail, () => {
    setDetail(null);
    setSlide(undefined);
  });
  const step = (dir: -1 | 1) => {
    const next = ordered[position + dir];
    if (!next) return;
    setSlide(dir);
    setDetail(next);
  };

  return (
    <>
      <div class="sheet-backdrop deck-viewer" onClick={onClose}>
        <div class="sheet panel deck-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Deck ${deck.name}`}>
          <div class="row">
            <span class="label">Deck list</span>
            <button class="ghost" onClick={onClose} aria-label="Close deck list">
              ✕
            </button>
          </div>
          <button class="deck-head" onClick={() => setDetail({ card: identity })}>
            <CardImage class="deck-head-img" code={identity.code} alt={identity.title} size="small" />
            <span class="deck-head-info">
              <strong>{deck.name}</strong>
              <span class={`label who-${identity.side.toLowerCase()}`}>{identity.title}</span>
              <span class="label">{identity.faction}</span>
            </span>
          </button>
          <div class="deck-stats">
            <div>
              <span class={`big ${minimum && size < minimum ? "" : "yellow"}`}>{size}</span>
              <span class="label">cards{minimum ? ` / ${minimum} min` : ""}</span>
            </div>
            {limit != null && (
              <div>
                <span class={`big ${influence > limit ? "" : "yellow"}`}>{influence}</span>
                <span class="label">inf / {limit}</span>
              </div>
            )}
            {identity.side === "Corp" && (
              <div>
                <span class="big yellow">{points}</span>
                <span class="label">agenda pts</span>
              </div>
            )}
          </div>
          {minimum > 0 && size < minimum && <p class="error">Below the minimum deck size.</p>}
          {limit != null && influence > limit && <p class="error">Over the influence limit.</p>}
          <div class="tabs">
            <button class={mode === "list" ? "on" : ""} onClick={() => setMode("list")}>
              List
            </button>
            <button class={mode === "grid" ? "on" : ""} onClick={() => setMode("grid")}>
              Cards
            </button>
          </div>
          <div class="deck-body">
            {sections.map((section) => (
              <section class="deck-section">
                <div class="row">
                  <span class="label">{section.type}</span>
                  <span class="label">{section.count}</span>
                </div>
                {mode === "list" ? (
                  <ul class="deck-rows">
                    {section.entries.map((entry) => {
                      const inf = influenceOf(identity, entry.card);
                      return (
                        <li>
                          <button onClick={() => setDetail(entry)}>
                            <span class="qty">{entry.qty}×</span>
                            <span class="title">{entry.card.title}</span>
                            {inf > 0 && <span class="inf" aria-label={`${inf} influence`}>{"●".repeat(Math.min(inf, 5))}</span>}
                            {entry.card.type === "Agenda" ? (
                              <span class="cost" aria-label={`advance ${entry.card.advancementcost}, ${entry.card.agendapoints} points`}>
                                {String(entry.card.advancementcost)}/{String(entry.card.agendapoints)}
                              </span>
                            ) : (
                              entry.card.cost != null && <span class="cost">{entry.card.cost}¢</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div class="deck-grid">
                    {section.entries.map((entry) => (
                      <button class="deck-grid-card" onClick={() => setDetail(entry)} aria-label={`${entry.qty} × ${entry.card.title}`}>
                        <CardImage code={entry.card.code} alt={entry.card.title} size="small" width="25vw" lazy />
                        <span class="badge">×{entry.qty}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
      {detail && (
        <CardDetail
          card={detail.card}
          qty={detail.qty}
          influence={influenceOf(identity, detail.card)}
          index={Math.max(0, position)}
          count={ordered.length}
          slide={slide}
          onStep={step}
          onClose={() => {
            setDetail(null);
            setSlide(undefined);
          }}
        />
      )}
    </>
  );
}
