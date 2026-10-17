import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { CardDb, Deck, EngineApi, Side } from "../engine";
import type { SavedGame } from "../session";
import { type Archived, archiveFinished, listHistory, removeHistory } from "../history";
import { type Frame, Replay, type Script, type SharedGame, scriptOf, scriptOfShared, shareOf } from "../game/replay";
import { Board, LogTurns } from "../game/Board";
import { CardImage, ZoomableCardImage } from "../game/CardImage";
import { DeckViewer } from "./DeckViewer";
import { useBackClose } from "../back";
import { Icon } from "../icons";
import { Cta, Ticker, ask, tell } from "../ui";
import { DEFAULT_RELAY, relayUrl } from "../net/relay";
import { stagger } from "motion";
import { animate } from "../fx/core";
import { motionOff } from "../settings";

const SIDES: Side[] = ["corp", "runner"];
const other = (side: Side): Side => (side === "corp" ? "runner" : "corp");

const REASONS: Record<string, string> = {
  agenda: "on agenda points",
  flatline: "by flatline",
  decked: "the Corp ran out of cards",
  concede: "by concession",
  "agenda-points": "on agenda points",
};

function reasonText(reason: unknown) {
  const key = String(reason ?? "").toLowerCase();
  return REASONS[key] ?? (key ? key : "");
}

