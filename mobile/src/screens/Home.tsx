import { useState } from "preact/hooks";
import type { Role, SavedGame } from "../session";
import { Cta, Ticker } from "../ui";

interface Props {
  ready: boolean;
  error?: string;
  initialJoin?: string;
  save: SavedGame | null;
  onResume: () => void;
  onDiscard: () => void;
  onStart: (role: Role, name: string, code?: string) => void;
}

const ROLE_LABEL: Record<Role, string> = { host: "hosted", guest: "joined", local: "local" };
const NAME_KEY = "nsg.name";

function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Home({ ready, error, initialJoin, save, onResume, onDiscard, onStart }: Props) {
  const [name, setName] = useState(storedName() || "Player");
  const [code, setCode] = useState(initialJoin ?? "");
  const go = (role: Role, c?: string) => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* storage unavailable */
    }
    onStart(role, name.trim() || "Player", c);
  };
  return (
    <>
      <Ticker>
        Engine <span class={ready ? "cyan" : "yellow"}>{ready ? "ready" : error ? "offline" : "loading"}</span>
      </Ticker>
      <div class="screen home">
        <section class="panel hero">
          <div class="row">
            <span class="label">Netrunner // mobile</span>
            <span class="label">P2P</span>
          </div>
          <h1 style="margin: 0; display: flex; flex-direction: column">
            <span class="big">NULL</span>
            <span class="big outline">SIGNAL</span>
          </h1>
          <p>The Jinteki engine in your pocket. No server: one player hosts, the other connects.</p>
        </section>

        {error && <p class="error">{error}</p>}

        {save && (
          <section class="panel cyan section">
            <div class="row">
              <span class="label cyan">Game in progress</span>
              <span class="label">{save.code}</span>
            </div>
            <p class="hint">
              {ROLE_LABEL[save.role]} game{save.role !== "guest" ? ` · ${save.log.length} actions` : ""}
            </p>
            <Cta onClick={onResume} disabled={!ready}>
              Resume
            </Cta>
            <button class="ghost" onClick={onDiscard}>
              Discard save
            </button>
          </section>
        )}

        <label class="field">
          <span class="label">Handle</span>
          <input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} maxLength={24} />
        </label>

        <Cta onClick={() => go("host")} disabled={!ready}>
          Host a game
        </Cta>

        <div class="field">
          <span class="label">Join</span>
          <div class="join-row">
            <label class="prompt-input">
              <input
                aria-label="Game code"
                placeholder="game code"
                value={code}
                maxLength={5}
                onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
              />
            </label>
            <button aria-label="Join game" disabled={!ready || code.trim().length < 5} onClick={() => go("guest", code.trim())}>
              →
            </button>
          </div>
        </div>

        <button class="primary" disabled={!ready} onClick={() => go("local")}>
          Local game · 2 players, 1 device
        </button>

        <div class="footer">
          <span>Engine: Jinteki · MIT</span>
          <span>Cards: NetrunnerDB</span>
        </div>
      </div>
    </>
  );
}
