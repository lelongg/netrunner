import { useMemo, useState } from "preact/hooks";
import { useBackClose } from "../back";
import { createPortal } from "preact/compat";
import type { Card, CardDb } from "../engine";
import { cardImage } from "../engine";
import { Cta, Ticker } from "../ui";
import { Icon, type IconName } from "../icons";
import { lastDeck, saveId } from "../session";
import { savedDecks } from "../decks";
import { GameList, JoinCode, type Props, describe, startGame } from "./Home";

type Mode = "online" | "solo" | "local";

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "online", label: "Online", hint: "Find an opponent" },
  { key: "solo", label: "Solo", hint: "Against the bot" },
  { key: "local", label: "Local", hint: "Pass and play" },
];

const factionKey = (f?: string) => (f ?? "neutral").toLowerCase().replace(/[^a-z]+/g, "-");

function playerName() {
  try {
    return localStorage.getItem("nsg.name")?.trim() || "Player";
  } catch {
    return "Player";
  }
}

function featured(db: CardDb | undefined): { deck?: string; card?: Card } {
  if (!db) return {};
  const wire = lastDeck("runner") ?? lastDeck("corp") ?? savedDecks()[0];
  const own = wire && db.byTitle.get(wire.identity);
  if (own) return { deck: wire!.name, card: own };
  const ids = db.all.filter((c) => c.type === "Identity" && c.code >= "30000");
  const day = Math.floor(Date.now() / 86_400_000);
  return { card: ids[day % Math.max(1, ids.length)] };
}

function Art({ card, class: cls }: { card?: Card; class?: string }) {
  const src = cardImage(card?.code, "large");
  return <span class={`art ${cls ?? ""}`} style={src ? { backgroundImage: `url(${src})` } : undefined} aria-hidden="true" />;
}

function TabBar({ active, onDecks, onHistory, onGuide, ready }: { active: "play"; onDecks: () => void; onHistory: () => void; onGuide: () => void; ready: boolean }) {
  const tabs: { key: string; icon: IconName; label: string; onClick?: () => void }[] = [
    { key: "play", icon: "play", label: "Play" },
    { key: "decks", icon: "deck", label: "Decks", onClick: onDecks },
    { key: "history", icon: "history", label: "History", onClick: onHistory },
    { key: "learn", icon: "book", label: "Learn", onClick: onGuide },
  ];
  return (
    <nav class="tabbar">
      {tabs.map((t) => (
        <button class={t.key === active ? "on" : ""} disabled={!ready && t.key !== active} onClick={t.onClick} aria-current={t.key === active ? "page" : undefined}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Continue({ props }: { props: Props }) {
  const { saves, ready, onResume, onHistory, onDiscard } = props;
  const [all, setAll] = useState(false);
  useBackClose(all, () => setAll(false));
  const open = saves.filter((s) => !s.summary?.winner);
  const save = open.find((s) => describe(s).status === "Your move") ?? open[0];
  if (!save) return null;
  const { title, detail, status } = describe(save);
  return (
    <div class={`continue ${status === "Your move" ? "hot" : ""}`}>
      <button class="continue-go" disabled={!ready} onClick={() => onResume(save)}>
        <span class="continue-tag">{status === "Your move" ? "Your move" : "Continue"}</span>
        <span class="continue-main">
          <strong>{title}</strong>
          <span>{detail}</span>
        </span>
        <Icon name="arrow-right" />
      </button>
      {saves.length > 1 && (
        <button class="continue-more" onClick={() => setAll(true)} aria-label="All your games">
          +{saves.length - 1}
        </button>
      )}
      {all &&
        createPortal(
          <div class="sheet-backdrop" onClick={() => setAll(false)}>
            <div class="sheet panel cyan games-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your games">
              <div class="row">
                <span class="label cyan">Your games</span>
                <button class="ghost" onClick={() => setAll(false)} aria-label="Close">
                  <Icon name="close" />
                </button>
              </div>
              <GameList
                saves={saves}
                ready={ready}
                onResume={(s) => {
                  setAll(false);
                  onResume(s);
                }}
                onDiscard={onDiscard}
                onHistory={(id) => {
                  setAll(false);
                  onHistory(id);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function HomeArena(props: Props) {
  const { ready, error, initialJoin, db, onFind, seeking, onCredits, onDecks, onHistory, onGuide } = props;
  const go = startGame(props.onStart);
  const [mode, setMode] = useState<Mode>("online");
  const [joining, setJoining] = useState(!!initialJoin);
  const hero = useMemo(() => featured(db), [db]);
  const play = () => (mode === "online" ? onFind() : go("local", undefined, mode === "solo"));
  const searching = mode === "online" && seeking;
  const label = searching ? "Searching…" : mode === "online" ? "Play online" : mode === "solo" ? "Play vs bot" : "Play local";
  return (
    <>
      <Ticker>
        Engine <span class={ready ? "cyan" : "yellow"}>{ready ? "ready" : error ? "offline" : "loading"}</span>
      </Ticker>
      <div class={`screen arena faction-${factionKey(hero.card?.faction)}`}>
        <Art card={hero.card} class="arena-bg" />
        <div class="arena-shade" aria-hidden="true" />
        <header class="arena-top">
          <span class="player-chip">
            <Art card={hero.card} class="player-avatar" />
            <span class="player-text">
              <small class="label">{hero.card?.side === "Corp" ? "Corp ID" : "Runner ID"}</small>
              <strong>{playerName()}</strong>
            </span>
          </span>
          <button class="arena-link" onClick={onCredits}>
            Credits
          </button>
        </header>
        {error && <p class="error">{error}</p>}
        <Continue props={props} />
        <button class="deck-showcase" disabled={!ready} onClick={onDecks}>
          <span class="deck-frame">
            <span class="deck-card">
              {hero.card && <img src={cardImage(hero.card.code, "large")} alt={hero.card.title} />}
              <i class="deck-card-shine" />
            </span>
          </span>
          <span class="deck-caption">
            <strong>{hero.deck ?? hero.card?.title ?? "Build a deck"}</strong>
            <span class="deck-change">
              <Icon name="deck" /> {hero.deck ? "Change deck" : "Build a deck"}
            </span>
          </span>
        </button>
        <div class="arena-bottom">
          <div class="match-sides arena-modes" role="radiogroup" aria-label="Mode">
            {MODES.map((m) => (
              <button role="radio" aria-checked={mode === m.key} class={`mode-${m.key} ${mode === m.key ? "on" : ""}`} onClick={() => setMode(m.key)}>
                {m.label}
                {m.key === "online" && seeking && <i class="mode-dot" />}
              </button>
            ))}
          </div>
          <div class={`arena-play ${searching ? "seeking" : ""}`}>
            <Cta onClick={play} disabled={!ready}>
              {label}
            </Cta>
          </div>
          {joining ? (
            <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
          ) : (
            <button class="arena-link center" onClick={() => setJoining(true)}>
              Have a game code?
            </button>
          )}
        </div>
        <TabBar active="play" ready={ready} onDecks={onDecks} onHistory={() => onHistory()} onGuide={onGuide} />
      </div>
    </>
  );
}
