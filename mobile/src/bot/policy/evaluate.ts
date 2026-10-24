import type { Side } from "../../engine.ts";

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : Number(x) || 0);

function counters(card: any): number {
  const c = card?.counter ?? {};
  return num(c.credit) * 0.9 + num(c.virus) * 0.6 + num(c.power) * 0.5 + num(c.advancement) * 0.5;
}

function installedValue(card: any, corp: boolean): number {
  if (!card) return 0;
  let v = 0;
  if (corp) {
    if (card.type === "ICE") v += card.rezzed ? num(card.cost) + 2 : 1.5;
    else if (card.type === "Agenda") v += 0.5;
    else v += card.rezzed ? num(card.cost) + 1 : 1;
    const adv = num(card["advance-counter"]);
    const need = num(card["current-advancement-requirement"] ?? card.advancementcost);
    v += adv * (card.type === "Agenda" ? 2 : 1);
    if (card.type === "Agenda" && need > 0 && adv >= need - 1) v += 3;
  } else {
    v += num(card.cost) + 1;
  }
  v += counters(card);
  for (const h of card.hosted ?? []) v += installedValue(h, corp);
  return v;
}

function sideValue(view: any, side: Side): number {
  const p = view?.[side];
  if (!p) return 0;
  let v = num(p.credit) + num(p["agenda-point"]) * 12 + num(p.click) * 1.3;
  const hand = Array.isArray(p.hand) ? p.hand.length : num(p["hand-count"]);
  v += Math.min(hand, 5) * 0.8 + Math.max(0, hand - 5) * 0.2;
  if (side === "runner") {
    v -= num(p.tag?.total ?? p.tag?.base) * 2.5 + num(p["brain-damage"]) * 3;
    for (const zone of ["program", "hardware", "resource"]) for (const c of p.rig?.[zone] ?? []) v += installedValue(c, false);
  } else {
    v -= num(p["bad-publicity"]?.base ?? p["bad-publicity"]) * 1.5;
    for (const s of Object.values<any>(p.servers ?? {})) {
      for (const c of s.ices ?? []) v += installedValue(c, true);
      for (const c of s.content ?? []) v += installedValue(c, true);
    }
  }
  return v;
}

export function evaluate(view: any, side: Side): number {
  const other: Side = side === "corp" ? "runner" : "corp";
  return sideValue(view, side) - sideValue(view, other);
}
