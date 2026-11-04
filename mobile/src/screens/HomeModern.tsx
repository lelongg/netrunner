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
import { defaultStored, savedDecks } from "../decks";
import { motionOff } from "../settings";
import { useTilt } from "../tilt";
import { FactionLogo, factionLogoKey } from "../FactionLogo";
import { useCardPeek } from "../game/CardImage";
import CursorGrid from "../game/CursorGrid";
import { QrScan } from "./QrScan";
import { GameList, JoinCode, type Props, describe, startGame } from "./Home";
import { t } from "../i18n";

type Mode = "online" | "solo" | "local";

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "online", label: "Online", hint: "Find an opponent" },
  { key: "solo", label: "Solo", hint: "Against the bot" },
  { key: "local", label: "Local", hint: "Pass and play" },
];

const FACTION_TINT: Record<string, string> = {
  "haas-bioroid": "#a77bf3",
  jinteki: "#ff4f7e",
  nbn: "#f5bf4a",
  "weyland-consortium": "#5fbf7a",
  anarch: "#ff7a35",
  criminal: "#4f9bff",
  shaper: "#7fdc5c",
};

const factionKey = (f?: string) => (f ?? "neutral").toLowerCase().replace(/[^a-z]+/g, "-");

function playerName() {
  try {
    return localStorage.getItem("nsg.name")?.trim() || t("Player");
  } catch {
    return t("Player");
  }
}

function featured(db: CardDb | undefined, side: Side): { deck?: string; id?: string; card?: Card; identity?: Card } {
  if (!db) return {};
  const pinned = defaultStored(side);
  const wire = pinned ? { ...pinned, ref: pinned.id } : (lastDeck(side) ?? savedDecks().find((d) => d.side === side));
  const own = wire && db.byTitle.get(wire.identity);
  const stored = wire && savedDecks().find((d) => (wire.ref ? d.id === wire.ref : d.side === side && d.name === wire.name));
  if (own) return { deck: wire!.name, id: stored?.id, card: (stored?.cover && db.byCode.get(stored.cover)) || own, identity: own };
  const ids = db.all.filter((c) => c.type === "Identity" && c.side === (side === "corp" ? "Corp" : "Runner") && c.code >= "30000");
  const day = Math.floor(Date.now() / 86_400_000);
  const id = ids[day % Math.max(1, ids.length)];
  return { card: id, identity: id };
}

const SIDE_KEY = "nsg.homeSide";

function storedSide(): Side {
  try {
    return localStorage.getItem(SIDE_KEY) === "corp" ? "corp" : "runner";
  } catch {
    return "runner";
  }
}

const MODE_KEY = "nsg.homeMode";

function storedMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === "solo" || m === "local" ? m : "online";
  } catch {
    return "online";
  }
}

function Art({ card, class: cls, sharp }: { card?: Card; class?: string; sharp?: boolean }) {
  const large = cardImage(card?.code, "large");
  const style = large ? { backgroundImage: sharp ? `url(${cardImage(card!.code, "xlarge")}), url(${large})` : `url(${large})` } : undefined;
  return <span class={`art ${cls ?? ""}`} style={style} aria-hidden="true" />;
}

export type Tab = "play" | "decks" | "history" | "learn";

