import { useEffect, useRef, useState } from "preact/hooks";
import { type Role, type SavedGame, saveId } from "../session";
import { Cta, Ticker } from "../ui";
import { Icon } from "../icons";

interface Props {
  ready: boolean;
  error?: string;
  initialJoin?: string;
  saves: SavedGame[];
  onResume: (save: SavedGame) => void;
  onDiscard: (save: SavedGame) => void;
  onStart: (role: Role, name: string, code?: string, vsBot?: boolean) => void;
}

function describe(save: SavedGame) {
  const sum = save.summary;
  const local = save.v === 1;
  const title = local ? (save.vsBot ? `Solo vs bot` : "Local game") : `vs ${sum?.opponent ?? "…"}`;
  const bits: string[] = [];
  if (sum?.side && !(local && !save.vsBot)) bits.push(sum.side);
  if (sum?.turn) bits.push(`turn ${sum.turn}`);
  if (sum?.points) bits.push(`${sum.points[0]}–${sum.points[1]}`);
  if (!sum?.turn) bits.push(local ? `${save.log.length} actions` : "in lobby");
  const status = sum?.winner ? (sum.winner === sum.side ? "Won" : "Lost") : sum?.turn && sum.myMove && !(local && !save.vsBot) ? "Your move" : undefined;
  return { title, detail: bits.join(" · "), status };
}

function ago(ms: number) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}
const NAME_KEY = "nsg.name";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomChar = () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];

function useScramble(input: { current: HTMLInputElement | null }, active: boolean) {
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    if (!active || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.placeholder = "·····";
      return;
    }
    let chars = Array.from({ length: 5 }, randomChar);
    const timer = setInterval(() => {
      chars = chars.map((c) => (Math.random() < 0.45 ? randomChar() : c));
      el.placeholder = chars.join("");
    }, 70);
    return () => clearInterval(timer);
  }, [active]);
}

function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Home({ ready, error, initialJoin, saves, onResume, onDiscard, onStart }: Props) {
  const [name, setName] = useState(storedName() || "Player");
  const [code, setCode] = useState(initialJoin ?? "");
  const codeInput = useRef<HTMLInputElement>(null);
  useScramble(codeInput, !code);
  const go = (role: Role, c?: string, vsBot?: boolean) => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* storage unavailable */
    }
    onStart(role, name.trim() || "Player", c, vsBot);
  };
  return (
    <>
      <Ticker>
        Engine <span class={ready ? "cyan" : "yellow"}>{ready ? "ready" : error ? "offline" : "loading"}</span>
      </Ticker>
      <div class="screen home">
        <section class="panel hero">
          <div class="row">
            <span class="label">For Netrunner</span>
          </div>
          <h1 style="margin: 0; display: flex; flex-direction: column">
            <span class="big">POCKET</span>
            <span class="big outline">RIG</span>
          </h1>
        </section>

        {error && <p class="error">{error}</p>}

        {saves.length > 0 && (
          <section class="panel cyan section games">
            <span class="label cyan">Your games</span>
            <ul class="game-list">
              {saves.map((save) => {
                const { title, detail, status } = describe(save);
                return (
                  <li key={saveId(save)}>
                    <button class="game-row" disabled={!ready} onClick={() => onResume(save)}>
                      <span class="game-main">
                        <span class="game-title">{title}</span>
                        <span class="game-detail">{detail}</span>
                      </span>
                      <span class="game-meta">
                        {status && <span class={status === "Your move" ? "yellow" : status === "Won" ? "cyan" : "red"}>{status}</span>}
                        <span>{save.v === 2 ? save.code : ago(save.savedAt)}</span>
                      </span>
                      <Icon name="arrow-right" />
                    </button>
                    <button
                      class="ghost game-delete"
                      aria-label={`Delete ${title}`}
                      onClick={() => {
                        if (confirm(`Delete "${title}" from this device?`)) onDiscard(save);
                      }}
                    >
                      <Icon name="close" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <label class="field">
          <span class="label">Handle</span>
          <input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} maxLength={24} />
        </label>

        <Cta onClick={() => go("host")} disabled={!ready}>
          Create a game
        </Cta>

        <div class="field">
          <span class="label">Join</span>
          <div class="join-row">
            <label class="prompt-input">
              <input
                aria-label="Game code"
                ref={codeInput}
                placeholder="·····"
                value={code}
                maxLength={5}
                onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
              />
            </label>
            <button aria-label="Join game" disabled={!ready || code.trim().length < 5} onClick={() => go("guest", code.trim())}>
              <Icon name="arrow-right" />
            </button>
          </div>
          <button class="ghost watch-btn" disabled={!ready || code.trim().length < 5} onClick={() => go("spectator", code.trim())}>
            Watch this game instead
          </button>
        </div>

        <button class="primary" disabled={!ready} onClick={() => go("local", undefined, true)}>
          Solo · play vs the bot
        </button>

        <button disabled={!ready} onClick={() => go("local")}>
          Local game · 2 players, 1 device
        </button>

        <div class="footer">
          <span>Engine: Jinteki · MIT</span>
          <span>Cards: NetrunnerDB</span>
          <span>Not affiliated with Null Signal Games</span>
        </div>
      </div>
    </>
  );
}
