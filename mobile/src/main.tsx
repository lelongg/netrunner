import { Dialogs, setSettingsOpen, useSettingsOpen } from "./ui";
import { SettingsMenu } from "./screens/SettingsMenu";
import { History } from "./screens/History";
import { Decks } from "./screens/Decks";
import { useBackClose } from "./back";
import { render } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { animate } from "motion";
import { installTips } from "./tips";
import { PeekHost, installCardPeek } from "./peek";
import { installMotion, useLoop } from "./fx/ui";
import { silence, unlockSound } from "./sound";
import { dive } from "./fx/dive";
import { Credits } from "./screens/Credits";
import { Profile } from "./screens/Profile";
import { Match } from "./screens/Match";
import { type Matched, checkSeek, pendingSeek } from "./net/match";
import { initMusic, setMood } from "./music";
import { installUiSounds, uiSound } from "./uisound";
import { startEngineWorker } from "./game/workerHost";
import { type CardDb, type EngineApi, type Matchup, type Side, loadEngine } from "./engine";
import { Board } from "./game/Board";
import { storeTicket, ticketFromHash } from "./net/relay";
import { awaitingMove, basicCommands, promptOf, runCommands } from "./game/actions";
import { Handoff } from "./screens/Handoff";
import { useTilt } from "./tilt";
import { Home } from "./screens/Home";
import { type Tab, TabBar } from "./screens/HomeModern";
import { Lobby } from "./screens/Lobby";
import { Guide } from "./screens/Guide";
import { FxLab } from "./screens/FxLab";
import { FxGlLab } from "./screens/FxGlLab";
import { markTutorial, skipTutorial, tutorialState } from "./tutorial";
import { fromPrecon, seedStarters, toWire } from "./decks";
import { type Role, type SavedGame, Session, clearSave, listSaves, loadSave, newRoomCode, saveId } from "./session";
import "./styles.css";
import "./fx/fx.css";
import { applySettings, motionOff, onSettings, settings } from "./settings";
import { MotionGlobalConfig } from "motion";

const joinParam = new URLSearchParams(location.search).get("join")?.toUpperCase() ?? undefined;
const gameParam = new URLSearchParams(location.search).get("game") ?? undefined;
const watchParam = new URLSearchParams(location.search).get("watch")?.toUpperCase() ?? undefined;
const replayParam = new URLSearchParams(location.search).get("replay")?.toUpperCase() ?? undefined;
const replayRelay = new URLSearchParams(location.search).get("relay") ?? undefined;
const seatFromLink = joinParam ? ticketFromHash(joinParam, location.hash) : undefined;
if (seatFromLink) storeTicket(seatFromLink);
const autopilotParam = new URLSearchParams(location.search).has("autopilot");
const agentParam =
  new URLSearchParams(location.search).has("agent") ||
  (() => {
    try {
      return sessionStorage.getItem("nsg.agent") === "1";
    } catch {
      return false;
    }
  })();
if (agentParam)
  try {
    sessionStorage.setItem("nsg.agent", "1");
  } catch {}
if (joinParam || watchParam || replayParam) history.replaceState(null, "", location.pathname);

function useSession(session: Session | null) {
  const [, setTick] = useState(0);
  useEffect(() => session?.subscribe(() => setTick((t) => t + 1)), [session]);
}

const HANDOFF_KEY = "nsg.handoff";

const otherSide = (s: Side): Side => (s === "corp" ? "runner" : "corp");

const runnerPassed = (view: any) => (view.encounters ?? view.run)?.["no-action"] === "runner";

function corpDecision(view: any) {
  if (!view?.run || !runnerPassed(view)) return false;
  if (runCommands(view, "corp").some((c) => c.enabled !== false && (c.command === "rez" || c.command === "unbroken-subroutines"))) return true;
  if (view.encounters || view.run.position !== 0) return false;
  const server = view.corp?.servers?.[view.run.server?.[0]];
  return (server?.content ?? []).some((c: any) => !c.rezzed && (c.type === "Upgrade" || c.type === "Asset"));
}

