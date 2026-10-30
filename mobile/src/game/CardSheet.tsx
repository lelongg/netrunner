import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";
import { animate, reduced } from "../fx/core";
import { useHold } from "../hold";
import { useLoop } from "../fx/ui";
import { type Side, faceIndex } from "../engine";
import { type Command, cardCommands, cardRef, pendingChoice } from "./actions";
import { type Prober, useChecked } from "./legal";
import { CardImage, ZoomableCardImage } from "./CardImage";
import { visibleCode } from "./CardTile";
import { Pager } from "./Pager";
import { RichText } from "./RichText";
import { useSheetPager } from "./swipe";
import { iconize, serverLabelShown, serverName, serverRank } from "./text";
import { Icon, type IconName } from "../icons";
import { cardText } from "../cardtext";
import { glyphs } from "./Glyphs";
import { t } from "../i18n";
import { labelText, shown } from "./labels";

interface Chip {
  text: string;
  icon?: IconName;
  tone?: "new" | "cyan" | "red";
  tip?: string;
}

interface Facts {
  where: string[];
  chips: Chip[];
  hint?: string;
}

const COUNTER_ICONS: Record<string, IconName> = { virus: "virus", credit: "credit", power: "power", advancement: "advance", agenda: "agenda" };

const COUNTER_TIPS: Record<string, string> = {
  virus: "Virus counters · used by virus programs. The Corp removes every one of them when it purges.",
  credit: "Credits stored on this card · spent the way the card says.",
  power: "Power counters · spent or counted by this card's abilities.",
  agenda: "Agenda counters · spent to use this agenda's abilities.",
  advancement: "Advancement counters · used by this card's abilities.",
};

function ordinal(n: number) {
  return n === 2 ? t("2nd") : n === 3 ? t("3rd") : t("{n}th", { n });
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
      if (ices.length > 1) facts.where.push(fromOutside === 1 ? t("outermost") : i === 0 ? t("innermost") : t("{nth} from outside", { nth: ordinal(fromOutside) }));
      if (!known && viewer === "runner") facts.hint = t("Revealed if the Corp rezzes it when you approach.");
    } else {
      facts.where.push(t("root"));
      if (!known && viewer === "runner") facts.hint = t("Run the server and access it to find out what it is.");
    }
    facts.where.push(card.rezzed ? t("rezzed") : known && card.type === "Agenda" ? t("facedown") : t("unrezzed"));
  } else if (z[0] === "rig") facts.where.push(known ? (mine ? t("your rig") : t("Runner's rig")) : t("facedown in the rig"));
  else if (z[0] === "onhost") facts.where.push(t("hosted"));
  else if (z[0] === "hand") facts.where.push(corp ? t("HQ") : t("grip"));
  else if (z[0] === "deck") facts.where.push(corp ? t("R&D") : t("stack"));
  else if (z[0] === "discard") facts.where.push(corp ? t("Archives") : t("heap"), ...(known ? [] : [t("facedown")]));
  else if (z[0] === "scored") facts.where.push(t("scored · {n} pts", { n: card.agendapoints ?? 0 }));
  else if (z[0] === "current") facts.where.push(t("current"));
  if (card.new && (z[0] === "servers" || z[0] === "rig")) facts.chips.push({ text: t("New"), tone: "new", tip: t("New · installed since its owner's turn began.") });
  const adv = (card["advance-counter"] ?? 0) + (card["extra-advance-counter"] ?? 0);
  if (adv) {
    const req = card["current-advancement-requirement"] ?? card.advancementcost;
    const agenda = known && card.type === "Agenda";
    facts.chips.push({
      icon: "advance",
      text: agenda ? `${adv}/${req}` : String(adv),
      tip: agenda
        ? t("Advancement counters · {adv} of the {req} this agenda needs before the Corp can score it.", { adv, req })
        : t("Advancement counters · {adv} on this card. Agendas need them to be scored, and some ice and assets get stronger with them. The Corp adds them for 1 click and 1 credit, or with card effects.", { adv }),
    });
  }
  for (const [k, v] of Object.entries<any>(card.counter ?? {})) {
    if (!v) continue;
    const tip = COUNTER_TIPS[k] ? t(COUNTER_TIPS[k]) : t("{Kind} counters · used by this card's abilities.", { Kind: `${k[0].toUpperCase()}${k.slice(1)}` });
    facts.chips.push(COUNTER_ICONS[k] ? { icon: COUNTER_ICONS[k], text: String(v), tip } : { text: `${k} ${v}`, tip });
  }
  if (card["rec-counter"]) facts.chips.push({ icon: "recurring", text: String(card["rec-counter"]), tip: t("Recurring credits · placed on this card again each turn, and spent only the way the card says.") });
  const now = card["current-strength"];
  if (known && now != null && card.strength != null && now !== card.strength)
    facts.chips.push({ icon: "strength", text: `${now} (${card.strength})`, tone: "cyan", tip: t("Strength {now} · printed {printed}, changed by effects in play. An icebreaker needs at least the ice's strength to break it.", { now, printed: card.strength }) });
  const hosted: any[] = card.hosted ?? [];
  if (hosted.length) facts.chips.push({ text: t("hosting {cards}", { cards: hosted.map((h) => (h.title && (h.seen || h.rezzed || h.side === "Runner" || mine) ? h.title : t("facedown card"))).join(", ") }), tip: t("Hosted cards · they sit on this card and are trashed if it leaves play.") });
  return facts;
}

