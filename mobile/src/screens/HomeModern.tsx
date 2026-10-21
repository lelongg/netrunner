import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { openSeeks } from "../net/match";
import { fetchDecklists } from "../nrdb";
import { listHistory } from "../history";
import { relayUrl } from "../net/relay";
import { useBackClose } from "../back";
import { createPortal } from "preact/compat";
import type { Card, CardDb, Side } from "../engine";
import { cardImage } from "../engine";
import { Cta, Ticker } from "../ui";
import { Icon, type IconName } from "../icons";
import { lastDeck, saveId } from "../session";
import { savedDecks } from "../decks";
import { QrScan } from "./QrScan";
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

function featured(db: CardDb | undefined, side: Side): { deck?: string; id?: string; card?: Card } {
  if (!db) return {};
  const wire = lastDeck(side) ?? savedDecks().find((d) => d.side === side);
  const own = wire && db.byTitle.get(wire.identity);
  const stored = wire && savedDecks().find((d) => (wire.ref ? d.id === wire.ref : d.side === side && d.name === wire.name));
  if (own) return { deck: wire!.name, id: stored?.id, card: own };
  const ids = db.all.filter((c) => c.type === "Identity" && c.side === (side === "corp" ? "Corp" : "Runner") && c.code >= "30000");
  const day = Math.floor(Date.now() / 86_400_000);
  return { card: ids[day % Math.max(1, ids.length)] };
}

const SIDE_KEY = "nsg.homeSide";

function storedSide(): Side {
  try {
    return localStorage.getItem(SIDE_KEY) === "corp" ? "corp" : "runner";
  } catch {
    return "runner";
  }
}

function Art({ card, class: cls, sharp }: { card?: Card; class?: string; sharp?: boolean }) {
  const large = cardImage(card?.code, "large");
  const style = large ? { backgroundImage: sharp ? `url(${cardImage(card!.code, "xlarge")}), url(${large})` : `url(${large})` } : undefined;
  return <span class={`art ${cls ?? ""}`} style={style} aria-hidden="true" />;
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

const TIPS = ["Hold a card to see it full size", "Hold the ticker to peek at the game log", "Tap an icon for what it means", "Swipe a game in your list to delete it", "Share a game code to play with a friend"];

function useFeed(props: Props, hero: { deck?: string; card?: Card }) {
  const { ready, error, saves, seeking, db } = props;
  const [open, setOpen] = useState<number | null>(null);
  const [lists, setLists] = useState<string[]>([]);
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    if (!relayUrl()) return;
    const poll = () =>
      openSeeks().then(
        (o) => setOpen(o.length),
        () => {},
      );
    poll();
    const timer = setInterval(poll, 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!db) return;
    fetchDecklists(db, Math.random() < 0.5 ? "corp" : "runner", null, 1, "standard")
      .then((r) =>
        setLists(
          r.items
            .filter((l) => l.deck)
            .slice(0, 2)
            .map((l) => `New on NetrunnerDB: ${l.name} by ${l.user}`),
        ),
      )
      .catch(() => {});
  }, [db]);
  useEffect(() => {
    listHistory()
      .then((games) => {
        const g = games.sort((a, b) => b.endedAt - a.endedAt)[0];
        const sum = g?.save.summary;
        if (!sum?.winner) return;
        const who = sum.opponent ?? (g.save.v === 1 && g.save.vsBot ? "the bot" : "your opponent");
        setLast(`Last game: ${sum.winner === sum.side ? "won" : "lost"} vs ${who}${sum.points ? ` ${sum.points[0]}–${sum.points[1]}` : ""}`);
      })
      .catch(() => {});
  }, []);
  const items: { text: string; tone?: string }[] = [];
  if (!ready) items.push({ text: error ? "Engine offline" : "Engine loading", tone: "yellow" });
  const mine = saves.filter((s) => !s.summary?.winner && describe(s).status === "Your move").length;
  if (mine) items.push({ text: `Your move in ${mine} game${mine > 1 ? "s" : ""}`, tone: "yellow" });
  if (seeking) items.push({ text: "Searching for an opponent", tone: "cyan" });
  if (open) items.push({ text: `${open} player${open > 1 ? "s" : ""} waiting for a game online`, tone: "cyan" });
  if (open === 0 && !seeking) items.push({ text: "Nobody is searching right now · be the first" });
  if (last) items.push({ text: last });
  for (const l of lists) items.push({ text: l });
  if (hero.card && !hero.deck) items.push({ text: `Identity of the day: ${hero.card.title}`, tone: "red" });
  const day = Math.floor(Date.now() / 86_400_000);
  items.push({ text: `Tip: ${TIPS[day % TIPS.length]}` });
  return items;
}

