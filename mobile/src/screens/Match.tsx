import { useEffect, useState } from "preact/hooks";
import { Cta, Picker, Ticker } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { settings } from "../settings";
import { pushSupported } from "../net/push";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat } from "../deckrules";
import { type Matched, type OpenSeek, type Seek, type SeekSide, acceptSeek, cancelSeek, checkSeek, openSeeks, pendingSeek, seek } from "../net/match";

const SIDES: { key: SeekSide; label: string }[] = [
  { key: "corp", label: "Corp" },
  { key: "runner", label: "Runner" },
  { key: "any", label: "Any" },
];
const formatLabel = (f: string) => GAME_FORMATS.find((g) => g.key === f)?.label ?? f;
const wants = (side: SeekSide) => (side === "any" ? "either side" : side === "corp" ? "Corp" : "Runner");

function ago(at: number) {
  const min = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (min < 1) return "now";
  if (min < 60) return `${min} min`;
  return `${Math.round(min / 60)} h`;
}

export function Match({ name, onMatched, onClose }: { name: string; onMatched: (m: Matched) => void; onClose: () => void }) {
  const [format, setFormat] = useState<GameFormat>(settings.format);
  const [side, setSide] = useState<SeekSide>("any");
  const [mine, setMine] = useState<Seek | null>(pendingSeek);
  const [open, setOpen] = useState<OpenSeek[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBackClose(true, onClose);

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

  const start = () =>
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

  return (
    <>
      <Ticker>
        Matchmaking <span class="cyan">{mine ? "searching" : "online"}</span>
      </Ticker>
      <div class="screen match">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>FIND A GAME</h1>
        </header>

        {mine ? (
          <section class="panel section match-waiting">
            <span class="match-radar" aria-hidden="true">
              <i />
              <i />
            </span>
            <span class="label">Looking for an opponent</span>
            <strong>
              {formatLabel(mine.format)} · {wants(mine.side)}
            </strong>
            <p class="hint">
              {settings.notifications
                ? "You can close the app: you will get a notification when someone joins."
                : pushSupported()
                  ? "Turn on notifications in Settings to be told when someone joins while the app is closed."
                  : "Keep the app open, the search continues for 24 hours."}
            </p>
            <button disabled={busy} onClick={stopSeeking}>
              Stop searching
            </button>
          </section>
        ) : (
          <section class="panel section match-form">
            <div class="setting-field">
              <span class="label">Format</span>
              <Picker title="Format" value={format} onChange={setFormat} options={GAME_FORMATS.map((f) => ({ key: f.key as GameFormat, label: f.label, hint: FORMAT_DESC[f.key as GameFormat] }))} />
            </div>
            <span class="label">Play as</span>
            <div class="side-switch match-sides" role="radiogroup">
              {SIDES.map((s) => (
                <button role="radio" aria-checked={side === s.key} class={`${side === s.key ? "on" : ""} ${s.key}`} onClick={() => setSide(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
            <Cta onClick={start} disabled={busy}>
              Search
            </Cta>
          </section>
        )}
        {error && <p class="error">{error}</p>}

        <section class="match-open">
          <span class="label">Open games · {open?.length ?? "…"}</span>
          {open && open.length === 0 && <p class="hint">Nobody is waiting right now. Start a search and others will see it here.</p>}
          <ul class="match-list">
            {(open ?? []).map((o) => (
              <li>
                <button class="match-row" disabled={busy} onClick={() => take(o)}>
                  <span class="match-who">
                    <strong>{o.name}</strong>
                    <span class="hint">
                      {formatLabel(o.format)} · wants {wants(o.side)} · {ago(o.created)}
                    </span>
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
