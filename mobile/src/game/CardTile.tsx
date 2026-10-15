import { CardImage } from "./CardImage";
import { advancement, isFaceup, zone0 } from "./actions";
import { ICON_SET, Icon, type IconName } from "../icons";

export function visibleCode(card: any, viewerIsOwner: boolean): string | undefined {
  if (!card?.code) return undefined;
  if (card.facedown && !viewerIsOwner) return undefined;
  return card.code;
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
  const strength = (card.type === "ICE" || (card.subtypes ?? []).includes?.("Icebreaker")) && (card["current-strength"] ?? card.strength);
  const classes = [
    "tile",
    `tile-${size}`,
    card.side === "Corp" ? "corp" : "runner",
    hiddenToMe ? "back" : "",
    dim ? "unrezzed" : "",
    card.selected ? "selected" : "",
    selectable ? "selectable" : "",
    card.playable ? "playable" : "",
    card.new ? "new" : "",
    ice ? "ice" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const hosted: any[] = card.hosted ?? [];
  return (
    <div class="tile-wrap">
      <button class={classes} onClick={() => onTap?.(card)} aria-label={card.title ?? "Hidden card"}>
        {code ? <CardImage code={code} alt={card.title} size={size === "lg" ? "large" : "small"} lazy /> : <span class="back-label">{card.side === "Corp" ? "CORP" : "RUN"}</span>}
        <div class="badges">
          {counters(card).map(([icon, n]) => (
            <span class="badge">
              {icon in ICON_SET ? <Icon name={icon as IconName} class="glyph" /> : icon}
              {n}
            </span>
          ))}
          {strength != null && strength !== false && <span class="badge str">str {strength}</span>}
        </div>
        {dim && <span class="state">unrezzed</span>}
        {owner && card.side === "Corp" && zone0(card) === "servers" && !isFaceup(card) && card.type === "Agenda" && <span class="state">facedown</span>}
      </button>
      {hosted.length > 0 && (
        <div class="hosted">
          {hosted.map((h) => (
            <CardTile card={h} owner={owner === (h.side === card.side)} onTap={onTap} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
