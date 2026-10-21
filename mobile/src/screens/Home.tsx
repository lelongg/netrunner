import { useEffect, useRef, useState } from "preact/hooks";
import { type Role, type SavedGame, saveId } from "../session";
import type { CardDb, Side } from "../engine";
import { ask } from "../ui";
import { Icon } from "../icons";
import { SwipeDelete } from "./SwipeDelete";
import { motionOff, onSettings, settings } from "../settings";
import { HomeArena } from "./HomeModern";

export interface Props {
  ready: boolean;
  db?: CardDb;
  error?: string;
  initialJoin?: string;
  saves: SavedGame[];
  onResume: (save: SavedGame) => void;
  onDiscard: (save: SavedGame) => void;
  onStart: (role: Role, name: string, code?: string, vsBot?: boolean) => void;
  onGuide: () => void;
  onCredits: () => void;
  onFind: () => void;
  seeking: boolean;
  onHistory: (id?: string) => void;
  onDecks: (deckId?: string, side?: Side) => void;
}

export function describe(save: SavedGame) {
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

export function ago(ms: number) {
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

export function GameList({ saves, ready, onResume, onDiscard, onHistory }: Pick<Props, "saves" | "ready" | "onResume" | "onDiscard" | "onHistory">) {
  return (
    <ul class="game-list">
      {saves.map((save) => {
        const { title, detail, status } = describe(save);
        return (
          <li key={saveId(save)}>
            <SwipeDelete
              label="Delete"
              confirm={async () => {
                if (!(await ask({ title: "Delete this game?", body: `"${title}" is removed from this device and you will not be able to come back to it.`, ok: "Delete", danger: true }))) return false;
                onDiscard(save);
                return true;
              }}
            >
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
            </SwipeDelete>
          </li>
        );
      })}
    </ul>
  );
}

export function JoinCode({ ready, initial, onJoin }: { ready: boolean; initial?: string; onJoin: (code: string) => void }) {
  const [code, setCode] = useState(initial ?? "");
  const codeRest = useRef<HTMLSpanElement>(null);
  const [animations, setAnimations] = useState(settings.animations);
  useEffect(() => onSettings(() => setAnimations(settings.animations)), []);
  useScramble(codeRest, Math.max(0, 5 - code.length), animations);
  return (
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
      <button aria-label="Join game" disabled={!ready || code.trim().length < 5} onClick={() => onJoin(code.trim())}>
        <Icon name="arrow-right" />
      </button>
    </div>
  );
}

export const startGame = (onStart: Props["onStart"]) => (role: Role, c?: string, vsBot?: boolean) => onStart(role, storedName().trim() || "Player", c, vsBot);

export function Home(props: Props) {
  return <HomeArena {...props} />;
}
