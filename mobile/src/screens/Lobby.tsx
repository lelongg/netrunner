import { useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import type { WireDeck } from "../decks";
import type { Session } from "../session";
import { Cta, Ticker } from "../ui";
import { DeckPicker } from "./DeckPicker";

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

export function Lobby({ session, db, matchups, onLeave }: Props) {
  const { lobby } = session;
  const [opponentDeck, setOpponentDeck] = useState<WireDeck>();
  const [copied, setCopied] = useState(false);
  const link = shareLink(lobby.code);
  const status =
    lobby.role === "local"
      ? "Local game · both sides on this device"
      : lobby.status === "connecting"
        ? "Connecting to the relay…"
        : lobby.status === "waiting"
          ? "Waiting for opponent…"
          : lobby.status === "closed"
            ? "Connection lost"
            : `Linked with ${lobby.opponentName ?? "opponent"}`;

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
        Lobby <span class="cyan">{lobby.code}</span> <span class={lobby.status === "connected" ? "cyan" : "yellow"}>{lobby.status}</span>
      </Ticker>
      <div class="screen lobby">
        <header class="screen-head">
          <button class="ghost" onClick={onLeave} aria-label="Back to home">
            ←
          </button>
          <h1>SETUP</h1>
        </header>

        {lobby.role !== "local" && (
          <section class="panel section">
            <div class="row">
              <span class="label">Game code</span>
              <span class="label">{lobby.role === "host" ? "Host" : "Guest"}</span>
            </div>
            <span class="code">{lobby.code}</span>
            {lobby.role === "host" && (
              <button class="primary" onClick={share}>
                {copied ? "Link copied" : "Share invite link"}
              </button>
            )}
          </section>
        )}

        <p class={`status ${lobby.status}`}>{status}</p>
        {lobby.error && <p class="error">{lobby.error}</p>}

        <section class="panel section">
          <div class="row">
            <span class="label">{lobby.role === "local" ? "Player 1" : "You"}</span>
            <span class={`label who-${lobby.mySide}`}>{SIDE_LABEL[lobby.mySide]}</span>
          </div>
          {lobby.role !== "guest" && (
            <div class="tabs">
              {(["corp", "runner"] as Side[]).map((s) => (
                <button
                  class={lobby.mySide === s ? "on" : ""}
                  onClick={() => {
                    if (s === lobby.mySide) return;
                    session.setSide(s);
                    setOpponentDeck(undefined);
                  }}
                >
                  {SIDE_LABEL[s]}
                </button>
              ))}
            </div>
          )}
          <DeckPicker key={lobby.mySide} side={lobby.mySide} db={db} matchups={matchups} value={lobby.myDeck} onChange={(d) => session.setDeck(d)} />
        </section>

        {lobby.role === "local" && (
          <section class="panel section">
            <div class="row">
              <span class="label">Player 2</span>
              <span class={`label who-${other(lobby.mySide)}`}>{SIDE_LABEL[other(lobby.mySide)]}</span>
            </div>
            <DeckPicker
              key={other(lobby.mySide)}
              side={other(lobby.mySide)}
              db={db}
              matchups={matchups}
              value={opponentDeck}
              onChange={(d) => {
                setOpponentDeck(d);
                session.setDeck(d, other(lobby.mySide));
              }}
            />
          </section>
        )}

        {lobby.role === "host" && !lobby.opponentDeckReady && <p class="hint">Opponent has not picked a deck yet.</p>}

        {lobby.role === "guest" ? (
          <p class="status">{lobby.myDeck ? "Deck sent · the host starts the game" : "Pick your deck"}</p>
        ) : (
          <Cta disabled={!session.canStart} onClick={() => session.start()}>
            Start game
          </Cta>
        )}
      </div>
    </>
  );
}
