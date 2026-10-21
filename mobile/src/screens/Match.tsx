import { useEffect, useRef, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { type WireDeck, defaultStored, latest } from "../decks";
import { lastDeck, setLastDeck } from "../session";
import { DeckSheet, shareLink } from "./Lobby";
import { QrCode } from "../QrCode";
import { defaultDeck, problemIn } from "./DeckPicker";
import { DeckRow } from "./Decks";
import { Cta, Picker, Ticker } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { settings } from "../settings";
import { enablePush, notifying, pushSupported } from "../net/push";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat, dealtFormat, deckFormat } from "../deckrules";
import { type Matched, type Seek, type SeekSide, cancelSeek, checkSeek, pendingSeek, seek, updateSeek } from "../net/match";

const SIDES: { key: SeekSide; label: string }[] = [
  { key: "corp", label: "Corp" },
  { key: "runner", label: "Runner" },
  { key: "any", label: "Any" },
];
const formatLabel = (f: string) => GAME_FORMATS.find((g) => g.key === f)?.label ?? f;
const sideLabel = (s: SeekSide) => (s === "any" ? "Any side" : s === "corp" ? "Corp" : "Runner");

function since(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [on]);
}

function InviteTile({ code }: { code?: string }) {
  const [copied, setCopied] = useState(false);
  const link = code ? shareLink(code) : "";
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Netrunner game", text: `Code: ${code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {}
  };
  return (
    <div class="invite-tile">
      {code ? <QrCode value={link} label={`QR code to join game ${code}`} /> : <div class="qr qr-pending" />}
      <div class="invite-side">
        <span class="label">Game code</span>
        <span class="code">{code || "·····"}</span>
        <Cta onClick={share} disabled={!code} tone="cyan">
          {copied ? "Copied" : "Share"}
        </Cta>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="match-sides" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button role="radio" aria-checked={value === o.key} class={`side-${o.key} ${value === o.key ? "on" : ""}`} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Match({ name, db, matchups, onMatched, onClose, onEditDecks, autoStart, onAutoStarted }: { name: string; db: CardDb; matchups: Matchup[]; onMatched: (m: Matched) => void; onClose: () => void; onEditDecks?: (side: Side) => void; autoStart?: boolean; onAutoStarted?: () => void }) {
  const [decks, setDecks] = useState<Record<Side, WireDeck | undefined>>(() => {
    const pick = (s: Side) => {
      const pinned = defaultStored(s);
      if (pinned) return { name: pinned.name, identity: pinned.identity, cards: pinned.cards, ref: pinned.id };
      const d = lastDeck(s);
      return d && latest(d, s);
    };
    return { corp: pick("corp"), runner: pick("runner") };
  });
  const [choosing, setChoosing] = useState<Side | null>(null);
  const choose = (s: Side, d: WireDeck) => {
    setLastDeck(s, d);
    setDecks((was) => ({ ...was, [s]: d }));
  };
  const [format, setFormat] = useState<GameFormat>(settings.format);
  const [side, setSide] = useState<SeekSide>("any");
  const [access, setAccess] = useState<"public" | "private">("public");
  const [spectators, setSpectators] = useState<"on" | "off">("on");
  const options = () => ({ public: access === "public", spectators: spectators === "on" });
  useEffect(() => {
    if (dealtFormat(format)) return;
    const keep = (s: Side, d?: WireDeck) => (d && !problemIn(format, db, d) ? d : (defaultDeck(s, db, matchups, format) ?? d));
    setDecks((was) => ({ corp: keep("corp", was.corp), runner: keep("runner", was.runner) }));
  }, [format]);
  const [mine, setMine] = useState<Seek | null>(pendingSeek);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState(() => notifying("match"));
  useBackClose(true, onClose);
  useTick(!!mine);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!mine) return;
    let stop = false;
    const poll = async () => {
      const result = await checkSeek(mine).catch(() => "waiting" as const);
      if (stop) return;
      if (result === "expired") setMine(null);
      else if (result !== "waiting") onMatched(result);
    };
    const timer = setInterval(poll, 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [mine?.id]);

  const commitDecks = () => {
    for (const s of ["corp", "runner"] as Side[]) if (decks[s]) setLastDeck(s, decks[s]!);
  };
  const [editing, setEditing] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (!autoStart || started.current || mine) return;
    started.current = true;
    onAutoStarted?.();
    find();
  }, []);
  const find = () =>
    act(async () => {
      commitDecks();
      const result = mine ? await updateSeek(mine, format, side, options()) : await seek(name, format, side, options());
      setEditing(false);
      if ("status" in result) onMatched(result);
      else setMine(result);
    });
  const stopSeeking = () =>
    act(async () => {
      if (mine) await cancelSeek(mine);
      setMine(null);
    });
  const turnOnNotifications = () =>
    act(async () => {
      const problem = await enablePush("match");
      if (problem) throw new Error(problem);
      setNotify(true);
      if (mine) {
        await cancelSeek(mine).catch(() => {});
        const again = await seek(name, mine.format, mine.side, { public: mine.public !== false, spectators: mine.spectators !== false });
        if ("status" in again) onMatched(again);
        else setMine(again);
      }
    });

  return (
    <>
      <Ticker>
        Play online{mine && <span class="cyan"> waiting</span>}
      </Ticker>
      <div class="screen match">
        <div class="match-bg" aria-hidden="true" />
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>PLAY ONLINE</h1>
        </header>

        {mine && !editing ? (
          <section class="panel section match-waiting">
            <div class="match-wait-head">
              <span class="match-radar" aria-hidden="true">
                <i />
                <i />
                <i />
                <b />
              </span>
              <div>
                <span class="match-title">Waiting for an opponent</span>
                <span class="match-chips">
                  <span class="chip">{formatLabel(mine.format)}</span>
                  <span class={`chip side-${mine.side}`}>{sideLabel(mine.side)}</span>
                  <span class="chip">{mine.public === false ? "Private" : "Public"}</span>
                  <span class="chip">
                    <Icon name="eye" /> {mine.spectators === false ? "No spectators" : "Spectators"}
                  </span>
                  <span class="chip">{since(mine.at)}</span>
                </span>
              </div>
            </div>
            <InviteTile code={mine.code} />
            <p class="hint">{mine.public === false && "Only people with the code or the link can join. "}The game stays open for 24 hours, even if you close the app.</p>
            {!notify && pushSupported() && (
              <button class="match-notify" disabled={busy} onClick={turnOnNotifications}>
                <Icon name="sound" />
                Notify me when someone joins
              </button>
            )}
            <button
              class="match-edit"
              disabled={busy}
              onClick={() => {
                setFormat(mine.format);
                setSide(mine.side);
                setAccess(mine.public === false ? "private" : "public");
                setSpectators(mine.spectators === false ? "off" : "on");
                setEditing(true);
              }}
            >
              <Icon name="edit" /> Change the game settings
            </button>
            <button class="match-stop" disabled={busy} onClick={stopSeeking}>
              <Icon name="close" />
              Cancel the game
            </button>
          </section>
        ) : (
          <section class="panel section match-form">
            <div class="match-field">
              <span class="label">Format</span>
              <Picker title="Format" value={format} onChange={setFormat} options={GAME_FORMATS.map((f) => ({ key: f.key as GameFormat, label: f.label, hint: FORMAT_DESC[f.key as GameFormat] }))} />
            </div>
            <div class="match-field">
              <span class="label">Play as</span>
              <Segmented label="Play as" value={side} options={SIDES} onChange={setSide} />
            </div>
            <div class="match-field">
              <span class="label">Who can join</span>
              <Segmented
                label="Who can join"
                value={access}
                options={[
                  { key: "public", label: "Anyone" },
                  { key: "private", label: "Invite only" },
                ]}
                onChange={setAccess}
              />
            </div>
            <div class="match-field">
              <span class="label">Spectators</span>
              <Segmented
                label="Spectators"
                value={spectators}
                options={[
                  { key: "on", label: "Allowed" },
                  { key: "off", label: "Off" },
                ]}
                onChange={setSpectators}
              />
            </div>
            {!dealtFormat(format) &&
              (side === "any" ? (["corp", "runner"] as Side[]) : [side as Side]).map((s) => (
                <div class="match-field">
                  <span class="label">{side === "any" ? `${s === "corp" ? "Corp" : "Runner"} deck` : "Deck"}</span>
                  {decks[s] ? (
                    <ul class="deck-library match-deck">
                      <DeckRow db={db} stored={decks[s]!} format={deckFormat(format) ?? "casual"} onOpen={() => setChoosing(s)} issuesOnly />
                    </ul>
                  ) : (
                    <button class="match-deck-empty" onClick={() => setChoosing(s)}>
                      Choose a {s === "corp" ? "Corp" : "Runner"} deck
                    </button>
                  )}
                </div>
              ))}
            <Cta onClick={find} disabled={busy}>
              {editing ? "Update the game" : access === "public" ? "Find an opponent" : "Create a private game"}
            </Cta>
            {editing && (
              <button class="ghost match-cancel-edit" disabled={busy} onClick={() => setEditing(false)}>
                Keep the current game
              </button>
            )}
          </section>
        )}
        {error && <p class="error">{error}</p>}
        {choosing && <DeckSheet side={choosing} db={db} matchups={matchups} value={decks[choosing]} format={format} onPick={(d) => choose(choosing, d)} onEditDecks={onEditDecks && (() => onEditDecks(choosing))} onClose={() => setChoosing(null)} />}
      </div>
    </>
  );
}
