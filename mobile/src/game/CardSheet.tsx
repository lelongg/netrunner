import { useState } from "preact/hooks";
import { cardImage, type Side } from "../engine";
import { type Command, cardCommands, cardRef } from "./actions";
import { visibleCode } from "./CardTile";
import { RichText } from "./RichText";
import { iconize, serverLabel } from "./text";

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
      <div class="sheet panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={code ? card.title : "Hidden card"}>
        <div class="sheet-head">
          {code ? (
            <img class="sheet-img" crossOrigin="anonymous" src={cardImage(code, "large")} alt={card.title} />
          ) : (
            <div class="sheet-img back">Hidden</div>
          )}
          <div class="sheet-info">
            <span class="label">
              {code ? card.type : card.side}
              {code && card.subtypes?.length ? ` · ${card.subtypes.join(" · ")}` : ""}
            </span>
            <h2>{code ? card.title : "Hidden card"}</h2>
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
            <span class="label">Install {card.title} in…</span>
            {installList.length === 0 && <span class="status">Loading…</span>}
            {installList.map((s) => (
              <button class="primary" disabled={disabled} onClick={() => install(s)}>
                {serverLabel(s)}
              </button>
            ))}
            <button
              class="ghost"
              onClick={() => {
                send("generate-install-list", null);
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div class="sheet-actions">
            {commands.length === 0 && <span class="status">No action available</span>}
            {commands.map((c) => (
              <button class={c.kind === "danger" ? "danger" : c.kind === "primary" ? "primary" : ""} disabled={disabled || c.enabled === false} onClick={() => run(c)}>
                {iconize(c.label)}
              </button>
            ))}
            <button class="ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