function decrypt(back: HTMLElement | null | undefined) {
  if (!back || reduced()) return;
  const q = (sel: string) => back.querySelector<HTMLElement>(sel);
  animate(back, { scale: [1, 1.04, 1], filter: ["brightness(1)", "brightness(1.8)", "brightness(1)"] }, { duration: 0.6, ease: "easeOut" });
  const name = q(".back-name");
  if (name) animate(name, { x: [0, -6, 8, -4, 3, 0], skewX: [0, 14, -10, 6, 0, 0], opacity: [1, 0.3, 1, 0.5, 1, 1] }, { duration: 0.5, ease: "linear" });
  const frame = q(".back-frame");
  if (frame) animate(frame, { opacity: [1, 0.2, 1, 0.4, 1] }, { duration: 0.4, ease: "linear" });
  const stamp = q(".back-stamp");
  if (stamp) animate(stamp, { scale: [2.2, 0.92, 1], rotate: [-24, -6, -8], opacity: [0, 1, 1] }, { duration: 0.45, delay: 0.18, ease: [0.2, 0.9, 0.3, 1] });
  back.querySelectorAll<HTMLElement>(".back-redacted i").forEach((bar, i) => animate(bar, { scaleX: [1, 0, 1] }, { duration: 0.4, delay: 0.1 + i * 0.08, ease: "easeInOut" }));
}

