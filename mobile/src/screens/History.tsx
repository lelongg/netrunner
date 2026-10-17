import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { CardDb, Deck, EngineApi, Side } from "../engine";
import type { SavedGame } from "../session";
import { type Archived, archiveFinished, listHistory, removeHistory } from "../history";
import { type Frame, Replay, type Script, scriptOf } from "../game/replay";
import { Board, LogTurns } from "../game/Board";
import { CardImage, ZoomableCardImage } from "../game/CardImage";
import { DeckViewer } from "./DeckViewer";
import { useBackClose } from "../back";
import { Icon } from "../icons";
import { Cta, Ticker, ask } from "../ui";
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
  archived: Archived;
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
  const script = scriptOf(save, db);
  const sum = save.summary ?? {};
  const mySide = script?.mySide ?? sum.side ?? "corp";
  const identities: Head["identities"] = {};
  for (const side of SIDES) {
    const id = script?.setup?.[side]?.deck?.identity;
    if (id?.code) identities[side] = { code: id.code, title: id.title };
  }
  const local = script?.mode === "local";
  return {
    archived,
    script,
    mySide,
    winner: sum.winner,
    points: (sum.points ?? [0, 0]) as [number, number],
    turn: sum.turn ?? 0,
    identities,
    outcome: local ? "over" : sum.winner === mySide ? "won" : "lost",
  };
}

const OUTCOME = { won: "Victory", lost: "Defeat", over: "Game over" };

function sidePoints(head: Head, side: Side) {
  return side === head.mySide ? head.points[0] : head.points[1];
}

