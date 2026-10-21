import { useMemo, useState } from "preact/hooks";
import type { Card, CardDb, Side } from "../engine";
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

function pick(db: CardDb | undefined, side: Card["side"], salt: number): Card | undefined {
  if (!db) return undefined;
  const pool = db.all.filter((c) => c.side === side && c.code >= "30000" && c.type !== "Identity" && c.type !== "ICE");
  return pool[(Math.floor(Date.now() / 86_400_000) * 7 + salt) % Math.max(1, pool.length)];
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
  const { saves, ready, onResume, onHistory } = props;
  const open = saves.filter((s) => !s.summary?.winner);
  const save = open.find((s) => describe(s).status === "Your move") ?? open[0];
  if (!save) return null;
  const { title, detail, status } = describe(save);
  return (
    <button class={`continue ${status === "Your move" ? "hot" : ""}`} disabled={!ready} onClick={() => (save.summary?.winner ? onHistory(saveId(save)) : onResume(save))}>
      <span class="continue-tag">{status === "Your move" ? "Your move" : "Continue"}</span>
      <span class="continue-main">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      {open.length > 1 && <span class="continue-more">+{open.length - 1}</span>}
      <Icon name="arrow-right" />
    </button>
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
              <i class="deck-scan" />
            </span>
          </span>
          <span class="deck-caption">
            <span class="label">{hero.deck ? "Your deck" : "Featured identity"}</span>
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

function ModeTile({ card, title, hint, tone, onClick, disabled, badge, big }: { card?: Card; title: string; hint: string; tone: string; onClick: () => void; disabled?: boolean; badge?: string; big?: boolean }) {
  return (
    <button class={`mode-tile tone-${tone} ${big ? "big" : ""}`} disabled={disabled} onClick={onClick}>
      <Art card={card} class="mode-art" />
      <span class="mode-shade" aria-hidden="true" />
      {badge && <span class="mode-badge">{badge}</span>}
      <span class="mode-text">
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
    </button>
  );
}

export function HomeModes(props: Props) {
  const { ready, error, initialJoin, db, saves, onFind, seeking, onGuide, onCredits, onDecks, onHistory, onResume, onDiscard } = props;
  const go = startGame(props.onStart);
  const hero = useMemo(() => featured(db), [db]);
  const art = useMemo(() => ({ online: pick(db, "Runner", 1), solo: pick(db, "Corp", 2), local: pick(db, "Runner", 3), decks: hero.card }), [db, hero]);
  const side: Side = hero.card?.side === "Corp" ? "corp" : "runner";
  return (
    <>
      <Ticker>
        Engine <span class={ready ? "cyan" : "yellow"}>{ready ? "ready" : error ? "offline" : "loading"}</span>
      </Ticker>
      <div class="screen modes">
        <header class="modes-top">
          <span class="player-chip">
            <Art card={hero.card} class="player-avatar" />
            <span class="player-text">
              <strong>{playerName()}</strong>
              <small class={`who-${side}`}>{hero.card?.faction ?? "Pocket Rig"}</small>
            </span>
          </span>
          <button class="arena-link" onClick={onCredits}>
            Credits
          </button>
        </header>
        {error && <p class="error">{error}</p>}
        <Continue props={props} />
        <ModeTile big card={art.online} title={seeking ? "Searching…" : "Play online"} hint={seeking ? "Tap to see your search" : "Matchmaking or invite a friend"} tone="yellow" badge={seeking ? "Live" : undefined} onClick={onFind} disabled={!ready} />
        <div class="mode-row">
          <ModeTile card={art.solo} title="Solo" hint="vs the bot" tone="cyan" onClick={() => go("local", undefined, true)} disabled={!ready} />
          <ModeTile card={art.local} title="Local" hint="pass and play" tone="red" onClick={() => go("local")} disabled={!ready} />
        </div>
        <ModeTile card={art.decks} title="Your decks" hint={hero.deck ?? "Build, import, tune"} tone="green" onClick={onDecks} disabled={!ready} />
        <section class="modes-join">
          <span class="label">Join with a code</span>
          <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
        </section>
        {saves.length > 1 && (
          <section class="modes-games">
            <span class="label">All your games</span>
            <GameList saves={saves} ready={ready} onResume={onResume} onDiscard={onDiscard} onHistory={onHistory} />
          </section>
        )}
        <TabBar active="play" ready={ready} onDecks={onDecks} onHistory={() => onHistory()} onGuide={onGuide} />
      </div>
    </>
  );
}
