import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { animate } from "motion";
import { motionOff } from "../settings";
import { useLoop } from "../fx/ui";
import type { CardDb, Matchup, Side } from "../engine";
import { type WireDeck, fromWire } from "../decks";
import type { Session } from "../session";
import { QrCode } from "../QrCode";
import { relayUrl } from "../net/relay";
import { Cta, Picker, Ticker } from "../ui";
import { DeckPicker, defaultDeck } from "./DeckPicker";
import { DeckRow, Decks, DeckView } from "./Decks";
import { useBackClose } from "../back";
import { Icon } from "../icons";
import { type GameFormat, FORMAT_DESC, GAME_FORMATS, analyze, dealtFormat, deckFormat } from "../deckrules";
import { uiSound } from "../uisound";

const FORMAT_HINT: Partial<Record<GameFormat, string>> = {
  preconstructed: "Preconstructed decks only.",
};

function FormatPicker({ value, onChange }: { value: GameFormat; onChange?: (f: GameFormat) => void }) {
  const label = GAME_FORMATS.find((f) => f.key === value)?.label;
  return (
    <section class="format-pick">
      <span class="label">Format</span>
      {onChange ? (
        <Picker title="Game format" value={value} onChange={onChange} options={GAME_FORMATS.map((f) => ({ key: f.key as GameFormat, label: f.label, hint: FORMAT_DESC[f.key as GameFormat] }))} />
      ) : (
        <span class="label cyan">{label}</span>
      )}
      {FORMAT_HINT[value] && <p class="hint">{FORMAT_HINT[value]}</p>}
    </section>
  );
}

interface Props {
  session: Session;
  db: CardDb;
  matchups: Matchup[];
  onLeave: () => void;
  onWatch: () => void;
}

const SIDE_LABEL: Record<Side, string> = { corp: "Corp", runner: "Runner" };
const other = (s: Side): Side => (s === "corp" ? "runner" : "corp");

export function shareLink(code: string) {
  const url = new URL(location.href);
  url.search = `?join=${code}`;
  url.hash = "";
  return url.toString();
}

const STEPS: { key: "relay" | "host"; label: string }[] = [
  { key: "relay", label: "Reach the game server" },
  { key: "host", label: "Link with the other player" },
];