export function History({ engine, db, saves, initial, onClose }: { engine: EngineApi; db: CardDb; saves: SavedGame[]; initial?: string; onClose: () => void }) {
  const [games, setGames] = useState<Archived[] | null>(null);
  const [open, setOpen] = useState<Head | null>(null);
  useBackClose(true, onClose);
  useBackClose(!!open, () => setOpen(null));
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
  if (open) return <Report head={open} engine={engine} db={db} onClose={() => setOpen(null)} />;
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
        {games && heads.length === 0 && <p class="hint history-empty">Finished games show up here, with their stats and a replay.</p>}
        <ul class="history-list">
          {heads.map((h) => (
            <li key={h.archived.id}>
              <button class={`history-row ${h.outcome}`} onClick={() => setOpen(h)}>
                <span class="history-ids">
                  {SIDES.map((side) => {
                    const id = h.identities[side];
                    return id ? <CardImage class={`history-id ${side}`} code={id.code} alt={id.title} size="small" width="44px" /> : <span class={`history-id ${side} blank`} />;
                  })}
                </span>
                <span class="history-main">
                  <span class={`history-outcome ${h.outcome}`}>{OUTCOME[h.outcome]}</span>
                  <span class="history-title">
                    {h.script ? (h.script.mode === "local" ? "Local game" : `vs ${h.script.names[other(h.mySide)]}`) : "Game"}
                    <span class={`who-${h.mySide}`}> · {h.mySide}</span>
                  </span>
                  <span class="history-detail">
                    {sidePoints(h, "corp")}–{sidePoints(h, "runner")} · turn {h.turn} · {dateText(h.archived.endedAt)}
                  </span>
                </span>
                <Icon name="arrow-right" />
              </button>
              <button
                class="ghost game-delete"
                aria-label="Remove from history"
                onClick={async () => {
                  if (!(await ask({ title: "Remove this game?", body: "It disappears from your history on this device.", ok: "Remove", danger: true }))) return;
                  await removeHistory(h.archived.id);
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
  values: Partial<Record<Side, number>>;
}

function statsOf(view: any, render: (m: unknown) => string): Stat[] {
  const s = view?.stats ?? {};
  const lines: string[] = (view?.log ?? []).map((e: any) => render(e.text));
  const names = { corp: view?.corp?.user?.username, runner: view?.runner?.user?.username };
  const count = (side: Side, re: RegExp) => lines.filter((l) => names[side] && l.startsWith(names[side]) && re.test(l)).length;
  const sum = (o: Record<string, number> | undefined) => Object.values(o ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const both = (f: (side: Side) => number | undefined) => ({ corp: f("corp"), runner: f("runner") });
  const out: Stat[] = [
    { label: "Credits gained", values: both((x) => s[x]?.gain?.credit ?? 0) },
    { label: "Credits spent", values: both((x) => s[x]?.spent?.credit ?? 0) },
    { label: "Cards drawn", values: both((x) => s[x]?.gain?.card ?? 0) },
    { label: "Clicks used", values: both((x) => s[x]?.lose?.click ?? 0) },
    { label: "Cards played", values: both((x) => sum(s[x]?.["cards-played"])) },
    { label: "Agendas scored", values: { corp: count("corp", / scores /) } },
    { label: "Agendas stolen", values: { runner: count("runner", / steals /) } },
    { label: "Ice rezzed", values: { corp: s.corp?.cards?.rezzed ?? count("corp", / to rez /) } },
    { label: "Runs", values: { runner: s.runner?.runs?.started ?? count("runner", / to make a run on /) } },
    { label: "Successful runs", values: { runner: count("runner", / breaches /) } },
    { label: "Cards accessed", values: { runner: s.runner?.access?.cards ?? count("runner", / accesses /) } },
    { label: "Damage dealt", values: { corp: lines.filter((l) => /to do \d+ (net|meat|core|brain) damage/.test(l) && names.corp && l.startsWith(names.corp)).reduce((n, l) => n + Number(l.match(/to do (\d+)/)?.[1] ?? 0), 0) } },
  ];
  return out.filter((st) => SIDES.some((x) => (st.values[x] ?? 0) > 0));
}

function StatRows({ stats }: { stats: Stat[] }) {
  return (
    <div class="stat-rows">
      {stats.map((st) => {
        const max = Math.max(1, ...SIDES.map((x) => st.values[x] ?? 0));
        return (
          <div class="stat-row">
            {SIDES.map((x) => (
              <span class={`stat-side ${x} ${st.values[x] === undefined ? "none" : ""}`}>
                <span class="stat-num">{st.values[x] ?? "–"}</span>
                <span class="stat-bar">
                  <i style={{ width: `${((st.values[x] ?? 0) / max) * 100}%` }} />
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

function Report({ head, engine, db, onClose }: { head: Head; engine: EngineApi; db: CardDb; onClose: () => void }) {
  const [, setTick] = useState(0);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [watching, setWatching] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [logOpen, setLogOpen] = useState(false);
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
  const stats = useMemo(() => (final ? statsOf(final.views.corp, render) : []), [final]);
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
          <span class="report-word" data-text={OUTCOME[head.outcome]}>
            {OUTCOME[head.outcome]}
          </span>
          <span class="report-score">
            <span class="corp">{sidePoints(head, "corp")}</span>
            <span class="report-dash">—</span>
            <span class="runner">{sidePoints(head, "runner")}</span>
          </span>
          <span class="report-sub">
            {winnerName ? `${winnerName} wins${reason ? ` ${reason}` : ""}` : "Game over"} · turn {head.turn} · {dateText(head.archived.endedAt)}
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
                    {side === head.mySide && script.mode !== "local" ? " · you" : ""}
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
          <Cta onClick={() => setWatching(true)} disabled={!replay || replay.frames.length === 0}>
            Watch the replay
          </Cta>
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

        {stats.length > 0 && (
          <section class="panel section report-stats">
            <div class="stat-head">
              <span class="who-corp">{script?.names.corp}</span>
              <span class="label">Stats</span>
              <span class="who-runner">{script?.names.runner}</span>
            </div>
            <StatRows stats={stats} />
          </section>
        )}

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