function BackPeek({ side, onClose }: { side: string; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => decrypt(root.current?.querySelector<HTMLElement>(".card-back")), 320);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div class="card-peek" ref={root}>
      <div class="card-zoom" onClick={onClose}>
        <div class="card-zoom-stage">
          <div class="card-zoom-frame current loaded">
            <CardBack side={side} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoomableCardBack({ side }: { side: string }) {
  const [held, setHeld] = useState(false);
  const { handlers, consumed } = useHold(setHeld);
  return (
    <>
      <button class="card-zoom-trigger sheet-img" onClick={(e) => consumed() || decrypt((e.currentTarget as HTMLElement).querySelector<HTMLElement>(".card-back"))} aria-label={t("Hidden card")} {...handlers}>
        <CardBack side={side} />
      </button>
      {held && createPortal(<BackPeek side={side} onClose={() => setHeld(false)} />, document.body)}
    </>
  );
}

function CardBack({ side }: { side: string }) {
  const corp = side === "Corp";
  const scan = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  useLoop(scan, { transform: ["translateY(-30%)", "translateY(1100%)"] }, { duration: 3.2, ease: "linear" });
  useLoop(name, { x: [0, 0, -3, 4, 0, 0], opacity: [1, 1, 0.55, 1, 0.8, 1] }, { duration: 4, times: [0, 0.86, 0.88, 0.9, 0.93, 1], ease: "linear" });
  return (
    <div class={`sheet-img card-back ${corp ? "corp" : "runner"}`} aria-label={t("Hidden card")}>
      <span class="back-frame" />
      <span class="back-name" ref={name} data-text={corp ? "CORP" : "RUNNER"}>
        {corp ? "CORP" : "RUNNER"}
      </span>
      <span class="back-stamp">{t("Classified")}</span>
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
  confirm?: { label: string; ready: boolean; onConfirm: () => void };
  stamp?: unknown;
  probe?: Prober;
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
  readOnly?: boolean;
  neighbors?: { prev?: any; next?: any };
  siblings?: any[];
  onJump?: (card: any) => void;
}

function SheetInfo({ card, code, full, side, view }: { card: any; code?: string; full?: any; side: Side; view: any }) {
  return (
    <div class="sheet-info">
      {(() => {
        const facts = cardFacts(card, side, view, !!code);
        return (
          <>
            <span class="label">{[t(code ? card.type : card.side), ...(code && card.subtypes?.length ? card.subtypes.map((x: string) => t(x)) : []), ...facts.where].join(" · ")}</span>
            <h2>{code ? (full?.title ?? card.title) : t("Classified")}</h2>
            {facts.chips.length > 0 && (
              <div class="fact-chips">
                {facts.chips.map((c) => (
                  <span class={`fact-chip ${c.tone ?? ""} ${c.tip ? "tippable" : ""}`} data-tip={c.tip}>
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
      {full?.text && <RichText class="card-text" text={full.faced ? full.text : (cardText(full) ?? full.text)} />}
      {(card.subroutines ?? []).length > 0 && side === "runner" && !full?.text && (
        <ul class="subs">
          {card.subroutines.map((s: any) => (
            <li class={s.broken ? "broken" : s.fired ? "fired" : ""}>
              <Icon name="sub" /> {glyphs(iconize(shown(s.label)))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function withFace(full: any, card: any) {
  const face = full?.["face-texts"]?.[faceIndex(card) ?? -1];
  return face ? { ...full, title: face.title, text: face.text, faced: true } : full;
}

export function CardSheet({ confirm, card, view, stamp, probe, side, db, send, onClose, disabled, index = 0, count = 1, slide, onStep, readOnly, neighbors, siblings, onJump }: Props) {
  const [installing, setInstalling] = useState(false);
  const owner = card.side === (side === "corp" ? "Corp" : "Runner");
  const code = visibleCode(card, owner);
  const full = code ? withFace(db.byTitle.get(card.title), card) : undefined;
  const commands = useChecked(readOnly ? [] : cardCommands(card, view, side), readOnly ? undefined : probe, stamp ?? view);
  const gallery = (siblings ?? [card]).flatMap((c) => {
    const vc = visibleCode(c, c.side === (side === "corp" ? "Corp" : "Runner"));
    return vc ? [{ card: c, item: { code: vc, alt: c.title as string } }] : [];
  });
  const installList: unknown[] = view.corp?.["install-list"] ?? [];
  useEffect(() => setInstalling(false), [card.cid]);
  const sheet = useRef<HTMLDivElement>(null);
  const swipe = useSheetPager(
    sheet,
    card.cid,
    (dir) => !installing && !!onStep && (dir === 1 ? index < count - 1 : index > 0),
    (dir) => onStep?.(dir),
  );

  const run = (c: Command) => {
    pendingChoice.value = c.choose;
    send(c.command, c.args);
    if (c.then === "install-list") setInstalling(true);
    else if (!c.choose && c.command !== "select") onClose();
  };

  const install = (server: unknown) => {
    send(server === "Expend" ? "expend" : "play", { card: cardRef(card), server });
    onClose();
  };

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div ref={sheet} class="sheet panel swipeable" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={code ? card.title : t("Hidden card")} {...swipe}>
        {onStep && !installing && <Pager index={index} count={count} onStep={onStep} />}
        {(["prev", "next"] as const).map((k) => {
          const n = neighbors?.[k];
          if (!n) return null;
          const nOwner = n.side === (side === "corp" ? "Corp" : "Runner");
          const nCode = visibleCode(n, nOwner);
          return (
            <div key={`${k}:${n.cid}`} class={`sheet-peek ${k}`} aria-hidden="true">
              {nCode ? <CardImage class="sheet-img" code={nCode} alt="" size="large" /> : <CardBack side={n.side} />}
              <SheetInfo card={n} code={nCode} full={nCode ? withFace(db.byTitle.get(n.title), n) : undefined} side={side} view={view} />
            </div>
          );
        })}
        <div key={card.cid} class="sheet-head">
          {code ? (
            <ZoomableCardImage
              class="sheet-img"
              code={code}
              alt={card.title}
              size="large"
              gallery={gallery.map((g) => g.item)}
              galleryStart={gallery.findIndex((g) => g.card === card)}
              onGallery={(i) => onJump?.(gallery[i].card)}
            />
          ) : (
            <ZoomableCardBack side={card.side} />
          )}
          <SheetInfo card={card} code={code} full={full} side={side} view={view} />
        </div>
        {installing ? (
          <div class="sheet-actions">
            <span class="label">{t("Install {card} in…", { card: card.title })}</span>
            {installList.length === 0 && <span class="status">{t("Loading…")}</span>}
            {[...installList].sort((a, b) => (serverRank(a) ?? 1e9) - (serverRank(b) ?? 1e9)).map((s) => (
              <button class={serverRank(s) === undefined ? "" : "primary"} disabled={disabled} onClick={() => install(s)}>
                {serverLabelShown(s)}
              </button>
            ))}
            <button
              class="ghost"
              onClick={() => {
                send("generate-install-list", null);
                onClose();
              }}
            >
              {t("Cancel")}
            </button>
          </div>
        ) : (
          <div class="sheet-actions">
            {confirm && (
              <button class="primary sheet-confirm" disabled={disabled || !confirm.ready} onClick={confirm.onConfirm}>
                {confirm.label}
              </button>
            )}
            {commands.map((c) => (
              <button class={c.kind === "danger" ? "danger" : c.kind === "primary" ? "primary" : c.kind === "score" ? "primary score" : ""} disabled={disabled || c.enabled === false} onClick={() => run(c)}>
                {glyphs(iconize(labelText(c.label, c.command)))}
              </button>
            ))}
            <button class="ghost" onClick={onClose}>
              {t("Close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