function installedCards(view: any, side: Side): any[] {
  const out: any[] = [];
  const walk = (c: any) => {
    if (!c) return;
    out.push(c);
    for (const h of c.hosted ?? []) walk(h);
  };
  if (side === "corp") for (const server of Object.values<any>(view?.corp?.servers ?? {})) for (const c of [...(server.content ?? []), ...(server.ices ?? [])]) walk(c);
  else for (const zone of Object.values<any>(view?.runner?.rig ?? {})) for (const c of zone ?? []) walk(c);
  return out;
}

function canRespond(view: any, side: Side) {
  if (!view || view.winner || promptOf(view, side)) return false;
  const credits = view[side]?.credit ?? 0;
  return installedCards(view, side).some((c) => {
    if ((c.abilities ?? []).some((a: any) => a.playable)) return true;
    return side === "corp" && !c.rezzed && c.type !== "ICE" && c.type !== "Agenda" && (c["current-rez-cost"] ?? c.cost ?? 0) <= credits;
  });
}

function canAct(view: any, side: Side) {
  if (!view || view.winner) return false;
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  if (prompt && ptype !== "waiting" && ptype !== "run") return true;
  if (prompt && ptype === "waiting") return false;
  if (view.run || view.encounters) {
    if (side === "corp") return corpDecision(view);
    return runCommands(view, side).some((c) => c.enabled !== false && c.command !== "toggle-auto-no-action");
  }
  return basicCommands(view, side).some((c) => c.enabled !== false && c.command !== "toggle-auto-no-action");
}

const OPENING_DELAY_MS = 300;
const OPENING_MIN_MS = 1400;

function playerName() {
  try {
    return localStorage.getItem("nsg.name")?.trim() || "Player";
  } catch {
    return "Player";
  }
}