export function TabBar({ active, onTab, ready, global }: { active: Tab; onTab: (t: Tab) => void; ready: boolean; global?: boolean }) {
  const tabs: { key: Tab; icon: IconName; label: string }[] = [
    { key: "play", icon: "play", label: "Play" },
    { key: "decks", icon: "deck", label: "Decks" },
    { key: "history", icon: "history", label: "History" },
    { key: "learn", icon: "book", label: "Learn" },
  ];
  return (
    <nav class={`tabbar ${global ? "global" : ""}`}>
      {tabs.map((tab) => (
        <button class={tab.key === active ? "on" : ""} disabled={!ready && tab.key !== active} onClick={() => tab.key !== active && onTab(tab.key)} aria-current={tab.key === active ? "page" : undefined}>
          <Icon name={tab.icon} />
          <span>{t(tab.label)}</span>
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
        <span class="continue-tag">{status === "Your move" ? t("Your move") : t("Continue")}</span>
        <span class="continue-main">
          <strong>{title}</strong>
          <span>{detail}</span>
        </span>
        <Icon name="arrow-right" />
      </button>
      {saves.length > 1 && (
        <button class="continue-more" onClick={() => setAll(true)} aria-label={t("All your games")}>
          +{saves.length - 1}
        </button>
      )}
      {all &&
        createPortal(
          <div class="sheet-backdrop" onClick={() => setAll(false)}>
            <div class="sheet panel cyan games-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("Your games")}>
              <div class="row">
                <span class="label cyan">{t("Your games")}</span>
                <button class="ghost" onClick={() => setAll(false)} aria-label={t("Close")}>
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
  const [lists, setLists] = useState<{ name: string; user: string }[]>([]);
  const [last, setLast] = useState<{ won: boolean; who?: string; bot: boolean; score: string } | null>(null);
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
            .map((l) => ({ name: l.name, user: l.user })),
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
        setLast({ won: sum.winner === sum.side, who: sum.opponent, bot: g.save.v === 1 && !!g.save.vsBot, score: sum.points ? ` ${sum.points[0]}–${sum.points[1]}` : "" });
      })
      .catch(() => {});
  }, []);
  const items: { text: string; tone?: string }[] = [];
  if (!ready) items.push({ text: error ? t("Engine offline") : t("Engine loading"), tone: "yellow" });
  const mine = saves.filter((s) => !s.summary?.winner && describe(s).status === "Your move").length;
  if (mine) items.push({ text: mine > 1 ? t("Your move in {n} games", { n: mine }) : t("Your move in 1 game"), tone: "yellow" });
  if (seeking) items.push({ text: t("Waiting for an opponent"), tone: "cyan" });
  if (open) items.push({ text: open > 1 ? t("{n} players waiting for a game online", { n: open }) : t("1 player waiting for a game online"), tone: "cyan" });
  if (open === 0 && !seeking) items.push({ text: t("Nobody is searching right now · be the first") });
  if (last) {
    const who = last.who ?? (last.bot ? t("the bot") : t("your opponent"));
    items.push({ text: (last.won ? t("Last game: won vs {who}", { who }) : t("Last game: lost vs {who}", { who })) + last.score });
  }
  for (const l of lists) items.push({ text: t("New on NetrunnerDB: {name} by {user}", { name: l.name, user: l.user }) });
  if (hero.card && !hero.deck) items.push({ text: t("Identity of the day: {title}", { title: hero.card.title }), tone: "red" });
  const day = Math.floor(Date.now() / 86_400_000);
  items.push({ text: t("Tip: {tip}", { tip: t(TIPS[day % TIPS.length]) }) });
  return items;
}

export function HomeArena(props: Props) {
  const { ready, error, initialJoin, db, onFind, seeking, onDecks, onHistory, onGuide } = props;
  const go = startGame(props.onStart);
  const [mode, setModeState] = useState<Mode>(storedMode);
  const setMode = (next: Mode) => {
    setModeState(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
  };
  const [joining, setJoining] = useState(!!initialJoin);
  useBackClose(joining, () => setJoining(false));
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    if (!joining) setScanning(false);
  }, [joining]);
  const [side, setSideState] = useState<Side>(storedSide);
  const [slide, setSlide] = useState<"left" | "right" | null>(null);
  const [prev, setPrev] = useState<Card | undefined>();
  useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(undefined), 900);
    return () => clearTimeout(t);
  }, [prev]);
  const setSide = (next: Side, from?: "left" | "right") => {
    if (next === side) return;
    setPrev(hero.card);
    setSlide(from ?? (next === "corp" ? "right" : "left"));
    setSideState(next);
    try {
      localStorage.setItem(SIDE_KEY, next);
    } catch {}
  };
  const swipe = useRef<{ x: number; y: number; done: boolean; drag: boolean } | null>(null);
  const slideEl = useRef<HTMLSpanElement>(null);
  const arenaEl = useRef<HTMLDivElement>(null);
  useTilt(arenaEl);
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
  const peek = useCardPeek(hero.card?.code, hero.card?.title ?? "");
  const tint = FACTION_TINT[factionKey(hero.identity?.faction)] ?? (side === "corp" ? "#3aa3b5" : "#ff5a4f");
  const play = () => (mode === "online" ? onFind() : go("local", undefined, mode === "solo"));
  const searching = mode === "online" && seeking;
  const label = searching ? t("Waiting for an opponent…") : mode === "online" ? t("Play online") : mode === "solo" ? t("Play vs bot") : t("Play local");
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
        ref={arenaEl}
        class={`screen arena side-${side} faction-${factionKey(hero.identity?.faction)}`}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY, done: false, drag: false })}
        onPointerMove={(e) => {
          const g = swipe.current;
          if (!g || document.querySelector(".card-peek")) return;
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
        {prev && <Art key={`out-${prev.code}`} card={prev} class={`arena-bg arena-bg-out ${prev.type === "ICE" ? "ice" : ""}`} sharp />}
        <Art key={`bg-${side}`} card={hero.card} class={`arena-bg ${hero.card?.type === "ICE" ? "ice" : ""} ${slide ? "arena-bg-in" : ""}`} sharp />
        <div class="arena-shade" aria-hidden="true" />
        <CursorGrid className="arena-grid" cellSize={32} color={tint} gridColor={tint} radius={110} holdTime={200} fadeDuration={1400} maxOpacity={0.7} fillOpacity={0} gridOpacity={0.1} spotlight={0.3} ambient={motionOff() ? 0 : 0.9} fps={30} tempo={seeking ? 1.8 : 1.2} clickPulse={!motionOff()} intro={!motionOff()} edgeFade={0.08} />
        <header class="arena-top">
          <button class="player-chip" onClick={props.onProfile} aria-label={t("Your profile")}>
            {factionLogoKey(hero.identity?.faction) ? (
              <span key={`av-${side}`} class={`player-glyph ${slide ? "chip-in" : ""}`}>
                <FactionLogo faction={hero.identity?.faction} />
              </span>
            ) : (
              <Art key={`av-${side}`} card={hero.identity} class={`player-avatar ${slide ? "chip-in" : ""}`} />
            )}
            <span key={`pt-${side}`} class={`player-text ${slide ? "chip-in" : ""}`}>
              <small class="label">{hero.identity?.side === "Corp" ? t("Corp ID") : t("Runner ID")}</small>
              <strong>{playerName()}</strong>
            </span>
          </button>
        </header>
        {error && <p class="error">{error}</p>}
        <Continue props={props} />
        <div class="deck-showcase">
          <button class="deck-open" disabled={!ready} onClick={() => peek.consumed() || onDecks(hero.id, side)} aria-label={hero.id ? t("Edit {deck}", { deck: hero.deck ?? "" }) : t("Open your decks")} {...peek.handlers}>
            <span ref={slideEl} key={side} class={`deck-slide ${slide ? `slide-${slide}` : ""}`}>
              <span class="deck-tilt">
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
            </span>
          </button>
          {peek.view}
          <span ref={captionEl} key={`c-${side}`} class={`deck-caption ${slide ? "fade-in" : ""}`}>
            <strong>{hero.deck ?? hero.card?.title ?? t("Build a deck")}</strong>
          </span>
        </div>
        <div class="arena-bottom">
          <div class="match-sides arena-modes" role="radiogroup" aria-label={t("Mode")}>
            {MODES.map((m) => (
              <button role="radio" aria-checked={mode === m.key} class={`mode-${m.key} ${mode === m.key ? "on" : ""}`} onClick={() => setMode(m.key)}>
                {t(m.label)}
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
            {t("Have a game code?")}
          </button>
        </div>
        {joining &&
          createPortal(
            <div class="sheet-backdrop" onClick={() => setJoining(false)}>
              <div class="sheet panel join-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("Join a game")}>
                <div class="row">
                  <span class="label">{t("Join a game")}</span>
                  <button class="ghost" onClick={() => setJoining(false)} aria-label={t("Close")}>
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
                  <p class="hint">{t("Enter the five-character code your friend shared, or scan their QR code.")}</p>
                )}
                <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
                {!scanning && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && (
                  <button class="qr-start" onClick={() => setScanning(true)}>
                    <Icon name="eye" /> {t("Scan a QR code")}
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )}
        <TabBar active="play" ready={ready} onTab={(t) => (t === "decks" ? onDecks() : t === "history" ? onHistory() : t === "learn" && onGuide())} />
      </div>
    </>
  );
}
