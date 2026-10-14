import { useState } from "preact/hooks";
import type { CardDb, Matchup, Side } from "../engine";
import type { WireDeck } from "../decks";
import type { Session } from "../session";
import { DeckPicker } from "./DeckPicker";

interface Props {
  session: Session;
  db: CardDb;
  matchups: Matchup[];
  onLeave: () => void;
}

const SIDE_LABEL: Record<Side, string> = { corp: "Corporation", runner: "Runner" };
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
  const link = shareLink(lobby.code);
  const status =
    lobby.role === "local"
      ? "Partie locale : les deux camps jouent sur cet appareil."
      : lobby.status === "connecting"
        ? "Connexion au service de mise en relation…"
        : lobby.status === "waiting"
          ? "En attente de l'adversaire…"
          : lobby.status === "closed"
            ? "Connexion perdue."
            : `Connecté avec ${lobby.opponentName ?? "l'adversaire"}`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Partie Netrunner", text: `Code : ${lobby.code}`, url: link });
      else await navigator.clipboard.writeText(link);
    } catch {
      /* cancelled */
    }
  };

  return (
    <div class="screen lobby">
      <header class="screen-head">
        <button class="ghost" onClick={onLeave}>← Accueil</button>
        <h1>Préparation</h1>
      </header>
      {lobby.role !== "local" && (
        <section class="card-block">
          <p class="code">
            Code <strong>{lobby.code}</strong>
          </p>
          {lobby.role === "host" && <button onClick={share}>Partager le lien d'invitation</button>}
        </section>
      )}
      <p class={`status ${lobby.status}`}>{status}</p>
      {lobby.error && <p class="error">{lobby.error}</p>}

      <section class="card-block">
        <h2>
          {lobby.role === "local" ? "Joueur 1" : "Vous"} : {SIDE_LABEL[lobby.mySide]}
        </h2>
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
        <section class="card-block">
          <h2>Joueur 2 : {SIDE_LABEL[other(lobby.mySide)]}</h2>
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

      {lobby.role !== "local" && (
        <p class="hint">{lobby.opponentDeckReady || lobby.role === "guest" ? "" : "L'adversaire n'a pas encore choisi de deck."}</p>
      )}

      {lobby.role === "guest" ? (
        <p class="hint">{lobby.myDeck ? "Deck envoyé. L'hôte lance la partie." : "Choisissez votre deck."}</p>
      ) : (
        <button class="primary big" disabled={!session.canStart} onClick={() => session.start()}>
          Lancer la partie
        </button>
      )}
    </div>
  );
}
