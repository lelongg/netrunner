import { useEffect, useMemo, useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import { type WireDeck, deckSize, fromWire } from "../decks";
import type { Session } from "../session";
import { QrCode } from "../QrCode";
import { RELAY_URL } from "../net/relay";
import { Cta, Ticker } from "../ui";
import { DeckPicker } from "./DeckPicker";
import { DeckViewer } from "./DeckViewer";
import { CardImage } from "../game/CardImage";
import { useBackClose } from "../back";
import { Icon } from "../icons";

interface Props {
  session: Session;
  db: CardDb;
  matchups: Matchup[];
  onLeave: () => void;
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
  { key: "relay", label: "Reach the matchmaking relays" },
  { key: "host", label: "Connect to the host's phone" },
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
            <span class="step-mark" aria-hidden="true" />
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
      {!lobby.hint && seconds >= 10 && <p class="hint">Still trying. Make sure the host keeps the game open on their screen.</p>}
    </section>
  );
}

function DeckSheet({ side, db, matchups, value, onPick, onClose }: { side: Side; db: CardDb; matchups: Matchup[]; value?: WireDeck; onPick: (d: WireDeck) => void; onClose: () => void }) {
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

function Seat({
  label,
  side,
  deck,
  db,
  matchups,
  onPick,
  onSide,
  locked,
  inline,
  name,
  onName,
}: {
  label: string;
  inline?: boolean;
  name?: string;
  onName?: (name: string) => void;
  side: Side;
  deck?: WireDeck;
  db: CardDb;
  matchups: Matchup[];
  onPick: (d: WireDeck) => void;
  onSide?: (s: Side) => void;
  locked?: boolean;
}) {
  const [choosing, setChoosing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const current = useMemo(() => (deck ? fromWire(deck, db) : undefined), [deck]);
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
      {current ? (
        <>
          <button class="seat-deck-main" onClick={() => setViewing(true)} aria-label={`View deck ${current.name}`}>
            <CardImage class="deck-identity" code={current.identity.code} alt={current.identity.title} size="small" />
            <span class="deck-current-info">
              <strong>{current.name}</strong>
              <span>{current.identity.title}</span>
              <span>{deckSize(current)} cards</span>
            </span>
          </button>
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
      {inline && <DeckPicker side={side} db={db} matchups={matchups} value={deck} showCurrent={false} onChange={onPick} />}
      {choosing && <DeckSheet side={side} db={db} matchups={matchups} value={deck} onPick={onPick} onClose={() => setChoosing(false)} />}
      {viewing && current && <DeckViewer deck={current} onClose={() => setViewing(false)} />}
    </section>
  );
}

export function Lobby({ session, db, matchups, onLeave }: Props) {
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
            <p class="hint">
              {RELAY_URL
                ? "Your opponent can join even if you leave this screen: the game waits on the relay."
                : "Keep this screen open until your opponent joins: switching apps pauses the game."}
            </p>
          </section>
        )}

        {lobby.role !== "local" && !inviting && inLobby && (
          <section class="panel section lobby-link">
            <span class="label">
              Game <span class="cyan">{lobby.code}</span>
            </span>
            <span class="label">{lobby.status === "connected" ? `Linked with ${opponent}` : lobby.opponentName ? `${opponent} is offline` : "Waiting for the host"}</span>
          </section>
        )}

        {lobby.role === "local" && <p class="status">{lobby.vsBot ? "Solo game · you against the bot" : "Local game · both sides on this device"}</p>}
        {lobby.role === "guest" && !inLobby && lobby.status !== "closed" && <JoinStatus lobby={lobby} />}
        {lobby.error && <p class="error">{lobby.error}</p>}

        {inLobby && (
          <Seat
            key={lobby.mySide}
            label={lobby.role === "local" && !lobby.vsBot ? "Player 1" : "You"}
            name={lobby.myName}
            onName={(n) => session.setName(n)}
            inline={lobby.role !== "local" && !inviting}
            side={lobby.mySide}
            deck={lobby.myDeck}
            db={db}
            matchups={matchups}
            onPick={(d) => session.setDeck(d)}
            onSide={
              lobby.role !== "guest"
                ? (s) => session.setSide(s)
                : undefined
            }
          />
        )}

        {lobby.role === "local" && (
          <Seat
            key={other(lobby.mySide)}
            label={lobby.vsBot ? "Bot" : "Player 2"}
            side={other(lobby.mySide)}
            deck={session.localOpponentDeck}
            db={db}
            matchups={matchups}
            onPick={(d) => session.setDeck(d, other(lobby.mySide))}
          />
        )}

        <div class="lobby-footer">
          {lobby.role === "host" && !inviting && (
            <p class={`status ${lobby.opponentDeckReady ? "connected" : ""}`}>
              {lobby.opponentDeckReady ? `${opponent} is ready` : `Waiting for ${opponent} to pick a deck…`}
            </p>
          )}
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
              <Cta disabled={!lobby.myDeck} onClick={() => session.setReady(true)}>
                Ready
              </Cta>
            ))
          ) : (
            <Cta disabled={!session.canStart} onClick={() => session.start()}>
              Start game
            </Cta>
          )}
        </div>
      </div>
    </>
  );
}
