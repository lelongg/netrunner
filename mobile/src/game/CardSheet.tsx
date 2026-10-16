import { useEffect, useRef, useState } from "preact/hooks";
import { useLoop } from "../fx/ui";
import type { Side } from "../engine";
import { type Command, cardCommands, cardRef, pendingChoice } from "./actions";
import { CardImage, ZoomableCardImage } from "./CardImage";
import { visibleCode } from "./CardTile";
import { Pager } from "./Pager";
import { RichText } from "./RichText";
import { useSwipe } from "./swipe";
import { iconize, serverLabel, serverName } from "./text";
import { Icon, type IconName } from "../icons";
import { glyphs } from "./Glyphs";

interface Chip {
  text: string;
  icon?: IconName;
  tone?: "new" | "cyan" | "red";
}

interface Facts {
  where: string[];
  chips: Chip[];
  hint?: string;
}

const COUNTER_ICONS: Record<string, IconName> = { virus: "virus", credit: "credit", power: "bolt", advancement: "advance", agenda: "agenda" };

function ordinal(n: number) {
  return `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
}

function cardFacts(card: any, viewer: Side, view: any, known: boolean): Facts {
  const z: any[] = card.zone ?? [];
  const corp = card.side === "Corp";
  const mine = (corp ? "corp" : "runner") === viewer;
  const facts: Facts = { where: [], chips: [] };
  const key = String(z[1] ?? "");
  if (z[0] === "servers") {
    facts.where.push(serverName(key));
    if (z[2] === "ices") {
      const ices: any[] = view.corp?.servers?.[key]?.ices ?? [];
      const i = ices.findIndex((c) => c.cid === card.cid);
      const fromOutside = i < 0 ? 0 : ices.length - i;
      if (ices.length > 1) facts.where.push(fromOutside === 1 ? "outermost" : i === 0 ? "innermost" : `${ordinal(fromOutside)} from outside`);
      if (!known && viewer === "runner") facts.hint = "Revealed if the Corp rezzes it when you approach.";
    } else {
      facts.where.push("root");
      if (!known && viewer === "runner") facts.hint = "Run the server and access it to find out what it is.";
    }
    facts.where.push(card.rezzed ? "rezzed" : known && card.type === "Agenda" ? "facedown" : "unrezzed");
  } else if (z[0] === "rig") facts.where.push(known ? (mine ? "your rig" : "Runner's rig") : "facedown in the rig");
  else if (z[0] === "onhost") facts.where.push("hosted");
  else if (z[0] === "hand") facts.where.push(corp ? "HQ" : "grip");
  else if (z[0] === "deck") facts.where.push(corp ? "R&D" : "stack");
  else if (z[0] === "discard") facts.where.push(corp ? "Archives" : "heap", ...(known ? [] : ["facedown"]));
  else if (z[0] === "scored") facts.where.push(`scored · ${card.agendapoints ?? 0} pts`);
  else if (z[0] === "current") facts.where.push("current");
  if (card.new && (z[0] === "servers" || z[0] === "rig")) facts.chips.push({ text: "New", tone: "new" });
  const adv = (card["advance-counter"] ?? 0) + (card["extra-advance-counter"] ?? 0);
  if (adv) facts.chips.push({ icon: "advance", text: known && card.type === "Agenda" ? `${adv}/${card["current-advancement-requirement"] ?? card.advancementcost}` : String(adv) });
  for (const [k, v] of Object.entries<any>(card.counter ?? {})) if (v) facts.chips.push(COUNTER_ICONS[k] ? { icon: COUNTER_ICONS[k], text: String(v) } : { text: `${k} ${v}` });
  if (card["rec-counter"]) facts.chips.push({ icon: "recurring", text: String(card["rec-counter"]) });
  const now = card["current-strength"];
  if (known && now != null && card.strength != null && now !== card.strength) facts.chips.push({ text: `str ${now} (${card.strength})`, tone: "cyan" });
  const hosted: any[] = card.hosted ?? [];
  if (hosted.length) facts.chips.push({ text: `hosting ${hosted.map((h) => (h.title && (h.seen || h.rezzed || h.side === "Runner" || mine) ? h.title : "facedown card")).join(", ")}` });
  return facts;
}

function CardBack({ side }: { side: string }) {
  const corp = side === "Corp";
  const scan = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  useLoop(scan, { transform: ["translateY(-30%)", "translateY(1100%)"] }, { duration: 3.2, ease: "linear" });
  useLoop(name, { x: [0, 0, -3, 4, 0, 0], opacity: [1, 1, 0.55, 1, 0.8, 1] }, { duration: 4, times: [0, 0.86, 0.88, 0.9, 0.93, 1], ease: "linear" });
  return (
    <div class={`sheet-img card-back ${corp ? "corp" : "runner"}`} aria-label="Hidden card">
      <span class="back-frame" />
      <span class="back-name" ref={name} data-text={corp ? "CORP" : "RUNNER"}>
        {corp ? "CORP" : "RUNNER"}
      </span>
      <span class="back-stamp">Classified</span>
      <span class="back-redacted">
        <i />
        <i />
        <i />
      </span>
      <span class="back-scan" ref={scan} />
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
    pendingChoice.value = c.choose;
    send(c.command, c.args);
    if (c.then === "install-list") setInstalling(true);
    else if (!c.choose) onClose();
  };

  const install = (server: unknown) => {
    send(server === "Expend" ? "expend" : "play", { card: cardRef(card), server });
    onClose();
  };

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel swipeable" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={code ? card.title : "Hidden card"} {...swipe}>
        {onStep && !installing && <Pager index={index} count={count} onStep={onStep} />}
        <div key={card.cid} class="sheet-head">
          {code ? <ZoomableCardImage class="sheet-img" code={code} alt={card.title} size="large" /> : <CardBack side={card.side} />}
          <div class="sheet-info">
            {(() => {
              const facts = cardFacts(card, side, view, !!code);
              return (
                <>
                  <span class="label">{[code ? card.type : card.side, ...(code && card.subtypes?.length ? card.subtypes : []), ...facts.where].join(" · ")}</span>
                  <h2>{code ? card.title : "Classified"}</h2>
                  {facts.chips.length > 0 && (
                    <div class="fact-chips">
                      {facts.chips.map((c) => (
                        <span class={`fact-chip ${c.tone ?? ""}`}>
                          {c.icon && <Icon name={c.icon} />}
                          {c.text}
                        </span>
                      ))}
                    </div>
                  )}
                  {facts.hint && <p class="fact-hint">{facts.hint}</p>}
                </>
              );
            })()}
            {full?.text && <RichText class="card-text" text={full.text} />}
            {(card.subroutines ?? []).length > 0 && side === "runner" && (
              <ul class="subs">
                {card.subroutines.map((s: any) => (
                  <li class={s.broken ? "broken" : s.fired ? "fired" : ""}>
                    <Icon name="sub" /> {glyphs(iconize(s.label))}
                  </li>
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
