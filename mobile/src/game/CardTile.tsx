import { useContext } from "preact/hooks";
import { CardImage, useCardPeek } from "./CardImage";
import { Verified } from "./legal";
import { advancement, isFaceup, zone0 } from "./actions";
import { ICON_SET, Icon, type IconName } from "../icons";
import { faceCode } from "../engine";
import { t } from "../i18n";

export function visibleCode(card: any, viewerIsOwner: boolean): string | undefined {
  if (!card?.code) return undefined;
  if (card.facedown && !viewerIsOwner) return undefined;
  return faceCode(card);
}

const COUNTER_ICONS: Record<string, IconName> = { credit: "credit", virus: "virus", power: "bolt", agenda: "agenda" };

function counters(card: any): [IconName | string, number][] {
  const out: [IconName | string, number][] = [];
  const adv = advancement(card);
  if (adv) out.push(["advance", adv]);
  for (const [k, v] of Object.entries(card.counter ?? {})) {
    if (v) out.push([COUNTER_ICONS[k] ?? k.slice(0, 2), Number(v)]);
  }
  return out;
}

export function CardTile({
  card,
  owner,
  selectable,
  onTap,
  size = "md",
}: {
  card: any;
  owner: boolean;
  selectable?: boolean;
  onTap?: (card: any) => void;
  size?: "sm" | "md" | "lg";
}) {
  const code = visibleCode(card, owner);
  const hiddenToMe = !code;
  const ice = card.type === "ICE";
  const dim = owner && card.side === "Corp" && zone0(card) === "servers" && !card.rezzed && card.type !== "Agenda";
  const sideways = (card.zone ?? []).includes("ices");
  const strength = (card.type === "ICE" || (card.subtypes ?? []).includes?.("Icebreaker")) && (card["current-strength"] ?? card.strength);
  const strDelta = strength != null && strength !== false && card.strength != null ? (strength < card.strength ? <span class="cost-delta down">▾</span> : strength > card.strength ? <span class="cost-delta up">▴</span> : null) : null;
  const shownCost: number | undefined = card["current-cost"] ?? (dim ? card["current-rez-cost"] : undefined);
  const verified = useContext(Verified);
  const usable = owner && !dim && zone0(card) !== "hand" && (card.abilities ?? []).some((a: any) => a.playable) && (!verified || verified.has(card.cid));
  const playable = !!card.playable && (!verified || verified.has(card.cid));
  const rezzable = dim && !ice && !!verified?.has(card.cid);
  const scorable = owner && card.type === "Agenda" && zone0(card) === "servers" && !!verified?.has(card.cid);
  const advanceable = owner && !scorable && !!verified?.has(`advance:${card.cid}`);
  const classes = [
    "tile",
    `tile-${size}`,
    card.side === "Corp" ? "corp" : "runner",
    hiddenToMe ? "back" : "",
    dim ? "unrezzed" : "",
    card.selected ? "selected" : "",
    selectable ? "selectable" : "",
    playable ? "playable" : "",
    usable ? "usable" : "",
    rezzable ? "rezzable" : "",
    scorable ? "scorable" : "",
    advanceable ? "advanceable" : "",
    card.new ? "new" : "",
    ice ? "ice" : "",
    sideways ? "sideways" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const hosted: any[] = card.hosted ?? [];
  const peek = useCardPeek(code, card.title);
  const tap = () => {
    if (!peek.consumed()) onTap?.(card);
  };
  return (
    <div class="tile-wrap">
      <button key={`${card.cid}:${code ?? ""}:${card.rezzed ? 1 : 0}`} class={classes} data-cid={card.cid} onClick={tap} {...peek.handlers} aria-label={card.title ?? t("Hidden card")}>
        {code ? <CardImage code={code} alt={card.title} size={size === "lg" ? "large" : "small"} lazy /> : <span class="back-label">{card.side === "Corp" ? t("CORP") : t("RUN")}</span>}
        <div class="badges">
          {counters(card).map(([icon, n]) => (
            <span class="badge">
              {icon in ICON_SET ? <Icon name={icon as IconName} class="glyph" /> : icon}
              {n}
            </span>
          ))}
          {!sideways && strength != null && strength !== false && <span class="badge str">
              <Icon name="strength" class="glyph" />
              {strength}
              {strDelta}
            </span>}
        </div>
        {sideways && strength != null && strength !== false && <span class="badge str corner">
            <Icon name="strength" class="glyph" />
            {strength}
            {strDelta}
          </span>}
        {code && shownCost != null && (
          <span class="badge corner cost" aria-label={card.cost != null && shownCost !== card.cost ? t("cost {n}, printed {printed}", { n: shownCost, printed: card.cost }) : t("cost {n}", { n: shownCost })}>
            <Icon name="credit" class="glyph" />
            {shownCost}
            {card.cost != null && shownCost < card.cost && <span class="cost-delta down">▾</span>}
            {card.cost != null && shownCost > card.cost && <span class="cost-delta up">▴</span>}
          </span>
        )}
        {(usable || rezzable) && (
          <span class="usable-mark" aria-hidden="true">
            <Icon name="bolt" />
          </span>
        )}
        {advanceable && (
          <span class={`usable-mark advance-mark ${usable || rezzable ? "second" : ""}`} aria-hidden="true">
            <Icon name="advance" />
          </span>
        )}
        {card.new && <span class="new-tag">{t("New")}</span>}
        {dim && <span class="state">{t("unrezzed")}</span>}
        {scorable ? <span class="state">{t("score")}</span> : owner && card.side === "Corp" && zone0(card) === "servers" && !isFaceup(card) && card.type === "Agenda" && <span class="state">{t("facedown")}</span>}
      </button>
      {hosted.length > 0 && (
        <div class="hosted">
          {hosted.map((h) => (
            <CardTile card={h} owner={owner === (h.side === card.side)} onTap={onTap} size="sm" />
          ))}
        </div>
      )}
      {peek.view}
    </div>
  );
}
