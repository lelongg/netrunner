import { useEffect, useState } from "preact/hooks";
import type { Side } from "../engine";
import { type Command, cardCommands, cardRef } from "./actions";
import { CardImage, ZoomableCardImage } from "./CardImage";
import { visibleCode } from "./CardTile";
import { Pager } from "./Pager";
import { RichText } from "./RichText";
import { useSwipe } from "./swipe";
import { iconize, serverLabel } from "./text";

interface Props {
  card: any;
  view: any;
  side: Side;
  db: { byTitle: Map<string, any> };
  send: (command: string, args?: unknown) => void;
  onClose: () => void;
  disabled: boolean;
  index?: number;
  count?: number;
  slide?: -1 | 1;
  onStep?: (dir: -1 | 1) => void;
}

export function CardSheet({ card, view, side, db, send, onClose, disabled, index = 0, count = 1, slide, onStep }: Props) {
  const [installing, setInstalling] = useState(false);
  const owner = card.side === (side === "corp" ? "Corp" : "Runner");
  const code = visibleCode(card, owner);
  const full = code ? db.byTitle.get(card.title) : undefined;
  const commands = cardCommands(card, view, side);
  const installList: unknown[] = view.corp?.["install-list"] ?? [];
  useEffect(() => setInstalling(false), [card.cid]);
  const swipe = useSwipe((dir) => !installing && onStep?.(dir));

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
      <div class="sheet panel swipeable" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={code ? card.title : "Hidden card"} {...swipe}>
        {onStep && !installing && <Pager index={index} count={count} onStep={onStep} />}
        <div key={card.cid} class={`sheet-head ${slide ? `slide-${slide < 0 ? "prev" : "next"}` : ""}`}>
          {code ? (
            <ZoomableCardImage class="sheet-img" code={code} alt={card.title} size="large" />
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
