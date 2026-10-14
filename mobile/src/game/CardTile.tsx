import { cardImage } from "../engine";
import { advancement, isFaceup, zone0 } from "./actions";

export function visibleCode(card: any, viewerIsOwner: boolean): string | undefined {
  if (!card?.code) return undefined;
  if (card.facedown && !viewerIsOwner) return undefined;
  return card.code;
}

function counters(card: any): string[] {
  const out: string[] = [];
  const adv = advancement(card);
  if (adv) out.push(`▲${adv}`);
  for (const [k, v] of Object.entries(card.counter ?? {})) {
    if (!v) continue;
    const icon = k === "credit" ? "¢" : k === "virus" ? "☣" : k === "power" ? "⚡" : k === "agenda" ? "★" : k.slice(0, 2);
    out.push(`${icon}${v}`);
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
      <button class={classes} onClick={() => onTap?.(card)} aria-label={card.title ?? "Carte cachée"}>
        {code ? <img src={cardImage(code, size === "lg" ? "large" : "small")} alt={card.title} loading="lazy" /> : <span class="back-label">{card.side === "Corp" ? "NSG" : "◆"}</span>}
        <div class="badges">
          {counters(card).map((c) => (
            <span class="badge">{c}</span>
          ))}
          {strength != null && strength !== false && <span class="badge str">⚔{strength}</span>}
        </div>
        {dim && <span class="state">non activée</span>}
        {owner && card.side === "Corp" && zone0(card) === "servers" && !isFaceup(card) && card.type === "Agenda" && <span class="state">face cachée</span>}
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
