import { useEffect, useRef, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { type WireDeck, defaultStored, latest } from "../decks";
import { lastDeck, setLastDeck } from "../session";
import { DeckSheet } from "./Lobby";
import { WaitRoom } from "./WaitRoom";
import { QrCode } from "../QrCode";
import { defaultDeck, problemIn } from "./DeckPicker";
import { DeckRow } from "./Decks";
import { Cta, Picker, Ticker } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { settings } from "../settings";
import { enablePush, notifying, pushSupported } from "../net/push";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat, dealtFormat, deckFormat } from "../deckrules";
import { type Matched, type OpenSeek, type PlayingGame, type Seek, type SeekSide, cancelSeek, checkSeek, pendingSeek, publicGames, seek, updateSeek } from "../net/match";

const SIDES: { key: SeekSide; label: string }[] = [
  { key: "corp", label: "Corp" },
  { key: "runner", label: "Runner" },
  { key: "any", label: "Any" },
];
const formatLabel = (f: string) => GAME_FORMATS.find((g) => g.key === f)?.label ?? f;
const yours = (theirs: SeekSide): SeekSide => (theirs === "corp" ? "runner" : theirs === "runner" ? "corp" : "any");
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

export function Match({ name, db, matchups, onMatched, onJoin, onWatch, onClose, onEditDecks }: { name: string; db: CardDb; matchups: Matchup[]; onMatched: (m: Matched) => void; onJoin: (code: string) => void; onWatch: (code: string) => void; onClose: () => void; onEditDecks?: (side: Side) => void }) {
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
  const [games, setGames] = useState<{ open: OpenSeek[]; playing: PlayingGame[] } | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (mine) return;
    let stop = false;
    const refresh = () => publicGames().then((g) => !stop && setGames(g), () => !stop && setGames((g) => g ?? { open: [], playing: [] }));
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [!!mine]);
  const listed = !!games && games.open.length + games.playing.length > 0;
  const browsing = !mine && !creating && listed;
  useBackClose(creating && listed && !mine, () => setCreating(false));
  const find = () =>
    act(async () => {
      commitDecks();
      const result = await seek(name, format, side, options());
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
        const again = await updateSeek(mine, mine.format, mine.side, { public: mine.public !== false, spectators: mine.spectators !== false });
        if ("status" in again) onMatched(again);
        else setMine(again);
      }
    });

  return (
    <>
      <Ticker>
        Play online{mine ? <span class="cyan"> waiting</span> : listed && <span class="cyan"> {games!.open.length} open</span>}
      </Ticker>
      <div class={`screen match ${mine ? "waiting" : ""}`}>
        <div class="match-bg" aria-hidden="true" />
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>PLAY ONLINE</h1>
        </header>

        {mine ? (
          <WaitRoom
            variant={localStorage.getItem("nsg.waitLayout") ?? "a"}
            code={mine.code}
            chips={
              <>
                <span class="chip">{formatLabel(mine.format)}</span>
                <span class={`chip side-${mine.side}`}>{sideLabel(mine.side)}</span>
                <span class="chip">{mine.public === false ? "Private" : "Public"}</span>
                <span class="chip">
                  <Icon name="eye" /> {mine.spectators === false ? "No spectators" : "Spectators"}
                </span>
                <span class="chip">{since(mine.at)}</span>
              </>
            }
            hint={`${mine.public === false ? "Only people with the code or the link can join. " : ""}The game stays open for 24 hours, even if you close the app.`}
            busy={busy}
            notify={!notify && pushSupported() ? turnOnNotifications : undefined}
            onCancel={stopSeeking}
          />
        ) : !mine && !games ? (
          <section class="panel section match-loading">
            <p class="hint">Looking for open games…</p>
          </section>
        ) : browsing ? (
          <>
            {games!.open.length > 0 && (
              <section class="match-open">
                <span class="label">
                  <i class="live-dot" aria-hidden="true" />
                  Open games
                </span>
                <ul class="match-list">
                  {games!.open.map((o) => (
                    <li>
                      <button class={`match-row you-${yours(o.side)}`} onClick={() => onJoin(o.code)}>
                        <span class="match-who">
                          <strong>{o.name}</strong>
                          <span class="match-chips">
                            <span class="chip">{formatLabel(o.format)}</span>
                            <span class={`chip side-${yours(o.side)}`}>{yours(o.side) === "any" ? "Either side" : `You play ${sideLabel(yours(o.side))}`}</span>
                          </span>
                        </span>
                        <span class="match-play">
                          Join
                          <Icon name="arrow-right" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {games!.playing.length > 0 && (
              <section class="match-open">
                <span class="label">
                  <Icon name="eye" />
                  Playing now
                </span>
                <ul class="match-list">
                  {games!.playing.map((g) => (
                    <li>
                      <button class="match-row" disabled={!g.spectators} onClick={() => onWatch(g.code)}>
                        <span class="match-who">
                          <strong>
                            {g.name} vs {g.opponent}
                          </strong>
                          <span class="match-chips">
                            <span class="chip">{formatLabel(g.format)}</span>
                            {g.watchers > 0 && <span class="chip">{g.watchers} watching</span>}
                          </span>
                        </span>
                        <span class="match-play">{g.spectators ? ["Watch", <Icon name="arrow-right" />] : "No spectators"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <Cta onClick={() => setCreating(true)}>Create a new game</Cta>
          </>
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
              (["corp", "runner"] as Side[]).map((s) => (
                <div class={`match-field ${side !== "any" && side !== s ? "unused" : ""}`} aria-disabled={side !== "any" && side !== s}>
                  <span class="label">{`${s === "corp" ? "Corp" : "Runner"} deck`}</span>
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
              {access === "public" ? "Find an opponent" : "Create a private game"}
            </Cta>
          </section>
        )}
        {error && <p class="error">{error}</p>}
        {choosing && <DeckSheet side={choosing} db={db} matchups={matchups} value={decks[choosing]} format={format} onPick={(d) => choose(choosing, d)} onEditDecks={onEditDecks && (() => onEditDecks(choosing))} onClose={() => setChoosing(null)} />}
      </div>
    </>
  );
}
