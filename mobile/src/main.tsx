import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { type CardDb, type EngineApi, type Matchup, type Side, loadEngine } from "./engine";
import { Board } from "./game/Board";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { type Role, Session, newRoomCode } from "./session";
import "./styles.css";

const lang = navigator.language?.startsWith("fr") ? "fr" : "en";
const joinParam = new URLSearchParams(location.search).get("join")?.toUpperCase() ?? undefined;

function useSession(session: Session | null) {
  const [, setTick] = useState(0);
  useEffect(() => session?.subscribe(() => setTick((t) => t + 1)), [session]);
}

function App() {
  const [loaded, setLoaded] = useState<{ engine: EngineApi; db: CardDb; matchups: Matchup[] }>();
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<Session | null>(null);
  const [localSide, setLocalSide] = useState<Side>("corp");
  useSession(session);

  useEffect(() => {
    loadEngine(lang)
      .then(({ engine, db }) => setLoaded({ engine, db, matchups: engine.precons() }))
      .catch((e) => setError(`Impossible de charger le moteur : ${e}`));
  }, []);

  useEffect(() => {
    if (!session) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (session.lobby.started) e.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [session]);

  const leave = () => {
    session?.close();
    setSession(null);
    history.replaceState(null, "", location.pathname);
  };

  if (!session || !loaded) {
    return (
      <Home
        ready={!!loaded}
        error={error}
        initialJoin={joinParam}
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
  if (!view) return <p class="status">Synchronisation…</p>;
  return <Board session={session} engine={loaded.engine} db={loaded.db} side={lobby.mySide} view={view} onLeave={leave} />;
}

render(<App />, document.getElementById("app")!);
