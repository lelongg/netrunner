import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { type CardDb, type EngineApi, type Matchup, type Side, loadEngine } from "./engine";
import { Board } from "./game/Board";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { type Role, type SavedGame, Session, clearSave, loadSave, newRoomCode } from "./session";
import "./styles.css";

const joinParam = new URLSearchParams(location.search).get("join")?.toUpperCase() ?? undefined;
if (joinParam) history.replaceState(null, "", location.pathname);

function useSession(session: Session | null) {
  const [, setTick] = useState(0);
  useEffect(() => session?.subscribe(() => setTick((t) => t + 1)), [session]);
}

function App() {
  const [loaded, setLoaded] = useState<{ engine: EngineApi; db: CardDb; matchups: Matchup[] }>();
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<Session | null>(null);
  const [localSide, setLocalSide] = useState<Side>("corp");
  const [save, setSave] = useState<SavedGame | null>(() => loadSave());
  useSession(session);

  const resume = (from: SavedGame) => {
    if (!loaded) return;
    setSession(Session.resume(loaded.engine, loaded.db, from));
    setLocalSide(from.role === "guest" ? "corp" : from.mySide);
  };

  useEffect(() => {
    if (loaded && save && !session && (!joinParam || joinParam === save.code)) resume(save);
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
    setSave(null);
    history.replaceState(null, "", location.pathname);
  };

  if (!session || !loaded) {
    return (
      <Home
        ready={!!loaded}
        error={error}
        initialJoin={joinParam}
        save={joinParam && joinParam !== save?.code ? null : save}
        onResume={() => save && resume(save)}
        onDiscard={() => {
          clearSave();
          setSave(null);
        }}
        onStart={(role: Role, name: string, code?: string) => {
          if (!loaded) return;
          setSession(new Session(loaded.engine, loaded.db, role, code ?? newRoomCode(), name));
          setLocalSide("corp");
        }}
      />
    );
  }

  const { lobby } = session;
  if (!lobby.started) return <Lobby session={session} db={loaded.db} matchups={loaded.matchups} onLeave={leave} />;

  if (lobby.role === "local") {
    const view = session.views[localSide];
    if (!view) return null;
    return (
      <Board
        session={session}
        engine={loaded.engine}
        db={loaded.db}
        side={localSide}
        view={view}
        onSwitchSide={() => setLocalSide(localSide === "corp" ? "runner" : "corp")}
        onLeave={leave}
      />
    );
  }

  const view = session.views[lobby.mySide];
  if (!view) return <p class="status">Syncing…</p>;
  return <Board session={session} engine={loaded.engine} db={loaded.db} side={lobby.mySide} view={view} onLeave={leave} />;
}

render(<App />, document.getElementById("app")!);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}
