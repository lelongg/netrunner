import { useState } from "preact/hooks";
import type { Role, SavedGame } from "../session";

interface Props {
  ready: boolean;
  error?: string;
  initialJoin?: string;
  save: SavedGame | null;
  onResume: () => void;
  onDiscard: () => void;
  onStart: (role: Role, name: string, code?: string) => void;
}

const ROLE_LABEL: Record<Role, string> = { host: "hébergée", guest: "rejointe", local: "locale" };

const NAME_KEY = "nsg.name";

function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Home({ ready, error, initialJoin, save, onResume, onDiscard, onStart }: Props) {
  const [name, setName] = useState(storedName() || "Joueur");
  const [code, setCode] = useState(initialJoin ?? "");
  const go = (role: Role, c?: string) => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* storage unavailable */
    }
    onStart(role, name.trim() || "Joueur", c);
  };
  return (
    <div class="screen home">
      <h1 class="logo">
        Null Signal <span>mobile</span>
      </h1>
      <p class="tagline">Le moteur de Jinteki, dans votre poche. Sans serveur : un joueur héberge la partie.</p>
      {!ready && !error && <p class="status">Chargement du moteur et des cartes…</p>}
      {error && <p class="error">{error}</p>}
      {save && (
        <section class="card-block resume">
          <h2>Partie en cours</h2>
          <p class="hint">
            Partie {ROLE_LABEL[save.role]} · code {save.code}
            {save.role !== "guest" ? ` · ${save.log.length} actions` : ""}
          </p>
          <button class="primary big" disabled={!ready} onClick={onResume}>Reprendre</button>
          <button class="ghost" onClick={onDiscard}>Abandonner cette sauvegarde</button>
        </section>
      )}
      <label class="field">
        Pseudo
        <input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} maxLength={24} />
      </label>
      <section class="card-block">
        <h2>Héberger</h2>
        <p class="hint">Votre téléphone fait tourner la partie. Gardez l'appli ouverte pendant le jeu.</p>
        <button class="primary big" disabled={!ready} onClick={() => go("host")}>Créer une partie</button>
      </section>
      <section class="card-block">
        <h2>Rejoindre</h2>
        <input class="code-input" value={code} onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())} placeholder="CODE" maxLength={5} />
        <button class="primary big" disabled={!ready || code.trim().length < 5} onClick={() => go("guest", code.trim())}>Rejoindre</button>
      </section>
      <section class="card-block">
        <h2>Sur un seul appareil</h2>
        <button disabled={!ready} onClick={() => go("local")}>Partie locale (2 joueurs)</button>
      </section>
      <p class="fineprint">
        Fan-made, non officiel. Moteur de règles : Jinteki.net (MIT). Données et images de cartes : NetrunnerDB / Null Signal Games.
      </p>
    </div>
  );
}
