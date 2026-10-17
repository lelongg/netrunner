import { Dialogs } from "./ui";
import { History } from "./screens/History";
import { Decks } from "./screens/Decks";
import { useBackClose } from "./back";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { animate } from "motion";
import { installTips } from "./tips";
import { installMotion, useLoop } from "./fx/ui";
import { startEngineWorker } from "./game/workerHost";
import { type CardDb, type EngineApi, type Matchup, type Side, loadEngine } from "./engine";
import { Board } from "./game/Board";
import { storeTicket, ticketFromHash } from "./net/relay";
import { basicCommands, promptOf, runCommands } from "./game/actions";
import { Handoff } from "./screens/Handoff";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { Guide } from "./screens/Guide";
import { fromPrecon, toWire } from "./decks";
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
const agentParam = new URLSearchParams(location.search).has("agent") || sessionStorage.getItem("nsg.agent") === "1";
if (agentParam) sessionStorage.setItem("nsg.agent", "1");
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
const OPENING_MIN_MS = 1000;

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
  const waitingFor = hotSeat && !canAct(session.views[localSide], localSide) && canAct(session.views[otherSide(localSide)], otherSide(localSide)) ? otherSide(localSide) : null;
  useEffect(() => {
    if (waitingFor && handoff !== waitingFor) setHandoff(waitingFor);
  }, [waitingFor]);
  const corpView = hotSeat ? session!.views.corp : null;
  const autoPass = !!corpView && !session!.pending && (corpView.run || corpView.encounters) && runnerPassed(corpView) && !corpDecision(corpView) && (promptOf(corpView, "corp")?.["prompt-type"] ?? "run") === "run" && runCommands(corpView, "corp").some((c) => c.command === "continue" && c.enabled !== false);
  useEffect(() => {
    if (autoPass) session!.send("continue", null, "corp");
  }, [autoPass, corpView?.log?.length, corpView?.run?.phase, corpView?.run?.position]);

  const [guide, setGuide] = useState(false);
  const [archive, setArchive] = useState<string | boolean>(false);
  const [decks, setDecks] = useState(false);
  const [sharedReplay, setSharedReplay] = useState(replayParam ? { code: replayParam, relay: replayRelay } : undefined);
  const [opening, setOpeningState] = useState<string | null>(joinParam ?? watchParam ?? gameParam?.replace(/^local:.*/, "local game") ?? null);
  const [held, setHeld] = useState<string | null>(null);
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
      .then(({ engine, db }) => setLoaded({ engine, db, matchups: engine.precons() }))
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

  if (decks && loaded && !session) return <Decks db={loaded.db} matchups={loaded.matchups} onClose={() => setDecks(false)} />;

  if ((archive || sharedReplay) && loaded && !session)
    return (
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
    );

  if (guide && loaded && !session)
    return (
      <Guide
        db={loaded.db}
        onClose={() => setGuide(false)}
        onPlay={(side) => {
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
    );

  if (!session || !loaded) {
    return (
      <Home
        onGuide={() => setGuide(true)}
        onHistory={(id) => setArchive(id ?? true)}
        onDecks={() => setDecks(true)}
        ready={!!loaded}
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
    return <Board session={session} engine={loaded.engine} db={loaded.db} side={localSide} view={view} handoffLog={handoffLog} onSwitchSide={() => setHandoff(otherSide(localSide))} onLeave={leave} onExit={exit} />;
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
  useEffect(() => {
    if (!title.current || motionOff()) return;
    animate(title.current, { transform: ["translateX(-60px) skewX(-20deg)", "translateX(0) skewX(0deg)"], opacity: [0, 1] }, { duration: 0.45, ease: [0.2, 0.9, 0.3, 1.1] });
  }, []);
  useLoop(bar, { transform: ["translateX(-100%)", "translateX(250%)"] }, { duration: 0.9, ease: [0.6, 0, 0.4, 1] });
  return (
    <div class="opening" role="status" aria-live="polite">
      <span class="label">{ready ? "Opening" : "Loading engine"}</span>
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

function UpdateBanner() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !currentBundle) return;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const html = await (await fetch("./", { cache: "no-store" })).text();
        const latest = html.match(/assets\/(index-[^"]+\.js)/)?.[1];
        if (latest && latest !== currentBundle) setReady(true);
      } catch {}
    };
    check();
    const timer = setInterval(check, 5 * 60 * 1000);
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
installMotion();
startEngineWorker();
render(
  <>
    <App />
    <UpdateBanner />
    <Dialogs />
  </>,
  document.getElementById("app")!,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}
