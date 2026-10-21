import { useEffect, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { type WireDeck, latest } from "../decks";
import { lastDeck, setLastDeck } from "../session";
import { DeckSheet } from "./Lobby";
import { defaultDeck, problemIn } from "./DeckPicker";
import { DeckRow } from "./Decks";
import { Cta, Picker, Ticker } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { settings } from "../settings";
import { enablePush, pushSupported } from "../net/push";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat, dealtFormat, deckFormat } from "../deckrules";
import { type Matched, type OpenSeek, type Seek, type SeekSide, acceptSeek, cancelSeek, checkSeek, openSeeks, pendingSeek, seek } from "../net/match";

const SIDES: { key: SeekSide; label: string }[] = [
  { key: "corp", label: "Corp" },
  { key: "runner", label: "Runner" },
  { key: "any", label: "Any" },
];
const formatLabel = (f: string) => GAME_FORMATS.find((g) => g.key === f)?.label ?? f;
const sideLabel = (s: SeekSide) => (s === "any" ? "Any side" : s === "corp" ? "Corp" : "Runner");
const yours = (theirs: SeekSide): SeekSide => (theirs === "corp" ? "runner" : theirs === "runner" ? "corp" : "any");

function since(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

function ago(at: number) {
  const min = Math.max(0, Math.round((Date.now() - at) / 60000));
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`;
}

function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [on]);
}

export function Match({ name, db, matchups, onMatched, onInvite, onClose }: { name: string; db: CardDb; matchups: Matchup[]; onMatched: (m: Matched) => void; onInvite: (format: GameFormat, side?: Side) => void; onClose: () => void }) {
  const [decks, setDecks] = useState<Record<Side, WireDeck | undefined>>(() => {
    const pick = (s: Side) => {
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
  useEffect(() => {
    if (dealtFormat(format)) return;
    const keep = (s: Side, d?: WireDeck) => (d && !problemIn(format, db, d) ? d : (defaultDeck(s, db, matchups, format) ?? d));
    setDecks((was) => ({ corp: keep("corp", was.corp), runner: keep("runner", was.runner) }));
  }, [format]);
  const [mine, setMine] = useState<Seek | null>(pendingSeek);
  const [open, setOpen] = useState<OpenSeek[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState(settings.notifications);
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
    let stop = false;
    const refresh = () => openSeeks().then((list) => !stop && setOpen(list), () => !stop && setOpen((o) => o ?? []));
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [mine?.id]);

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

  const find = () =>
    act(async () => {
      const result = await seek(name, format, side);
      if ("status" in result) onMatched(result);
      else setMine(result);
    });
  const take = (o: OpenSeek) => act(async () => onMatched(await acceptSeek(o.id, name)));
  const stopSeeking = () =>
    act(async () => {
      if (mine) await cancelSeek(mine);
      setMine(null);
    });
  const turnOnNotifications = () =>
    act(async () => {
      const problem = await enablePush();
      if (problem) throw new Error(problem);
      setNotify(true);
      if (mine) {
        await cancelSeek(mine).catch(() => {});
        const again = await seek(name, mine.format, mine.side);
        if ("status" in again) onMatched(again);
        else setMine(again);
      }
    });

  return (
    <>
      <Ticker>
        Play online <span class="cyan">{mine ? "searching" : `${open?.length ?? 0} open`}</span>
      </Ticker>
      <div class="screen match">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>PLAY ONLINE</h1>
        </header>

        {mine ? (
          <section class="panel section match-waiting">
            <span class="match-radar" aria-hidden="true">
              <i />
              <i />
              <i />
              <b />
            </span>
            <span class="match-title">Searching</span>
            <span class="match-chips">
              <span class="chip">{formatLabel(mine.format)}</span>
              <span class={`chip side-${mine.side}`}>{sideLabel(mine.side)}</span>
              <span class="chip">{since(mine.at)}</span>
            </span>
            <p class="hint">You can leave this screen or close the app: the search stays open for 24 hours.</p>
            {!notify && pushSupported() && (
              <button class="match-notify" disabled={busy} onClick={turnOnNotifications}>
                <Icon name="sound" />
                Notify me when someone joins
              </button>
            )}
            <button class="ghost match-stop" disabled={busy} onClick={stopSeeking}>
              Stop searching
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
              <div class="match-sides" role="radiogroup" aria-label="Play as">
                {SIDES.map((s) => (
                  <button role="radio" aria-checked={side === s.key} class={`side-${s.key} ${side === s.key ? "on" : ""}`} onClick={() => setSide(s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
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
              Find an opponent
            </Cta>
            <button class="match-invite" disabled={busy} onClick={() => onInvite(format, side === "any" ? undefined : side)}>
              <Icon name="share" />
              <span>
                <strong>Invite a friend</strong>
              </span>
              <Icon name="arrow-right" />
            </button>
          </section>
        )}
        {error && <p class="error">{error}</p>}
        {choosing && <DeckSheet side={choosing} db={db} matchups={matchups} value={decks[choosing]} format={format} onPick={(d) => choose(choosing, d)} onClose={() => setChoosing(null)} />}

        <section class="match-open">
          <div class="match-open-head">
            <span class="label">
              <i class="live-dot" aria-hidden="true" />
              Open games
            </span>
            <span class="label">{open?.length ?? "…"}</span>
          </div>
          {open && open.length === 0 && (
            <div class="match-empty">
              <Icon name="search" />
              <p>Nobody is waiting right now. Start a search and other players will see it here.</p>
            </div>
          )}
          <ul class="match-list">
            {(open ?? []).map((o) => (
              <li>
                <button class={`match-row you-${yours(o.side)}`} disabled={busy} onClick={() => take(o)}>
                  <span class="match-who">
                    <strong>{o.name}</strong>
                    <span class="match-chips">
                      <span class="chip">{formatLabel(o.format)}</span>
                      <span class={`chip side-${yours(o.side)}`}>{yours(o.side) === "any" ? "Either side" : `You play ${sideLabel(yours(o.side))}`}</span>
                    </span>
                    <small>{ago(o.created)}</small>
                  </span>
                  <span class="match-play">
                    Play
                    <Icon name="arrow-right" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
