import { useEffect, useState } from "preact/hooks";
import type { Side } from "../engine";
import { type Command, cardCommands, cardRef } from "./actions";
import { CardImage, ZoomableCardImage } from "./CardImage";
import { visibleCode } from "./CardTile";
import { Pager } from "./Pager";
import { RichText } from "./RichText";
import { useSwipe } from "./swipe";
import { iconize, serverLabel, serverName } from "./text";
import { Icon } from "../icons";
import { glyphs } from "./Glyphs";

const COUNTER_NAMES: Record<string, string> = { virus: "virus", power: "power", credit: "credit", agenda: "agenda", advancement: "advancement", bad: "bad publicity" };

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

function cardFacts(card: any, viewer: Side, view: any, known: boolean): string[] {
  const z: any[] = card.zone ?? [];
  const corp = card.side === "Corp";
  const mine = (corp ? "corp" : "runner") === viewer;
  const facts: string[] = [];
  const key = String(z[1] ?? "");
  const where = z[0] === "servers" ? serverName(key) : "";
  if (z[0] === "servers" && z[2] === "ices") {
    const ices: any[] = view.corp?.servers?.[key]?.ices ?? [];
    const i = ices.findIndex((c) => c.cid === card.cid);
    const fromOutside = i < 0 ? 0 : ices.length - i;
    const pos = ices.length < 2 ? "" : fromOutside === 1 ? ", outermost" : i === 0 ? ", innermost" : `, ${fromOutside}${fromOutside === 2 ? "nd" : fromOutside === 3 ? "rd" : "th"} from the outside`;
    facts.push(`${card.rezzed ? "Rezzed" : "Unrezzed"} ice protecting ${where}${pos}`);
    if (!known && viewer === "runner") facts.push("Revealed if the Corp rezzes it when you approach");
  } else if (z[0] === "servers") {
    facts.push(`${known ? (card.rezzed ? "Rezzed, in" : card.type === "Agenda" ? "Facedown agenda in" : "Unrezzed, in") : "Facedown card in"} the root of ${where}`);
    if (!known && viewer === "runner") facts.push("Run the server and access it to find out");
  } else if (z[0] === "rig") facts.push(known ? `Installed in ${mine ? "your" : "the Runner's"} rig` : "Facedown in the rig");
  else if (z[0] === "onhost") facts.push("Hosted on another card");
  else if (z[0] === "hand") facts.push(corp ? "In HQ" : "In the grip");
  else if (z[0] === "deck") facts.push(corp ? "In R&D" : "In the stack");
  else if (z[0] === "discard") facts.push(`${known ? "In" : "Facedown in"} ${corp ? "Archives" : "the heap"}`);
  else if (z[0] === "scored") facts.push(`Scored agenda, worth ${plural(Number(card.agendapoints ?? 0), "point")}`);
  else if (z[0] === "current") facts.push("Current, active until another current is played or an agenda is scored or stolen");
  if (card.new && (z[0] === "servers" || z[0] === "rig")) facts.push("Installed this turn");
  const adv = (card["advance-counter"] ?? 0) + (card["extra-advance-counter"] ?? 0);
  if (adv) facts.push(`${plural(adv, "advancement counter")}${known && card.type === "Agenda" ? ` of ${card["current-advancement-requirement"] ?? card.advancementcost} needed` : ""}`);
  for (const [k, v] of Object.entries<any>(card.counter ?? {})) if (v) facts.push(plural(Number(v), `${COUNTER_NAMES[k] ?? k} counter`));
  if (card["rec-counter"]) facts.push(`${card["rec-counter"]} recurring credits`);
  const now = card["current-strength"];
  if (known && now != null && card.strength != null && now !== card.strength) facts.push(`Strength ${now} (printed ${card.strength})`);
  const hosted: any[] = card.hosted ?? [];
  if (hosted.length) facts.push(`Hosting ${hosted.map((h) => (h.title && (h.seen || h.rezzed || h.side === "Runner" || mine) ? h.title : "a facedown card")).join(", ")}`);
  return facts;
}

function CardBack({ side }: { side: string }) {
  const corp = side === "Corp";
  return (
    <div class={`sheet-img card-back ${corp ? "corp" : "runner"}`} aria-label="Hidden card">
      <span class="back-frame" />
      <span class="back-name" data-text={corp ? "CORP" : "RUNNER"}>
        {corp ? "CORP" : "RUNNER"}
      </span>
      <span class="back-stamp">Classified</span>
      <span class="back-redacted">
        <i />
        <i />
        <i />
      </span>
      <span class="back-scan" />
    </div>
  );
}

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
            <CardBack side={card.side} />
          )}
          <div class="sheet-info">
            <span class="label">
              {code ? card.type : card.side}
              {code && card.subtypes?.length ? ` · ${card.subtypes.join(" · ")}` : ""}
            </span>
            <h2>{code ? card.title : "Classified"}</h2>
            {(() => {
              const facts = cardFacts(card, side, view, !!code);
              return facts.length ? (
                <ul class="card-facts">
                  {facts.map((f) => (
                    <li>{f}</li>
                  ))}
                </ul>
              ) : null;
            })()}
            {full?.text && <RichText class="card-text" text={full.text} />}
            {(card.subroutines ?? []).length > 0 && side === "runner" && (
              <ul class="subs">
                {card.subroutines.map((s: any) => (
                  <li class={s.broken ? "broken" : s.fired ? "fired" : ""}><Icon name="sub" /> {glyphs(iconize(s.label))}</li>
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
            {commands.map((c) => (
              <button class={c.kind === "danger" ? "danger" : c.kind === "primary" ? "primary" : ""} disabled={disabled || c.enabled === false} onClick={() => run(c)}>
                {glyphs(iconize(c.label))}
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