export function HomeArena(props: Props) {
  const { ready, error, initialJoin, db, onFind, seeking, onDecks, onHistory, onGuide } = props;
  const go = startGame(props.onStart);
  const [mode, setMode] = useState<Mode>("online");
  const [joining, setJoining] = useState(!!initialJoin);
  useBackClose(joining, () => setJoining(false));
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    if (!joining) setScanning(false);
  }, [joining]);
  const [side, setSideState] = useState<Side>(storedSide);
  const [slide, setSlide] = useState<"left" | "right" | null>(null);
  const setSide = (next: Side, from?: "left" | "right") => {
    if (next === side) return;
    setSlide(from ?? (next === "corp" ? "right" : "left"));
    setSideState(next);
    try {
      localStorage.setItem(SIDE_KEY, next);
    } catch {}
  };
  const swipe = useRef<{ x: number; y: number; done: boolean; drag: boolean } | null>(null);
  const slideEl = useRef<HTMLSpanElement>(null);
  const captionEl = useRef<HTMLSpanElement>(null);
  const drag = (dx: number, settle: boolean, clear = false) => {
    for (const [el, k] of [
      [slideEl.current, 1],
      [captionEl.current, 0.35],
    ] as const) {
      if (!el) continue;
      if (clear) {
        el.style.transition = el.style.transform = el.style.opacity = "";
        continue;
      }
      el.style.transition = settle ? "transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.3s" : "none";
      el.style.transform = dx ? `translateX(${dx * k}px) rotate(${dx * 0.05 * k}deg)` : "";
      el.style.opacity = dx ? String(1 - Math.min(Math.abs(dx) / 320, 0.6)) : "";
    }
  };
  const hero = useMemo(() => featured(db, side), [db, side]);
  const feed = useFeed(props, hero);
  const play = () => (mode === "online" ? onFind() : go("local", undefined, mode === "solo"));
  const searching = mode === "online" && seeking;
  const label = searching ? "Searching…" : mode === "online" ? "Play online" : mode === "solo" ? "Play vs bot" : "Play local";
  return (
    <>
      <Ticker feedKey={feed.length}>
        {feed.map((f, i) => (
          <>
            {i > 0 && <span class="feed-sep"> // </span>}
            <span class={f.tone ?? ""}>{f.text}</span>
          </>
        ))}
      </Ticker>
      <div
        class={`screen arena side-${side} faction-${factionKey(hero.card?.faction)}`}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY, done: false, drag: false })}
        onPointerMove={(e) => {
          const g = swipe.current;
          if (!g) return;
          const dx = e.clientX - g.x;
          if (!g.drag && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(e.clientY - g.y) * 1.5) g.drag = true;
          if (!g.drag) return;
          drag(dx, false);
        }}
        onPointerUp={(e) => {
          const g = swipe.current;
          if (!g?.drag) return;
          const dx = e.clientX - g.x;
          g.done = true;
          if (Math.abs(dx) > 70) {
            drag(0, false, true);
            setSide(side === "runner" ? "corp" : "runner", dx < 0 ? "right" : "left");
          } else drag(0, true);
        }}
        onPointerCancel={() => {
          if (swipe.current?.drag) drag(0, true);
          swipe.current = null;
        }}
        onClickCapture={(e) => {
          if (swipe.current?.done) {
            e.stopPropagation();
            e.preventDefault();
            swipe.current = null;
          }
        }}
      >
        <Art card={hero.card} class="arena-bg" sharp />
        <div class="arena-shade" aria-hidden="true" />
        <header class="arena-top">
          <span class="player-chip">
            <Art card={hero.card} class="player-avatar" />
            <span class="player-text">
              <small class="label">{hero.card?.side === "Corp" ? "Corp ID" : "Runner ID"}</small>
              <strong>{playerName()}</strong>
            </span>
          </span>
        </header>
        {error && <p class="error">{error}</p>}
        <Continue props={props} />
        <div class="deck-showcase">
          <button class="deck-open" disabled={!ready} onClick={() => onDecks(hero.id, side)} aria-label={hero.id ? `Edit ${hero.deck}` : "Open your decks"}>
            <span ref={slideEl} key={side} class={`deck-slide ${slide ? `slide-${slide}` : ""}`}>
              <span class="deck-frame">
                <span class="deck-card">
                  {hero.card && (
                    <img
                      src={cardImage(hero.card.code, "xlarge")}
                      alt={hero.card.title}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        const fallback = cardImage(hero.card!.code, "large")!;
                        if (!img.src.endsWith(fallback)) img.src = fallback;
                      }}
                    />
                  )}
                  <i class="deck-card-shine" />
                </span>
              </span>
            </span>
          </button>
          <span ref={captionEl} key={`c-${side}`} class={`deck-caption ${slide ? "fade-in" : ""}`}>
            <strong>{hero.deck ?? hero.card?.title ?? "Build a deck"}</strong>
            <button class="deck-change" disabled={!ready} onClick={() => onDecks(undefined, side)}>
              <Icon name="deck" /> {hero.deck ? "Change deck" : "Build a deck"}
            </button>
          </span>
        </div>
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
            <Cta onClick={play} disabled={!ready} tone={searching ? "cyan" : undefined}>
              {label}
            </Cta>
          </div>
          <button class="arena-link center" onClick={() => setJoining(true)}>
            Have a game code?
          </button>
        </div>
        {joining &&
          createPortal(
            <div class="sheet-backdrop" onClick={() => setJoining(false)}>
              <div class="sheet panel join-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Join a game">
                <div class="row">
                  <span class="label">Join a game</span>
                  <button class="ghost" onClick={() => setJoining(false)} aria-label="Close">
                    <Icon name="close" />
                  </button>
                </div>
                {scanning ? (
                  <QrScan
                    onCode={(c) => {
                      setScanning(false);
                      setJoining(false);
                      go("guest", c);
                    }}
                  />
                ) : (
                  <p class="hint">Enter the five-character code your friend shared, or scan their QR code.</p>
                )}
                <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
                {!scanning && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && (
                  <button class="qr-start" onClick={() => setScanning(true)}>
                    <Icon name="eye" /> Scan a QR code
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )}
        <TabBar active="play" ready={ready} onDecks={onDecks} onHistory={() => onHistory()} onGuide={onGuide} />
      </div>
    </>
  );
}
