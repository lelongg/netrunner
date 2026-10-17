import { useEffect, useRef, useState } from "preact/hooks";
import { type Role, type SavedGame, saveId } from "../session";
import { Cta, Ticker, ask } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { SettingsMenu } from "./SettingsMenu";
import { motionOff, onSettings, settings } from "../settings";

interface Props {
  ready: boolean;
  error?: string;
  initialJoin?: string;
  saves: SavedGame[];
  onResume: (save: SavedGame) => void;
  onDiscard: (save: SavedGame) => void;
  onStart: (role: Role, name: string, code?: string, vsBot?: boolean) => void;
  onGuide: () => void;
  onHistory: (id?: string) => void;
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

function useScramble(rest: { current: HTMLSpanElement | null }, left: number, animate: boolean) {
  useEffect(() => {
    const el = rest.current;
    if (!el) return;
    if (!animate || motionOff()) {
      el.textContent = "·".repeat(left);
      return;
    }
    let chars = Array.from({ length: left }, randomChar);
    el.textContent = chars.join("");
    const timer = setInterval(() => {
      chars = chars.map((c) => (Math.random() < 0.45 ? randomChar() : c));
      el.textContent = chars.join("");
    }, 70);
    return () => clearInterval(timer);
  }, [left, animate]);
}

function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Home({ ready, error, initialJoin, saves, onResume, onDiscard, onStart, onGuide, onHistory }: Props) {
  const [code, setCode] = useState(initialJoin ?? "");
  const codeRest = useRef<HTMLSpanElement>(null);
  const [animations, setAnimations] = useState(settings.animations);
  useEffect(() => onSettings(() => setAnimations(settings.animations)), []);
  useScramble(codeRest, Math.max(0, 5 - code.length), animations);
  const [menu, setMenu] = useState(false);
  useBackClose(menu, () => setMenu(false));
  const go = (role: Role, c?: string, vsBot?: boolean) => {
    onStart(role, storedName().trim() || "Player", c, vsBot);
  };
  return (
    <>
      <Ticker
        action={
          <button class="ticker-menu" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
            <Icon name={menu ? "close" : "menu"} />
            <span>{menu ? "Close" : "Menu"}</span>
          </button>
        }
      >
        Engine <span class={ready ? "cyan" : "yellow"}>{ready ? "ready" : error ? "offline" : "loading"}</span>
      </Ticker>
      {menu && <SettingsMenu onClose={() => setMenu(false)} />}
      <div class="screen home">
        <section class="panel hero">
          <div class="row">
            <span class="label">For Netrunner</span>
            <button class="ghost hero-history" disabled={!ready} onClick={() => onHistory()}>
              <Icon name="history" /> History
            </button>
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
                    <button class="game-row" disabled={!ready} onClick={() => (save.summary?.winner ? onHistory(saveId(save)) : onResume(save))}>
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
                      onClick={async () => {
                        if (await ask({ title: "Delete this game?", body: `"${title}" is removed from this device and you will not be able to come back to it.`, ok: "Delete", danger: true })) onDiscard(save);
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

        <Cta onClick={() => go("host")} disabled={!ready}>
          Create a game
        </Cta>

        <div class="field">
          <span class="label">Join</span>
          <div class="join-row">
            <label class="prompt-input">
              <span class="code-field">
                <input aria-label="Game code" value={code} maxLength={5} spellcheck={false} autocapitalize="characters" onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())} />
                <span class="code-ghost" aria-hidden="true">
                  <span class="code-typed">{code}</span>
                  <span ref={codeRest} />
                </span>
              </span>
            </label>
            <button aria-label="Join game" disabled={!ready || code.trim().length < 5} onClick={() => go("guest", code.trim())}>
              <Icon name="arrow-right" />
            </button>
          </div>
        </div>

        <button class="primary" disabled={!ready} onClick={onGuide}>
          How to play
        </button>

        <div class="home-modes">
          <button disabled={!ready} onClick={() => go("local", undefined, true)}>
            Solo
          </button>
          <button disabled={!ready} onClick={() => go("local")}>
            Local game
          </button>
        </div>

        <div class="footer">
          <span>Engine: Jinteki · MIT</span>
          <span>Cards: NetrunnerDB</span>
          <span>Not affiliated with Null Signal Games</span>
        </div>
      </div>
    </>
  );
}