function dateText(ms: number) {
  const d = new Date(ms);
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days === 0) return `Today ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

const MODE: Record<Script["mode"], string> = { solo: "Solo vs bot", local: "Local game", online: "Online" };

interface Head {
  id: string;
  endedAt: number;
  shared?: string;
  script: Script | null;
  mySide: Side;
  winner?: Side;
  points: [number, number];
  turn: number;
  identities: Partial<Record<Side, { code: string; title: string }>>;
  outcome: "won" | "lost" | "over";
}

function headOf(archived: Archived, db: CardDb): Head {
  const save = archived.save;
  const sum = save.summary ?? {};
  return headFrom(scriptOf(save, db), { id: archived.id, endedAt: archived.endedAt, side: sum.side, winner: sum.winner, points: (sum.points ?? [0, 0]) as [number, number], turn: sum.turn ?? 0 });
}

function headOfShared(code: string, game: SharedGame, db: CardDb): Head {
  const mine = game.mySide;
  return { ...headFrom(scriptOfShared(game, db), { id: `shared:${code}`, endedAt: game.endedAt, side: mine, winner: game.winner, points: [game.points[mine], game.points[other(mine)]], turn: game.turn }), shared: code, outcome: "over" };
}

function headFrom(script: Script | null, r: { id: string; endedAt: number; side?: Side; winner?: Side; points: [number, number]; turn: number }): Head {
  const mySide = script?.mySide ?? r.side ?? "corp";
  const identities: Head["identities"] = {};
  for (const side of SIDES) {
    const id = script?.setup?.[side]?.deck?.identity;
    if (id?.code) identities[side] = { code: id.code, title: id.title };
  }
  const local = script?.mode === "local";
  return {
    id: r.id,
    endedAt: r.endedAt,
    script,
    mySide,
    winner: r.winner,
    points: r.points,
    turn: r.turn,
    identities,
    outcome: local ? "over" : r.winner === mySide ? "won" : "lost",
  };
}

const outcomeWord = (h: { outcome: "won" | "lost" | "over"; winner?: Side }) => (h.outcome === "won" ? "Victory" : h.outcome === "lost" ? "Defeat" : h.winner ? `${h.winner === "corp" ? "Corp" : "Runner"} wins` : "Game over");

function sidePoints(head: Head, side: Side) {
  return side === head.mySide ? head.points[0] : head.points[1];
}

export function History({ engine, db, saves, initial, shared, onClose }: { engine: EngineApi; db: CardDb; saves: SavedGame[]; initial?: string; shared?: { code: string; relay?: string }; onClose: () => void }) {
  const [games, setGames] = useState<Archived[] | null>(null);
  const [open, setOpen] = useState<Head | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useBackClose(true, onClose);
  useBackClose(!!open, () => setOpen(null));
  useEffect(() => {
    if (!shared) return;
    const relay = shared.relay ?? relayUrl();
    if (!relay) return setFailed("Shared games need the online relay.");
    fetch(`${relay}/replays/${shared.code}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "This replay could not be loaded.");
        setOpen(headOfShared(shared.code, (await res.json()) as SharedGame, db));
      })
      .catch((e) => setFailed(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    void archiveFinished(saves)
      .then(listHistory)
      .then((list) => {
        setGames(list);
        const first = initial && list.find((a) => a.id === initial);
        if (first) setOpen(headOf(first, db));
      });
  }, []);
  const heads = useMemo(() => (games ?? []).map((g) => headOf(g, db)), [games]);
  if (open) return <Report head={open} engine={engine} db={db} onClose={() => (open.shared && shared ? onClose() : setOpen(null))} />;
  if (shared && !failed)
    return (
      <div class="opening" role="status" aria-live="polite">
        <span class="label">Loading replay</span>
        <span class="opening-title" data-text={shared.code}>
          {shared.code}
        </span>
      </div>
    );
  const won = heads.filter((h) => h.outcome === "won").length;
  const lost = heads.filter((h) => h.outcome === "lost").length;
  return (
    <>
      <Ticker>
        History <span class="cyan">{heads.length} games</span>
      </Ticker>
      <div class="screen history">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>HISTORY</h1>
        </header>
        {heads.length > 0 && (
          <section class="panel cyan history-record">
            <span class="record-num cyan">{won}</span>
            <span class="label">won</span>
            <span class="record-sep" />
            <span class="record-num red">{lost}</span>
            <span class="label">lost</span>
          </section>
        )}
        {failed && <p class="error">{failed}</p>}
        {games && heads.length === 0 && <p class="hint history-empty">Finished games show up here, with their stats and a replay.</p>}
        <ul class="history-list">
          {heads.map((h) => (
            <li key={h.id}>
              <button class={`history-row ${h.outcome}`} onClick={() => setOpen(h)}>
                <span class="history-ids">
                  {SIDES.map((side) => {
                    const id = h.identities[side];
                    return id ? <CardImage class={`history-id ${side}`} code={id.code} alt={id.title} size="small" width="44px" /> : <span class={`history-id ${side} blank`} />;
                  })}
                </span>
                <span class="history-main">
                  <span class={`history-outcome ${h.outcome}`}>{outcomeWord(h)}</span>
                  <span class="history-title">
                    {h.script ? (h.script.mode === "local" ? "Local game" : `vs ${h.script.names[other(h.mySide)]}`) : "Game"}
                    <span class={`who-${h.mySide}`}> · {h.mySide}</span>
                  </span>
                  <span class="history-detail">
                    {sidePoints(h, "corp")}–{sidePoints(h, "runner")} · turn {h.turn} · {dateText(h.endedAt)}
                  </span>
                </span>
                <Icon name="arrow-right" />
              </button>
              <button
                class="ghost game-delete"
                aria-label="Remove from history"
                onClick={async () => {
                  if (!(await ask({ title: "Remove this game?", body: "It disappears from your history on this device.", ok: "Remove", danger: true }))) return;
                  await removeHistory(h.id);
                  setGames(await listHistory());
                }}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

interface Stat {
  label: string;
  values: Record<Side, number>;
}

interface Tile {
  label: string;
  value: string | number;
  detail?: string;
}

interface Stats {
  shared: Stat[];
  only: Record<Side, Tile[]>;
}

function statsOf(view: any, render: (m: unknown) => string): Stats {
  const s = view?.stats ?? {};
  const lines: string[] = (view?.log ?? []).map((e: any) => render(e.text));
  const names = { corp: view?.corp?.user?.username, runner: view?.runner?.user?.username };
  const by = (side: Side) => lines.filter((l) => names[side] && l.startsWith(names[side]));
  const count = (side: Side, re: RegExp) => by(side).filter((l) => re.test(l)).length;
  const sum = (o: Record<string, number> | undefined) => Object.values(o ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const both = (f: (side: Side) => number) => ({ corp: f("corp"), runner: f("runner") });
  const shared: Stat[] = [
    { label: "Credits gained", values: both((x) => s[x]?.gain?.credit ?? 0) },
    { label: "Credits spent", values: both((x) => s[x]?.spent?.credit ?? 0) },
    { label: "Cards drawn", values: both((x) => s[x]?.gain?.card ?? 0) },
    { label: "Clicks used", values: both((x) => s[x]?.lose?.click ?? 0) },
    { label: "Cards played", values: both((x) => sum(s[x]?.["cards-played"])) },
    { label: "Installs", values: both((x) => count(x, / to install /)) },
  ].filter((st) => st.values.corp + st.values.runner > 0);
  const runs = s.runner?.runs?.started ?? count("runner", / to make a run on /);
  const breaches = count("runner", / breaches /);
  const damage = by("corp").reduce((n, l) => n + Number(l.match(/to do (\d+) (?:net|meat|core|brain) damage/)?.[1] ?? 0), 0);
  const scored = count("corp", / scores /);
  const stolen = count("runner", / steals /);
  const only: Record<Side, Tile[]> = {
    corp: [
      { label: "Agendas scored", value: scored },
      { label: "Ice rezzed", value: s.corp?.cards?.rezzed ?? count("corp", / to rez /) },
      { label: "Advancements", value: count("corp", / to advance /) },
      { label: "Damage dealt", value: damage },
    ],
    runner: [
      { label: "Agendas stolen", value: stolen },
      { label: "Runs", value: runs },
      { label: "Successful", value: breaches, detail: runs ? `${Math.round((breaches / runs) * 100)}%` : undefined },
      { label: "Cards accessed", value: s.runner?.access?.cards ?? count("runner", / accesses /) },
    ],
  };
  return { shared, only };
}

function StatRows({ stats }: { stats: Stat[] }) {
  return (
    <div class="stat-rows">
      {stats.map((st) => {
        const max = Math.max(1, st.values.corp, st.values.runner);
        return (
          <div class="stat-row">
            {SIDES.map((x) => (
              <span class={`stat-side ${x} ${st.values[x] > st.values[other(x)] ? "lead" : ""}`}>
                <span class="stat-num">{st.values[x]}</span>
                <span class="stat-bar">
                  <i style={{ width: `${(st.values[x] / max) * 100}%` }} />
                </span>
              </span>
            ))}
            <span class="stat-label">{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function useAutoScroll(ref: { current: HTMLElement | null }, every = 2500) {
  useEffect(() => {
    const el = ref.current;
    if (!el || motionOff()) return;
    let idleUntil = 0;
    const hold = () => (idleUntil = Date.now() + 5000);
    const timer = setInterval(() => {
      if (Date.now() < idleUntil || document.hidden) return;
      const cards = [...el.children] as HTMLElement[];
      const loop = cards.find((c) => c.dataset.loop === "start");
      if (!cards[0] || !loop) return;
      const step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;
      const period = loop.offsetLeft - cards[0].offsetLeft;
      if (el.scrollLeft >= period - 1) el.scrollLeft -= period;
      el.scrollTo({ left: el.scrollLeft + step, behavior: "smooth" });
    }, every);
    el.addEventListener("pointerdown", hold);
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("wheel", hold, { passive: true });
    return () => {
      clearInterval(timer);
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("wheel", hold);
    };
  }, []);
}

function StatStrip({ only }: { only: Record<Side, Tile[]> }) {
  const strip = useRef<HTMLDivElement>(null);
  useAutoScroll(strip);
  return (
    <div ref={strip} class="stat-strip" role="list">
      {[0, 1].flatMap((copy) =>
        SIDES.flatMap((side) =>
          only[side].map((t, i) => (
          <div class={`stat-card ${side}`} role={copy ? undefined : "listitem"} aria-hidden={copy ? "true" : undefined} data-loop={copy && side === "corp" && i === 0 ? "start" : undefined}>
            <span class={`stat-card-side who-${side}`}>{side}</span>
            <span class="stat-card-num">
              {t.value}
              {t.detail && <small>{t.detail}</small>}
            </span>
            <span class="stat-card-label">{t.label}</span>
          </div>
          )),
        ),
      )}
    </div>
  );
}

function Chart({ frames, pick, label, max: fixedMax }: { frames: Frame[]; pick: (f: Frame) => Record<Side, number>; label: string; max?: number }) {
  const W = 320;
  const H = 110;
  const n = frames.length;
  const max = fixedMax ?? Math.max(5, ...frames.map((f) => Math.max(pick(f).corp, pick(f).runner)));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / max) * (H - 8) - 2;
  const path = (side: Side) => frames.map((f, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(pick(f)[side]).toFixed(1)}`).join("");
  const turns = frames.map((f, i) => (i && f.turn !== frames[i - 1].turn ? i : -1)).filter((i) => i > 0);
  const end = frames[n - 1];
  return (
    <figure class="chart">
      <figcaption>
        <span class="label">{label}</span>
        <span class="chart-legend">
          <span class="corp">Corp {end ? pick(end).corp : 0}</span>
          <span class="runner">Runner {end ? pick(end).runner : 0}</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
        {turns.map((i) => (
          <line class="chart-turn" x1={x(i)} x2={x(i)} y1={0} y2={H} />
        ))}
        {fixedMax === 7 && <line class="chart-goal" x1={0} x2={W} y1={y(7)} y2={y(7)} />}
        {SIDES.map((side) => (
          <path class={`chart-line ${side}`} d={path(side)} vector-effect="non-scaling-stroke" />
        ))}
      </svg>
    </figure>
  );
}

const SHARED_KEY = (id: string) => `nsg.shared.${id}`;

async function upload(head: Head, script: Script): Promise<string> {
  try {
    const known = localStorage.getItem(SHARED_KEY(head.id));
    if (known) return known;
  } catch {}
  const relay = relayUrl();
  if (!relay) throw new Error("Sharing needs the online relay.");
  const body = JSON.stringify(shareOf(script, { winner: head.winner, points: { corp: sidePoints(head, "corp"), runner: sidePoints(head, "runner") }, turn: head.turn, endedAt: head.endedAt }));
  const res = await fetch(`${relay}/replays`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
  if (!res.ok || !data.code) throw new Error(data.error ?? "The relay refused the game.");
  try {
    localStorage.setItem(SHARED_KEY(head.id), data.code);
  } catch {}
  return data.code;
}

function Report({ head, engine, db, onClose }: { head: Head; engine: EngineApi; db: CardDb; onClose: () => void }) {
  const [, setTick] = useState(0);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [watching, setWatching] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    if (!script) return;
    setSharing(true);
    try {
      const code = head.shared ?? (await upload(head, script));
      const relay = relayUrl();
      const url = `${location.origin}${location.pathname}?replay=${code}${relay && relay !== DEFAULT_RELAY ? `&relay=${encodeURIComponent(relay)}` : ""}`;
      const winner = head.winner && script.names[head.winner];
      const text = `${winner ? `${winner} wins` : "Netrunner game"} ${sidePoints(head, "corp")}–${sidePoints(head, "runner")} · ${script.names.corp} vs ${script.names.runner}`;
      try {
        if (navigator.share) await navigator.share({ title: "Netrunner game replay", text, url });
        else {
          await navigator.clipboard.writeText(url);
          tell("Link copied", "Anyone with the link can see the report and watch the replay.");
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          await navigator.clipboard?.writeText(url).catch(() => {});
          tell("Link copied", "Anyone with the link can see the report and watch the replay.");
        }
      }
    } catch (e) {
      tell("Could not share", e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };
  const hero = useRef<HTMLElement>(null);
  useBackClose(!!deck, () => setDeck(null));
  useBackClose(watching, () => setWatching(false));
  const script = head.script;
  useEffect(() => {
    if (!script) return;
    const r = new Replay(engine, script, () => setTick((t) => t + 1));
    setReplay(r);
    return () => r.dispose();
  }, []);
  useEffect(() => {
    const el = hero.current;
    if (!el || motionOff()) return;
    animate(el.querySelectorAll(".report-word, .report-score, .report-sub"), { opacity: [0, 1], y: [18, 0] }, { duration: 0.45, delay: stagger(0.08), ease: [0.2, 0.9, 0.3, 1] });
  }, []);
  const render = (m: unknown) => engine.renderMessage(m);
  const final = replay?.done ? replay.frames[replay.frames.length - 1] : undefined;
  const stats = useMemo(() => (final ? statsOf(final.views.corp, render) : null), [final]);
  const deckOf = (side: Side): Deck | null => {
    const d = script?.setup?.[side]?.deck;
    return d ? { name: script!.deckNames[side] ?? `${side === "corp" ? "Corp" : "Runner"} deck`, ...d } : null;
  };
  if (watching && replay && script) return <ReplayPlayer replay={replay} engine={engine} db={db} script={script} onClose={() => setWatching(false)} />;
  const progress = replay ? replay.frames.length / replay.total : 0;
  const reason = final ? reasonText(final.views.corp?.reason) : "";
  const winnerName = head.winner && script ? script.names[head.winner] : undefined;
  return (
    <>
      <Ticker>
        Report <span class="cyan">{script ? MODE[script.mode] : ""}</span>
      </Ticker>
      <div class="screen report">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to history">
            <Icon name="arrow-left" />
          </button>
          <h1>GAME REPORT</h1>
        </header>

        <section ref={hero} class={`panel report-hero ${head.outcome} win-${head.winner ?? "none"}`}>
          <span class="report-word" data-text={outcomeWord(head)}>
            {outcomeWord(head)}
          </span>
          <span class="report-score">
            <span class="corp">{sidePoints(head, "corp")}</span>
            <span class="report-dash">—</span>
            <span class="runner">{sidePoints(head, "runner")}</span>
          </span>
          <span class="report-sub">
            {winnerName ? `${winnerName} wins${reason ? ` ${reason}` : ""}` : "Game over"} · turn {head.turn} · {dateText(head.endedAt)}
          </span>
        </section>

        {script && (
          <section class="report-matchup">
            {SIDES.map((side) => {
              const id = head.identities[side];
              const d = deckOf(side);
              return (
                <div class={`report-player panel ${side} ${head.winner === side ? "winner" : ""}`}>
                  {id && <ZoomableCardImage class="report-id" code={id.code} alt={id.title} size="medium" width="120px" />}
                  <span class={`label who-${side}`}>
                    {side}
                    {side === head.mySide && script.mode !== "local" && !head.shared ? " · you" : ""}
                  </span>
                  <span class="report-name">{script.names[side]}</span>
                  <span class="report-deck">{script.deckNames[side] ?? id?.title}</span>
                  {d && (
                    <button class="ghost report-decklist" onClick={() => setDeck(d)}>
                      Decklist
                    </button>
                  )}
                </div>
              );
            })}
            <span class="versus report-vs" aria-hidden="true">
              VS
            </span>
          </section>
        )}

        {script && (
          <div class="report-cta">
            <Cta onClick={() => setWatching(true)} disabled={!replay || replay.frames.length === 0}>
              Watch the replay
            </Cta>
            <button class="report-share" onClick={share} disabled={sharing} aria-label="Share this game">
              <Icon name="share" />
              <span>{sharing ? "…" : "Share"}</span>
            </button>
          </div>
        )}

        {replay && !replay.done && (
          <section class="panel report-loading">
            <span class="label">Rebuilding the game</span>
            <span class="opening-bar report-bar">
              <i style={{ width: `${Math.round(progress * 100)}%`, transform: "none" }} />
            </span>
          </section>
        )}

        {final && (
          <section class="panel section report-charts">
            <Chart frames={replay!.frames} pick={(f) => f.points} label="Agenda points" max={7} />
            <Chart frames={replay!.frames} pick={(f) => f.credits} label="Credits" />
          </section>
        )}

        {stats && (
          <section class="panel section report-stats">
            <div class="stat-head">
              <span class="who-corp">{script?.names.corp}</span>
              <span class="label">Head to head</span>
              <span class="who-runner">{script?.names.runner}</span>
            </div>
            <StatRows stats={stats.shared} />
          </section>
        )}

        {stats && <StatStrip only={stats.only} />}

        {final && (
          <section class="panel section report-log">
            <button class="report-log-toggle" onClick={() => setLogOpen(!logOpen)} aria-expanded={logOpen}>
              <span class="label">Game log</span>
              <span class="hint">{(final.views.corp?.log ?? []).length} lines</span>
              <Icon name={logOpen ? "minus" : "plus"} />
            </button>
            {logOpen && (
              <div class="log">
                <LogTurns log={final.views.corp?.log ?? []} render={render} names={script!.names} />
              </div>
            )}
          </section>
        )}

        {!script && <p class="error">This game cannot be replayed: its start was not recorded on this device.</p>}
      </div>
      {deck && <DeckViewer deck={deck} onClose={() => setDeck(null)} />}
    </>
  );
}

const SPEEDS = [0.5, 1, 2, 4];
const STEP_MS = 900;

function ReplayPlayer({ replay, engine, db, script, onClose }: { replay: Replay; engine: EngineApi; db: CardDb; script: Script; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [skipIdle, setSkipIdle] = useState(true);
  const [side, setSide] = useState<Side>(script.mySide);
  const [quiet, setQuiet] = useState(true);
  const [, setTick] = useState(0);
  const frames = replay.frames;
  const last = (replay.done ? replay.total : frames.length) - 1;
  useEffect(() => {
    if (replay.done) return;
    const t = setInterval(() => setTick((n) => n + 1), 300);
    return () => clearInterval(t);
  }, []);
  const go = (to: number, animated: boolean) => {
    const next = Math.max(0, Math.min(frames.length - 1, to));
    setQuiet(!animated);
    setIndex(next);
  };
  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      if (replay.done) setPlaying(false);
      return;
    }
    if (index + 1 >= frames.length) {
      const t = setTimeout(() => setTick((n) => n + 1), 200);
      return () => clearTimeout(t);
    }
    const next = frames[index + 1];
    const idle = next.log === frames[index].log || next.entry?.kind === "say";
    const turnBreak = next.turn !== frames[index].turn;
    const delay = (skipIdle && idle ? 40 : turnBreak ? STEP_MS * 1.6 : STEP_MS) / speed;
    const t = setTimeout(() => go(index + 1, speed <= 2), delay);
    return () => clearTimeout(t);
  }, [playing, index, speed, skipIdle, frames.length, replay.done]);
  const frame = frames[index] ?? frames[0];
  const turnMarks = useMemo(() => {
    const out: { at: number; turn: number }[] = [];
    frames.forEach((f, i) => {
      if (i && f.turn !== frames[i - 1].turn) out.push({ at: i, turn: f.turn });
    });
    return out;
  }, [frames.length]);
  const deckFor = (s: Side): Deck | undefined => {
    const d = script.setup?.[s]?.deck;
    return d ? { name: script.deckNames[s] ?? `${s} deck`, ...d } : undefined;
  };
  const fake: any = {
    lobby: { code: "", role: "spectator", status: "connected", myName: script.names[side], mySide: side, opponentDeckReady: true, started: true, players: script.names },
    pending: false,
    actionError: null,
    deckFor,
    say() {},
    send() {},
    concede() {},
    journal() {},
    freeSeat() {},
    clearActionError() {},
  };
  const total = Math.max(1, last);
  const controls = (
    <div class="replay">
      <div class="replay-meta">
        <span class="label">
          Replay · turn {frame?.turn ?? 0}
        </span>
        <span class="replay-count">
          {index}/{last}
          {!replay.done && <span class="yellow"> · loading</span>}
        </span>
      </div>
      <div class="replay-track">
        <div class="replay-marks" aria-hidden="true">
          {turnMarks.map((m) => (
            <i style={{ left: `${(m.at / total) * 100}%` }} class={m.turn % 2 ? "odd" : ""} />
          ))}
          <b style={{ width: `${(frames.length - 1) / total * 100}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          aria-label="Replay position"
          onInput={(e) => {
            setPlaying(false);
            go(Number((e.target as HTMLInputElement).value), false);
          }}
        />
      </div>
      <div class="replay-buttons">
        <button aria-label="Previous step" onClick={() => (setPlaying(false), go(index - 1, false))} disabled={index === 0}>
          <Icon name="step-back" />
        </button>
        <button class="primary replay-play" aria-label={playing ? "Pause" : "Play"} onClick={() => (index >= last && replay.done ? (go(0, false), setPlaying(true)) : setPlaying(!playing))}>
          <Icon name={playing ? "pause" : "play"} />
        </button>
        <button aria-label="Next step" onClick={() => (setPlaying(false), go(index + 1, true))} disabled={index >= frames.length - 1}>
          <Icon name="step-forward" />
        </button>
        <button class="replay-chip" aria-label="Playback speed" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
          {speed}×
        </button>
        <button class={`replay-chip ${skipIdle ? "on" : ""}`} aria-pressed={skipIdle} onClick={() => setSkipIdle(!skipIdle)}>
          Skip idle
        </button>
      </div>
    </div>
  );
  if (!frame) return null;
  return (
    <Board
      session={fake}
      engine={engine}
      db={db}
      side={side}
      view={frame.views[side]}
      quiet={quiet}
      controls={controls}
      onSwitchSide={() => (setQuiet(true), setSide(other(side)))}
      onLeave={onClose}
      onExit={onClose}
    />
  );
}
