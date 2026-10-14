import { useState } from "preact/hooks";
import { cardImage, type Side } from "../engine";
import { type Command, cardCommands, cardRef } from "./actions";
import { visibleCode } from "./CardTile";
import { RichText } from "./RichText";
import { TYPE_LABELS, iconize, serverLabel } from "./text";

interface Props {
  card: any;
  view: any;
  side: Side;
  db: { byTitle: Map<string, any> };
  send: (command: string, args?: unknown) => void;
  onClose: () => void;
  disabled: boolean;
}

export function CardSheet({ card, view, side, db, send, onClose, disabled }: Props) {
  const [installing, setInstalling] = useState(false);
  const owner = card.side === (side === "corp" ? "Corp" : "Runner");
  const code = visibleCode(card, owner);
  const full = code ? db.byTitle.get(card.title) : undefined;
  const commands = cardCommands(card, view, side);
  const installList: unknown[] = view.corp?.["install-list"] ?? [];

  const run = (c: Command) => {
    send(c.command, c.args);
    if (c.then === "install-list") setInstalling(true);
    else onClose();
  };

  const install = (server: unknown) => {
    send(server === "Expend" ? "expend" : "play", { card: cardRef(card), server });
    onClose();
  };

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>
        <div class="sheet-head">
          {code ? <img class="sheet-img" crossOrigin="anonymous" src={cardImage(code, "large")} alt={card.title} /> : <div class="sheet-img back">Carte cachée</div>}
          <div class="sheet-info">
            <h2>{code ? card.title : "Carte cachée"}</h2>
            {code && (
              <p class="meta">
                {TYPE_LABELS[card.type] ?? card.type}
                {card.subtypes?.length ? ` — ${card.subtypes.join(", ")}` : ""}
              </p>
            )}
            {full?.text && <RichText class="card-text" text={full.text} />}
            {(card.subroutines ?? []).length > 0 && side === "runner" && (
              <ul class="subs">
                {card.subroutines.map((s: any) => (
                  <li class={s.broken ? "broken" : s.fired ? "fired" : ""}>↳ {iconize(s.label)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {installing ? (
          <div class="sheet-actions">
            <p class="hint">Où installer {card.title} ?</p>
            {installList.length === 0 && <p class="hint">Chargement…</p>}
            {installList.map((s) => (
              <button class="primary" disabled={disabled} onClick={() => install(s)}>
                {serverLabel(s)}
              </button>
            ))}
            <button onClick={() => { send("generate-install-list", null); onClose(); }}>Annuler</button>
          </div>
        ) : (
          <div class="sheet-actions">
            {commands.length === 0 && <p class="hint">Aucune action disponible.</p>}
            {commands.map((c) => (
              <button class={c.kind ?? ""} disabled={disabled || c.enabled === false} onClick={() => run(c)}>
                {iconize(c.label)}
              </button>
            ))}
            <button class="ghost" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}