function App() {
  const [loaded, setLoaded] = useState<{ engine: EngineApi; db: CardDb; matchups: Matchup[] }>();
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<Session | null>(null);
  const [localSide, setLocalSide] = useState<Side>("corp");
  const [handoff, setHandoff] = useState<Side | null>(null);
  const [handoffLog, setHandoffLog] = useState(0);
  const [saves, setSaves] = useState<SavedGame[]>(() => listSaves());
  useSession(session);
  useBackClose(!!session, () => exit());
  const currentId = session?.saveId;
  useEffect(() => {
    const url = currentId ? `${location.pathname}?game=${encodeURIComponent(currentId)}` : location.pathname;
    const apply = () => {
      if (`${location.pathname}${location.search}` !== url) history.replaceState(history.state, "", url);
    };
    apply();
    addEventListener("popstate", apply);
    return () => removeEventListener("popstate", apply);
  }, [currentId]);
  useEffect(() => {
    if (agentParam) (window as any).__nsg = { session, engine: loaded?.engine };
  }, [session, loaded]);
  const hotSeat = !!session && session.lobby.started && session.lobby.role === "local" && !session.lobby.vsBot;
  const [responding, setResponding] = useState<{ by: Side; back: Side } | null>(null);
  const waitingFor = hotSeat && !responding && !canAct(session.views[localSide], localSide) && canAct(session.views[otherSide(localSide)], otherSide(localSide)) ? otherSide(localSide) : null;
  const respondWindow = hotSeat && !responding && !handoff && awaitingMove(session!.views[localSide], localSide) ? otherSide(localSide) : null;
  const responder = respondWindow && canRespond(session!.views[respondWindow], respondWindow) ? respondWindow : null;
  useEffect(() => {
    if (waitingFor && handoff !== waitingFor) setHandoff(waitingFor);
  }, [waitingFor]);
  const corpView = hotSeat ? session!.views.corp : null;
  const autoPass = !!corpView && !session!.pending && (corpView.run || corpView.encounters) && runnerPassed(corpView) && !corpDecision(corpView) && (promptOf(corpView, "corp")?.["prompt-type"] ?? "run") === "run" && runCommands(corpView, "corp").some((c) => c.command === "continue" && c.enabled !== false);
  useEffect(() => {
    if (autoPass) session!.send("continue", null, "corp");
  }, [autoPass, corpView?.log?.length, corpView?.run?.phase, corpView?.run?.position]);

  const [credits, setCredits] = useState(false);
  const [profile, setProfile] = useState(false);
  openCredits = session ? undefined : () => setCredits(true);
  const [matching, setMatching] = useState(false);
  const [seeking, setSeeking] = useState(() => !!pendingSeek());
  const [guide, setGuide] = useState(() => !joinParam && !gameParam && !watchParam && !replayParam && tutorialState() === null);
  const firstRun = guide && tutorialState() === null;
  const [archive, setArchive] = useState<string | boolean>(false);
  const [decks, setDecks] = useState<false | { id?: string; side?: Side }>(false);
  const [sharedReplay, setSharedReplay] = useState(replayParam ? { code: replayParam, relay: replayRelay } : undefined);
  const [opening, setOpeningState] = useState<string | null>(joinParam ?? watchParam ?? gameParam?.replace(/^local:.*/, "local game") ?? null);
  const [held, setHeld] = useState<string | null>(null);
  const [diving, setDiving] = useState(false);
  const started = !!session?.lobby.started;
  const wasStarted = useRef(started);
  useLayoutEffect(() => {
    const fresh = started && !wasStarted.current;
    wasStarted.current = started;
    if (!fresh || motionOff()) return;
    setDiving(true);
    const timer = setTimeout(() => setDiving(false), 1300);
    return () => clearTimeout(timer);
  }, [started]);
  const openedAt = useRef(performance.now());
  const openingLabel = useRef(opening);
  const setOpening = (label: string | null) => {
    const shown = performance.now() - openedAt.current;
    if (label) openedAt.current = performance.now();
    else if (openingLabel.current && shown > OPENING_DELAY_MS && shown < OPENING_MIN_MS) {
      setHeld(openingLabel.current);
      setTimeout(() => setHeld(null), OPENING_MIN_MS - shown);
    }
    openingLabel.current = label;
    setOpeningState(label);
  };
  const afterPaint = (fn: () => void) => requestAnimationFrame(() => setTimeout(fn, 0));

  const entered = useRef<string | null>(null);
  const matchingNow = useRef(false);
  matchingNow.current = matching;
  const startMatched = (m: Matched) => {
    if (!loaded || entered.current === m.code) return;
    entered.current = m.code;
    setMatching(false);
    setSeeking(false);
    setOpening(m.code);
    afterPaint(() => {
      const next = new Session(loaded.engine, loaded.db, m.seat === 0 ? "host" : "guest", m.code, playerName(), m.side);
      if (m.seat === 0) next.configureMatch(m.format, m.side);
      setSession(next);
      setOpening(null);
    });
  };
  useEffect(() => {
    if (!loaded || session) return;
    const check = () => {
      const mine = pendingSeek();
      setSeeking(!!mine);
      if (mine)
        checkSeek(mine).then(
          (r) => typeof r === "object" && startMatched(r),
          () => {},
        );
    };
    check();
    const timer = setInterval(() => !matchingNow.current && pendingSeek() && check(), 15000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loaded, !!session]);

  const resume = (from: SavedGame) => {
    if (!loaded) return;
    setOpening(from.v === 1 ? (from.vsBot ? "solo game" : "local game") : from.code);
    afterPaint(() => {
      try {
        open(from);
      } catch (e) {
        setError(`Could not open this game: ${e instanceof Error ? e.message : e}`);
      }
      setOpening(null);
    });
  };

  const open = (from: SavedGame) => {
    if (!loaded) return;
    setSession(Session.resume(loaded.engine, loaded.db, from));
    setLocalSide(from.v === 1 ? from.mySide : "corp");
    try {
      const stored = JSON.parse(localStorage.getItem(HANDOFF_KEY) ?? "null");
      setHandoffLog(stored?.id === saveId(from) ? Number(stored.at) : 0);
    } catch {
      setHandoffLog(0);
    }
  };

  useEffect(() => {
    if (!loaded || session) return;
    if (watchParam) {
      afterPaint(() => {
        setSession(new Session(loaded.engine, loaded.db, "spectator", watchParam, "Spectator", "runner"));
        setOpening(null);
      });
      return;
    }
    const existing = joinParam ? loadSave(joinParam) : gameParam ? loadSave(gameParam) : null;
    if (existing) resume(existing);
    else if (!joinParam) setOpening(null);
    else {
      let name = "Player";
      try {
        name = localStorage.getItem("nsg.name")?.trim() || name;
      } catch {}
      afterPaint(() => {
        const joined = new Session(loaded.engine, loaded.db, "guest", joinParam, name);
        if (autopilotParam) joined.autopilot();
        setSession(joined);
        setOpening(null);
      });
    }
  }, [loaded]);

  useEffect(() => {
    loadEngine()
      .then(({ engine, db }) => {
        const matchups = engine.precons();
        seedStarters(db, matchups);
        setLoaded({ engine, db, matchups });
      })
      .catch((e) => setError(`Could not load the engine: ${e}`));
  }, []);

  const leave = () => {
    session?.forget();
    session?.close();
    setSession(null);
    setSaves(listSaves());
  };

  const watch = (code: string, forget = false) => {
    if (!loaded) return;
    if (forget) session?.forget();
    session?.close();
    setSession(new Session(loaded.engine, loaded.db, "spectator", code, "Spectator", "runner"));
    setSaves(listSaves());
  };

  const exit = () => {
    session?.close();
    setSession(null);
    setSaves(listSaves());
  };

  if (!error && (held || (opening && !session))) return <Opening label={(held ?? opening)!} ready={!!loaded} />;

  const goTab = (t: Tab) => {
    setDecks(t === "decks" ? {} : false);
    setArchive(t === "history");
    setGuide(t === "learn");
    setMatching(false);
  };
  const tabs = (active: Tab) => <TabBar global active={active} ready={!!loaded} onTab={goTab} />;

  if (decks && loaded && !session)
    return (
      <>
        <Decks db={loaded.db} matchups={loaded.matchups} initialDeck={decks.id} initialSide={decks.side} onClose={() => setDecks(false)} />
        {tabs("decks")}
      </>
    );

  if ((archive || sharedReplay) && loaded && !session)
    return (
      <>
        <History
          engine={loaded.engine}
          db={loaded.db}
          saves={saves}
          initial={typeof archive === "string" ? archive : undefined}
          shared={sharedReplay}
          onClose={() => {
            setArchive(false);
            setSharedReplay(undefined);
          }}
        />
        {tabs("history")}
      </>
    );

  if (credits && !session) return <Credits onClose={() => setCredits(false)} />;
  if (profile && loaded && !session && !decks) return <Profile db={loaded.db} onClose={() => setProfile(false)} onOpenDeck={(id, side) => setDecks({ id, side })} />;
  if (matching && loaded && !session)
    return (
      <Match
        name={playerName()}
        db={loaded.db}
        matchups={loaded.matchups}
        onMatched={startMatched}
        onEditDecks={(side) => setDecks({ side })}
        onJoin={(code) => {
          setMatching(false);
          const existing = loadSave(code);
          if (existing) return resume(existing);
          setOpening(code);
          afterPaint(() => {
            setSession(new Session(loaded.engine, loaded.db, "guest", code, playerName()));
            setOpening(null);
          });
        }}
        onWatch={(code) => {
          setMatching(false);
          watch(code);
        }}
        onClose={() => {
          setMatching(false);
          setSeeking(!!pendingSeek());
        }}
      />
    );
  if (guide && loaded && !session)
    return (
      <>
        <Guide
          db={loaded.db}
          firstRun={firstRun}
          onClose={() => {
            if (firstRun) skipTutorial();
            setGuide(false);
          }}
          onPlay={(side) => {
            markTutorial("done");
            setGuide(false);
            setOpening("tutorial");
            afterPaint(() => {
              const m = loaded.matchups.find((x) => x.key === "beginner") ?? loaded.matchups[0];
              let name = "Player";
              try {
                name = localStorage.getItem("nsg.name")?.trim() || name;
              } catch {}
              const next = new Session(loaded.engine, loaded.db, "local", newRoomCode(), name, side);
              const deck = (s: "corp" | "runner") => toWire(fromPrecon(m[s], loaded.db));
              next.startTutorial(side, deck(side), deck(side === "corp" ? "runner" : "corp"));
              setSession(next);
              setLocalSide(side);
              setOpening(null);
            });
          }}
        />
        {!firstRun && tabs("learn")}
      </>
    );

  if (!session || !loaded) {
    return (
      <Home
        onGuide={() => setGuide(true)}
        onCredits={() => setCredits(true)}
        onFind={() => {
          setMatching(true);
        }}
        seeking={seeking}
        onHistory={(id) => setArchive(id ?? true)}
        onDecks={(id, side) => setDecks({ id, side })}
        onProfile={() => setProfile(true)}
        ready={!!loaded}
        db={loaded?.db}
        error={error}
        initialJoin={joinParam}
        saves={saves}
        onResume={resume}
        onDiscard={(save) => {
          clearSave(save);
          setSaves(listSaves());
        }}
        onStart={(role: Role, name: string, code?: string, vsBot?: boolean) => {
          if (!loaded) return;
          const existing = role === "guest" && code ? loadSave(code) : null;
          if (existing) return resume(existing);
          const begin = () => {
            const next = new Session(loaded.engine, loaded.db, role, role === "local" ? newRoomCode() : code, name, role === "spectator" ? "runner" : undefined);
            if (vsBot) next.enableBot();
            setSession(next);
            setLocalSide("corp");
            setOpening(null);
          };
          if (role === "local") return begin();
          setOpening((role === "guest" || role === "spectator") && code ? code : role === "host" ? "new game" : "local game");
          afterPaint(begin);
        }}
      />
    );
  }

  const { lobby } = session;
  if (!lobby.started) return <Lobby session={session} db={loaded.db} matchups={loaded.matchups} onLeave={leave} onWatch={() => watch(lobby.code, true)} />;
  if (diving) return <Opening label={lobby.vsBot ? "solo game" : lobby.role === "local" ? "local game" : lobby.code || "game"} ready />;

  if (hotSeat) {
    if (handoff)
      return (
        <Handoff
          side={handoff}
          onReady={() => {
            const at = (session.views.corp?.log ?? []).length;
            setHandoffLog(at);
            try {
              localStorage.setItem(HANDOFF_KEY, JSON.stringify({ id: session.saveId, at }));
            } catch {}
            setLocalSide(handoff);
            setHandoff(null);
          }}
        />
      );
    const view = session.views[localSide];
    if (!view) return <Opening label={lobby.vsBot ? "solo game" : "local game"} ready />;
    const sideName = (x: Side) => (x === "corp" ? "Corp" : "Runner");
    return (
      <Board
        session={session}
        engine={loaded.engine}
        db={loaded.db}
        side={localSide}
        view={view}
        handoffLog={handoffLog}
        onLeave={leave}
        onExit={exit}
        respond={
          responding?.by === localSide
            ? {
                done: `Done · back to the ${sideName(responding.back)}`,
                onClick: () => {
                  const back = responding.back;
                  setResponding(null);
                  setHandoff(back);
                },
              }
            : responder
              ? {
                  offer: `${sideName(responder)} may respond`,
                  onClick: () => {
                    setResponding({ by: responder, back: localSide });
                    setHandoff(responder);
                  },
                }
              : undefined
        }
      />
    );
  }

  if (lobby.role === "spectator") {
    const view = session.views.spectator;
    if (!view) return <Opening label={lobby.code || "game"} ready />;
    return <Board session={session} engine={loaded.engine} db={loaded.db} side={lobby.mySide} view={view} onSwitchSide={() => session.watchAs(otherSide(lobby.mySide))} onLeave={exit} onExit={exit} />;
  }

  const view = session.views[lobby.mySide];
  if (!view) return <Opening label={lobby.code || "game"} ready />;
  return <Board session={session} engine={loaded.engine} db={loaded.db} side={lobby.mySide} view={view} onLeave={leave} onExit={exit} onWatch={() => watch(lobby.code)} />;
}

function Opening({ label, ready }: { label: string; ready: boolean }) {
  const title = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  const tunnel = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useTilt(root);
  useEffect(() => {
    if (!title.current || motionOff()) return;
    animate(title.current, { transform: ["scale(2.6)", "scale(1)"], opacity: [0, 1], filter: ["blur(12px)", "blur(0px)"] }, { duration: 0.6, ease: [0.2, 0.9, 0.3, 1.05] });
  }, []);
  useEffect(() => {
    uiSound("ui_dive");
    return tunnel.current ? dive(tunnel.current, motionOff()) : undefined;
  }, []);
  useLoop(bar, { transform: ["translateX(-100%)", "translateX(250%)"] }, { duration: 0.9, ease: [0.6, 0, 0.4, 1] });
  return (
    <div class="opening" role="status" aria-live="polite" ref={root}>
      <canvas class="opening-dive" ref={tunnel} aria-hidden="true" />
      <span class="label">{ready ? "Jacking in" : "Loading engine"}</span>
      <span class="opening-title" ref={title} data-text={label}>
        {label}
      </span>
      <span class="opening-bar">
        <i ref={bar} />
      </span>
    </div>
  );
}

const currentBundle = (document.querySelector('script[type="module"][src*="assets/"]') as HTMLScriptElement | null)?.src.split("/").pop();

let openCredits: (() => void) | undefined;

function SettingsHost() {
  const open = useSettingsOpen();
  useBackClose(open, () => setSettingsOpen(false));
  return open ? <SettingsMenu onClose={() => setSettingsOpen(false)} onCredits={openCredits} /> : null;
}

function UpdateBanner() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !currentBundle) return;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const html = await (await fetch(`./?check=${Date.now()}`, { cache: "no-store" })).text();
        const latest = html.match(/assets\/(index-[^"]+\.js)/)?.[1];
        if (latest && latest !== currentBundle) setReady(true);
      } catch {}
    };
    check();
    const timer = setInterval(check, 2 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  if (!ready) return null;
  return (
    <div class="update-banner" role="status">
      <span>New version available</span>
      <button class="primary" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  );
}

const syncSettings = () => {
  applySettings();
  MotionGlobalConfig.skipAnimations = !settings.animations;
};
syncSettings();
onSettings(syncSettings);
installTips();
installCardPeek();
installMotion();
const lab = new URLSearchParams(location.search).has("fxgl");
if (lab) silence();
unlockSound();
if (!lab) {
  initMusic();
  installUiSounds();
  setMood("menu");
}
startEngineWorker();
render(
  lab ? (
    <>
      <FxGlLab />
      <UpdateBanner />
    </>
  ) : new URLSearchParams(location.search).has("animations") ? (
    <>
      <FxLab />
      <UpdateBanner />
    </>
  ) : (
    <>
      <App />
      <SettingsHost />
      <PeekHost />
      <UpdateBanner />
      <Dialogs />
    </>
  ),
  document.getElementById("app")!,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}