function JoinStatus({ lobby }: { lobby: Session["lobby"] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const current = STEPS.findIndex((s) => s.key === (lobby.step ?? "relay"));
  const seconds = lobby.since ? Math.max(0, Math.round((now - lobby.since) / 1000)) : 0;
  return (
    <section class="panel section join-status">
      <div class="row">
        <span class="label">Joining</span>
        <span class="label">{seconds}s</span>
      </div>
      <ol class="steps">
        {STEPS.map((s, i) => (
          <li class={i < current ? "done" : i === current ? "active" : ""}>
            {i === current ? <BlinkMark /> : <span class="step-mark" aria-hidden="true" />}
            {s.label}
          </li>
        ))}
      </ol>
      {lobby.hint === "unreachable" && (
        <>
          <p class="hint">Can't reach the host yet. Check the code, and ask the host to keep the game on screen: switching apps on their phone pauses it.</p>
          <p class="hint">If it still fails, your networks may block direct links between phones (some mobile carriers do): try with both phones on Wi-Fi, or one on Wi-Fi and the other on mobile data.</p>
        </>
      )}
      {!lobby.hint && seconds >= 10 && <p class="hint">Still trying. Check your connection.</p>}
    </section>
  );
}

export function QrZoom({ value, code, from, onClose }: { value: string; code: string; from: HTMLElement | null; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const qr = useRef<HTMLDivElement>(null);
  const extra = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const offset = () => {
    const a = from?.getBoundingClientRect();
    const b = qr.current?.getBoundingClientRect();
    if (!a || !b || !b.width) return null;
    return { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width };
  };
  useLayoutEffect(() => {
    const o = offset();
    if (!o || motionOff()) return;
    if (from) from.style.visibility = "hidden";
    root.current!.style.backgroundColor = "rgba(0,0,0,0)";
    animate(root.current!, { backgroundColor: ["rgba(0,0,0,0)", "rgba(0,0,0,0.92)"] }, { duration: 0.25 });
    qr.current!.style.transform = `translateX(${o.x}px) translateY(${o.y}px) scale(${o.scale})`;
    animate(qr.current!, { x: [o.x, 0], y: [o.y, 0], scale: [o.scale, 1] }, { type: "spring", visualDuration: 0.38, bounce: 0.18 });
    extra.current!.style.opacity = "0";
    animate(extra.current!, { opacity: [0, 1], y: [12, 0] }, { duration: 0.25, delay: 0.18 });
    return () => {
      if (from) from.style.visibility = "";
    };
  }, []);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const o = offset();
    if (!o || motionOff()) return onClose();
    animate(extra.current!, { opacity: 0 }, { duration: 0.12 });
    animate(root.current!, { backgroundColor: "rgba(0,0,0,0)" }, { duration: 0.28 });
    animate(qr.current!, { x: o.x, y: o.y, scale: o.scale }, { type: "spring", visualDuration: 0.3, bounce: 0 }).finished.then(onClose, onClose);
  };
  useBackClose(true, close);
  return (
    <div ref={root} class="qr-zoom" onClick={close} role="dialog" aria-label={`Join game ${code}`}>
      <div ref={qr} class="qr-zoom-code">
        <QrCode value={value} label={`QR code to join game ${code}`} />
      </div>
      <div ref={extra} class="qr-zoom-extra">
        <span class="code">{code}</span>
        <span class="hint">Tap to close</span>
      </div>
    </div>
  );
}

export function DeckSheet({ side, db, matchups, value, onPick, onClose, onEditDecks, format, bot }: { side: Side; db: CardDb; matchups: Matchup[]; value?: WireDeck; onPick: (d: WireDeck) => void; onClose: () => void; onEditDecks?: () => void; format?: GameFormat; bot?: boolean }) {
  useBackClose(true, onClose);
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel deck-choose" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Choose a ${SIDE_LABEL[side]} deck`}>
        <div class="row">
          <span class={`label who-${side}`}>Choose a {SIDE_LABEL[side]} deck</span>
          <button class="ghost" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <DeckPicker
          side={side}
          db={db}
          matchups={matchups}
          value={value}
          showCurrent={false}
          format={format}
          bot={bot}
          onEditDecks={
            onEditDecks &&
            (() => {
              onClose();
              onEditDecks();
            })
          }
          onChange={(d) => {
            onPick(d);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

function NameField({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  if (!editing)
    return (
      <button
        class="name-chip"
        onClick={() => {
          setValue(name);
          setEditing(true);
        }}
        aria-label={`Change your name, currently ${name}`}
      >
        {name}
        <Icon name="edit" />
      </button>
    );
  const save = () => {
    onSave(value);
    setEditing(false);
  };
  return (
    <form
      class="name-edit"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input value={value} maxLength={24} autoFocus onInput={(e) => setValue((e.target as HTMLInputElement).value)} onBlur={save} aria-label="Your name" />
    </form>
  );
}

function Seat({ label, side, deck, db, matchups, onPick, onSide, locked, name, onName, format = "casual", problem, onEditDecks }: { onEditDecks?: (side: Side) => void; label: string; name?: string; onName?: (name: string) => void; side: Side; deck?: WireDeck; db: CardDb; matchups: Matchup[]; onPick: (d: WireDeck) => void; onSide?: (s: Side) => void; locked?: boolean; format?: GameFormat; problem?: string | null }) {
  const dealt = dealtFormat(format);
  const [choosing, setChoosing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const current = useMemo(() => (deck ? fromWire(deck, db) : undefined), [deck]);
  const issues = useMemo(() => {
    const rules = deckFormat(format);
    return current && rules ? analyze(current, rules).problems.filter((p) => p.level === "error").map((p) => p.text) : [];
  }, [current, format]);
  useEffect(() => {
    setChoosing(false);
    setViewing(false);
  }, [side]);
  useBackClose(viewing, () => setViewing(false));
  return (
    <section class="panel section seat">
      <div class="row">
        <span class="label seat-label">
          {label}
          {name && onName && <NameField name={name} onSave={onName} />}
        </span>
        <span class={`label who-${side}`}>{SIDE_LABEL[side]}</span>
      </div>
      {onSide && (
        <div class="tabs">
          {(["corp", "runner"] as Side[]).map((s) => (
            <button class={side === s ? "on" : ""} onClick={() => s !== side && onSide(s)}>
              {SIDE_LABEL[s]}
            </button>
          ))}
        </div>
      )}
      {dealt ? (
        <p class="status seat-dealt">{format === "chimera" ? "A random deck is dealt when the game starts." : "The deck is drafted when the game starts."}</p>
      ) : current ? (
        <>
          <ul class="deck-library">
            <DeckRow db={db} stored={deck!} format={deckFormat(format) ?? "casual"} onOpen={() => setViewing(true)} issuesOnly />
          </ul>
          {problem && (
            <div class="seat-issues" role="alert">
              <span class="seat-issues-head">
                <Icon name="warning" />
                Not legal in {GAME_FORMATS.find((f) => f.key === format)?.label}
              </span>
              <ul>
                {(issues.length ? issues : [problem]).map((t) => (
                  <li>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <div class="seat-actions">
              <button onClick={() => setViewing(true)}>View list</button>
              {!locked && (
                <button class="primary" onClick={() => setChoosing(true)}>
                  Change deck
                </button>
              )}
          </div>
        </>
      ) : (
        <button class="primary" onClick={() => setChoosing(true)}>
          Choose a deck
        </button>
      )}
      {choosing && <DeckSheet side={side} db={db} matchups={matchups} value={deck} format={format} bot={label === "Bot"} onPick={onPick} onEditDecks={onEditDecks && (() => onEditDecks(side))} onClose={() => setChoosing(false)} />}
      {viewing && current && <DeckView deck={current} format={deckFormat(format) ?? "casual"} onClose={() => setViewing(false)} />}
    </section>
  );
}

export function Lobby({ session, db, matchups, onLeave, onWatch }: Props) {
  const { lobby } = session;
  const [editor, setEditor] = useState<Side | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrBig, setQrBig] = useState(false);
  const qrSmall = useRef<HTMLButtonElement>(null);
  const link = shareLink(lobby.code);
  const opponent = lobby.opponentName ?? "your opponent";
  const inviting = lobby.role === "host" && !lobby.opponentName && lobby.status !== "connected";
  const reached = useRef(false);
  if (lobby.status !== "connecting" && lobby.status !== "closed") reached.current = true;
  const inLobby = lobby.role === "local" || (lobby.status !== "closed" && (lobby.status !== "connecting" || reached.current));

  const [, refreshed] = useState(false);
  useEffect(() => {
    session.refreshDecks();
    refreshed(true);
  }, []);
  useEffect(() => {
    if ((lobby.role !== "host" && lobby.role !== "guest") || lobby.started || lobby.myDeck || dealtFormat(lobby.format)) return;
    const d = defaultDeck(lobby.mySide, db, matchups, lobby.format);
    if (d) session.setDeck(d);
  }, [lobby.role, lobby.mySide, lobby.format, !!lobby.myDeck]);
  useEffect(() => {
    if (lobby.opponentName) uiSound("ui_join");
  }, [!!lobby.opponentName]);
  useEffect(() => {
    if (lobby.opponentDeckReady) uiSound("ui_ready");
  }, [!!lobby.opponentDeckReady]);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Netrunner game", text: `Code: ${lobby.code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        uiSound("ui_copy");
        setCopied(true);
      }
    } catch {
      /* cancelled */
    }
  };

  if (lobby.role === "spectator") {
    const names = [lobby.players?.corp, lobby.players?.runner];
    return (
      <>
        <Ticker>
          Watching <span class="cyan">{lobby.code}</span> <span class={lobby.status === "connecting" ? "yellow" : "cyan"}>{lobby.status === "connecting" ? "connecting" : "linked"}</span>
        </Ticker>
        <div class="screen lobby">
          <header class="screen-head">
            <button class="ghost" onClick={onLeave} aria-label="Back to home">
              <Icon name="arrow-left" />
            </button>
            <h1>WATCH</h1>
          </header>
          <section class="panel section lobby-link">
            <span class="label">
              Game <span class="cyan">{lobby.code}</span>
            </span>
            <span class="label">
              {names[0] ?? "Corp seat open"} <span class="cyan">vs</span> {names[1] ?? "Runner seat open"}
            </span>
          </section>
          {lobby.error ? <p class="error">{lobby.error}</p> : <p class="status">{lobby.status === "connecting" ? "Reaching the game…" : "Waiting for the players to start. The board appears as soon as they do."}</p>}
        </div>
      </>
    );
  }

  if (editor)
    return (
      <Decks
        db={db}
        matchups={matchups}
        initialSide={editor}
        onClose={() => {
          setEditor(null);
          session.refreshDecks();
        }}
      />
    );

  return (
    <>
      <Ticker>
        {lobby.role === "local" ? (
          <>
            Lobby <span class="cyan">{lobby.vsBot ? "solo" : "local"}</span>
          </>
        ) : (
          <>
            Lobby <span class="cyan">{lobby.code}</span> <span class={lobby.status === "connected" ? "cyan" : "yellow"}>{lobby.status}</span>
          </>
        )}
      </Ticker>
      <div class="screen lobby">
        <header class="screen-head">
          <button class="ghost" onClick={onLeave} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>SETUP</h1>
        </header>

        {qrBig && lobby.code && <QrZoom value={link} code={lobby.code} from={qrSmall.current} onClose={() => setQrBig(false)} />}
        {inviting && (
          <section class="panel section invite">
            <div class="row">
              <span class="label">Game code</span>
              <span class="label">{lobby.status === "waiting" ? "Waiting for opponent" : "Connecting"}</span>
            </div>
            <div class="invite-body">
              {lobby.code ? (
                <button ref={qrSmall} class="qr-button" onClick={() => setQrBig(true)} aria-label="Enlarge the QR code">
                  <QrCode value={link} label={`QR code to join game ${lobby.code}`} />
                </button>
              ) : (
                <div class="qr qr-pending" />
              )}
              <div class="invite-side">
                <span class="code">{lobby.code || "·····"}</span>
                <button class="primary" disabled={!lobby.code} onClick={share}>
                  {copied ? "Link copied" : "Share link"}
                </button>
              </div>
            </div>
            {!relayUrl() && <p class="hint">Keep this screen open until your opponent joins: switching apps pauses the game.</p>}
          </section>
        )}

        {lobby.role !== "local" && !inviting && inLobby && (
          <section class="panel section lobby-link">
            <span class="label">
              Game <span class="cyan">{lobby.code}</span>
            </span>
            <span class="label">{lobby.status === "connected" ? `Linked with ${opponent}` : lobby.opponentName ? `${opponent} is offline` : "Waiting for the other player"}</span>
          </section>
        )}

        {lobby.role === "local" && <p class="status">{lobby.vsBot ? "Solo game · you against the bot" : "Local game · both sides on this device"}</p>}
        {lobby.role === "guest" && !inLobby && lobby.status !== "closed" && <JoinStatus lobby={lobby} />}
        {lobby.error && <p class="error">{lobby.error}</p>}
        {lobby.role === "guest" && /two players/i.test(lobby.error ?? "") && lobby.code && (
          <button
            class="primary"
            onClick={onWatch}
          >
            Watch this game
          </button>
        )}

        {inLobby && <FormatPicker value={lobby.format} onChange={lobby.role !== "guest" ? (f) => session.setFormat(f) : undefined} />}

        {inLobby && <Seat format={lobby.format} problem={session.deckProblem(lobby.myDeck)} label={lobby.role === "local" && !lobby.vsBot ? "Player 1" : "You"} name={lobby.myName} onName={(n) => session.setName(n)} side={lobby.mySide} deck={lobby.myDeck} db={db} matchups={matchups} onEditDecks={setEditor} onPick={(d) => session.setDeck(d)} onSide={lobby.role !== "guest" ? (s) => session.setSide(s) : undefined} />}

        {lobby.role === "local" && <Seat format={lobby.format} problem={session.deckProblem(session.localOpponentDeck)} label={lobby.vsBot ? "Bot" : "Player 2"} side={other(lobby.mySide)} deck={session.localOpponentDeck} db={db} matchups={matchups} onEditDecks={setEditor} onPick={(d) => session.setDeck(d, other(lobby.mySide))} />}

        <div class="lobby-footer">
          {lobby.role === "host" && !inviting && <p class={`status ${lobby.opponentDeckReady ? "connected" : ""}`}>{lobby.opponentDeckReady ? `${opponent} is ready` : `Waiting for ${opponent} to pick a deck…`}</p>}
          {lobby.role === "guest" ? (
            inLobby &&
            (lobby.ready ? (
              <>
                <p class="status connected">Ready · waiting for {opponent} to start</p>
                <button class="ghost" onClick={() => session.setReady(false)}>
                  Not ready
                </button>
              </>
            ) : (
              <Cta disabled={(!lobby.myDeck && !dealtFormat(lobby.format)) || !!session.deckProblem(lobby.myDeck)} onClick={() => session.setReady(true)}>
                Ready
              </Cta>
            ))
          ) : (
            <>
              {!session.canStart && (session.deckProblem(lobby.myDeck) || session.deckProblem(session.localOpponentDeck)) && <p class="status">Decks must be {GAME_FORMATS.find((f) => f.key === lobby.format)?.label} legal.</p>}
              <Cta disabled={!session.canStart} onClick={() => session.start()}>
                Start game
              </Cta>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function BlinkMark() {
  const el = useRef<HTMLSpanElement>(null);
  useLoop(el, { opacity: [1, 0.15, 1], scale: [1, 0.7, 1] }, { duration: 1, ease: "easeInOut" });
  return <span ref={el} class="step-mark" aria-hidden="true" />;
}
