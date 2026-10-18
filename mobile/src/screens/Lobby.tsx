import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useLoop } from "../fx/ui";
import type { CardDb, Matchup, Side } from "../engine";
import { type WireDeck, deckSize, fromWire } from "../decks";
import type { Session } from "../session";
import { QrCode } from "../QrCode";
import { relayUrl } from "../net/relay";
import { Cta, Ticker } from "../ui";
import { DeckPicker } from "./DeckPicker";
import { DeckViewer } from "./DeckViewer";
import { CardImage } from "../game/CardImage";
import { useBackClose } from "../back";
import { Icon } from "../icons";
import { type GameFormat, GAME_FORMATS, dealtFormat } from "../deckrules";

const FORMAT_HINT: Partial<Record<GameFormat, string>> = {
  preconstructed: "Preconstructed decks only.",
};

function FormatPicker({ value, onChange }: { value: GameFormat; onChange?: (f: GameFormat) => void }) {
  const label = GAME_FORMATS.find((f) => f.key === value)?.label;
  return (
    <section class="format-pick">
      <span class="label">Format</span>
      {onChange ? (
        <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as GameFormat)} aria-label="Game format">
          {GAME_FORMATS.map((f) => (
            <option value={f.key}>{f.label}</option>
          ))}
        </select>
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

function shareLink(code: string) {
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

function DeckSheet({ side, db, matchups, value, onPick, onClose, format }: { side: Side; db: CardDb; matchups: Matchup[]; value?: WireDeck; onPick: (d: WireDeck) => void; onClose: () => void; format?: GameFormat }) {
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

function Seat({ label, side, deck, db, matchups, onPick, onSide, locked, inline, name, onName, format = "casual", problem }: { label: string; inline?: boolean; name?: string; onName?: (name: string) => void; side: Side; deck?: WireDeck; db: CardDb; matchups: Matchup[]; onPick: (d: WireDeck) => void; onSide?: (s: Side) => void; locked?: boolean; format?: GameFormat; problem?: string | null }) {
  const dealt = dealtFormat(format);
  const [choosing, setChoosing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const current = useMemo(() => (deck ? fromWire(deck, db) : undefined), [deck]);
  useEffect(() => {
    setChoosing(false);
    setViewing(false);
  }, [side]);
  useBackClose(viewing, () => setViewing(false));
  return (
    <section class={`panel section seat ${inline ? "inline" : ""}`}>
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
          <button class="seat-deck-main" onClick={() => setViewing(true)} aria-label={`View deck ${current.name}`}>
            <CardImage class="deck-identity" code={current.identity.code} alt={current.identity.title} size="small" />
            <span class="deck-current-info">
              <strong>{current.name}</strong>
              <span>{current.identity.title}</span>
              <span>{deckSize(current)} cards</span>
            </span>
          </button>
          {problem && (
            <p class="error seat-problem">
              Not legal in {GAME_FORMATS.find((f) => f.key === format)?.label}: {problem}
            </p>
          )}
          {!inline && (
            <div class="seat-actions">
              <button onClick={() => setViewing(true)}>View list</button>
              {!locked && (
                <button class="primary" onClick={() => setChoosing(true)}>
                  Change deck
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        !inline && (
          <button class="primary" onClick={() => setChoosing(true)}>
            Choose a deck
          </button>
        )
      )}
      {inline && !dealt && <DeckPicker side={side} db={db} matchups={matchups} value={deck} showCurrent={false} onChange={onPick} format={format} />}
      {choosing && <DeckSheet side={side} db={db} matchups={matchups} value={deck} format={format} onPick={onPick} onClose={() => setChoosing(false)} />}
      {viewing && current && <DeckViewer deck={current} onClose={() => setViewing(false)} />}
    </section>
  );
}

export function Lobby({ session, db, matchups, onLeave, onWatch }: Props) {
  const { lobby } = session;
  const [copied, setCopied] = useState(false);
  const link = shareLink(lobby.code);
  const opponent = lobby.opponentName ?? "your opponent";
  const inviting = lobby.role === "host" && !lobby.opponentName && lobby.status !== "connected";
  const inLobby = lobby.role === "local" || (lobby.status !== "connecting" && lobby.status !== "closed");

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Netrunner game", text: `Code: ${lobby.code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
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
      <div class={`screen lobby ${lobby.role !== "local" && !inviting ? "fill" : ""}`}>
        <header class="screen-head">
          <button class="ghost" onClick={onLeave} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>SETUP</h1>
        </header>

        {inviting && (
          <section class="panel section invite">
            <div class="row">
              <span class="label">Game code</span>
              <span class="label">{lobby.status === "waiting" ? "Waiting for opponent" : "Connecting"}</span>
            </div>
            <div class="invite-body">
              {lobby.code ? <QrCode value={link} label={`QR code to join game ${lobby.code}`} /> : <div class="qr qr-pending" />}
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

        {inLobby && <Seat format={lobby.format} problem={session.deckProblem(lobby.myDeck)} label={lobby.role === "local" && !lobby.vsBot ? "Player 1" : "You"} name={lobby.myName} onName={(n) => session.setName(n)} inline={lobby.role !== "local" && !inviting} side={lobby.mySide} deck={lobby.myDeck} db={db} matchups={matchups} onPick={(d) => session.setDeck(d)} onSide={lobby.role !== "guest" ? (s) => session.setSide(s) : undefined} />}

        {lobby.role === "local" && <Seat format={lobby.format} problem={session.deckProblem(session.localOpponentDeck)} label={lobby.vsBot ? "Bot" : "Player 2"} side={other(lobby.mySide)} deck={session.localOpponentDeck} db={db} matchups={matchups} onPick={(d) => session.setDeck(d, other(lobby.mySide))} />}

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
              {!session.canStart && (session.deckProblem(lobby.myDeck) || session.deckProblem(session.localOpponentDeck)) && <p class="status">Every deck must be legal in {GAME_FORMATS.find((f) => f.key === lobby.format)?.label} to start.</p>}
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
