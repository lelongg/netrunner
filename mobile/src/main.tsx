import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { animate } from "motion";
import { installMotion, useLoop } from "./fx/ui";
import { type CardDb, type EngineApi, type Matchup, type Side, loadEngine } from "./engine";
import { Board } from "./game/Board";
import { storeTicket, ticketFromHash } from "./net/relay";
import { basicCommands, promptOf, runCommands } from "./game/actions";
import { Handoff } from "./screens/Handoff";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { type Role, type SavedGame, Session, clearSave, listSaves, loadSave, newRoomCode, saveId } from "./session";
import "./styles.css";
import "./fx/fx.css";

const joinParam = new URLSearchParams(location.search).get("join")?.toUpperCase() ?? undefined;
const gameParam = new URLSearchParams(location.search).get("game") ?? undefined;
const seatFromLink = joinParam ? ticketFromHash(joinParam, location.hash) : undefined;
if (seatFromLink) storeTicket(seatFromLink);
const autopilotParam = new URLSearchParams(location.search).has("autopilot");
const agentParam = new URLSearchParams(location.search).has("agent") || sessionStorage.getItem("nsg.agent") === "1";
if (agentParam) sessionStorage.setItem("nsg.agent", "1");
if (joinParam) history.replaceState(null, "", location.pathname);

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

function App() {
  const [loaded, setLoaded] = useState<{ engine: EngineApi; db: CardDb; matchups: Matchup[] }>();
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<Session | null>(null);
  const [localSide, setLocalSide] = useState<Side>("corp");
  const [handoff, setHandoff] = useState<Side | null>(null);
  const [handoffLog, setHandoffLog] = useState(0);
  const [saves, setSaves] = useState<SavedGame[]>(() => listSaves());
  useSession(session);
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

  const [opening, setOpening] = useState<string | null>(joinParam ?? gameParam?.replace(/^local:.*/, "local game") ?? null);
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

  const exit = () => {
    session?.close();
    setSession(null);
    setSaves(listSaves());
  };

  if (opening && !session && !error) return <Opening label={opening} ready={!!loaded} />;

  if (!session || !loaded) {
    return (
      <Home
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
          setOpening(role === "guest" && code ? code : role === "host" ? "new game" : vsBot ? "solo game" : "local game");
          afterPaint(() => {
            const next = new Session(loaded.engine, loaded.db, role, role === "local" ? newRoomCode() : code, name);
            if (vsBot) next.enableBot();
            setSession(next);
            setLocalSide("corp");
            setOpening(null);
          });
        }}
      />
    );
  }

  const { lobby } = session;
  if (!lobby.started) return <Lobby session={session} db={loaded.db} matchups={loaded.matchups} onLeave={leave} />;

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
    if (!view) return null;
    return <Board session={session} engine={loaded.engine} db={loaded.db} side={localSide} view={view} handoffLog={handoffLog} onSwitchSide={() => setHandoff(otherSide(localSide))} onLeave={leave} onExit={exit} />;
  }

  const view = session.views[lobby.mySide];
  if (!view) return <p class="status">Syncing…</p>;
  return <Board session={session} engine={loaded.engine} db={loaded.db} side={lobby.mySide} view={view} onLeave={leave} onExit={exit} />;
}

function Opening({ label, ready }: { label: string; ready: boolean }) {
  const title = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!title.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(title.current, { x: [-60, 0], skewX: [-20, 0], opacity: [0, 1], letterSpacing: ["0.5em", "0.02em"] }, { type: "spring", visualDuration: 0.5, bounce: 0.25 });
  }, []);
  useLoop(bar, { x: ["-100%", "250%"] }, { duration: 0.9, ease: [0.6, 0, 0.4, 1] });
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

installMotion();
render(
  <>
    <App />
    <UpdateBanner />
  </>,
  document.getElementById("app")!,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}
