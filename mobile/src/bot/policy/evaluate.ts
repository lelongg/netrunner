import type { Side } from "../../engine.ts";

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : Number(x) || 0);

function counters(card: any): number {
  const c = card?.counter ?? {};
  return num(c.credit) * 0.9 + num(c.virus) * 0.6 + num(c.power) * 0.5 + num(c.advancement) * 0.5;
}

function creditValue(credits: number): number {
  return credits <= 8 ? credits * 1.3 : 8 * 1.3 + (credits - 8) * 0.85;
}

function installedValue(card: any, corp: boolean, funded = true): number {
  if (!card) return 0;
  let v = 0;
  if (corp) {
    if (card.type === "ICE") v += card.rezzed ? num(card.cost) * 0.8 + 2 : funded ? 1.5 : 0.5;
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
  for (const h of card.hosted ?? []) v += installedValue(h, corp, funded);
  return v;
}

export const CLICK_VALUE = 1.3;

function sideValue(view: any, side: Side): number {
  const p = view?.[side];
  if (!p) return 0;
  let v = creditValue(num(p.credit)) + num(p["agenda-point"]) * 12 + num(p.click) * CLICK_VALUE;
  const hand = Array.isArray(p.hand) ? p.hand.length : num(p["hand-count"]);
  v += Math.min(hand, 5) * 0.8 + Math.max(0, hand - 5) * 0.2;
  if (side === "runner") {
    v -= num(p.tag?.total ?? p.tag?.base) * 2.5 + num(p["brain-damage"]) * 3;
    for (const zone of ["program", "hardware", "resource"]) for (const c of p.rig?.[zone] ?? []) v += installedValue(c, false);
  } else {
    v -= num(p["bad-publicity"]?.base ?? p["bad-publicity"]) * 1.5;
    const servers = Object.values<any>(p.servers ?? {});
    const debt = servers.flatMap((s) => s.ices ?? []).filter((c: any) => !c.rezzed).reduce((n: number, c: any) => n + num(c.cost), 0);
    const funded = debt <= num(p.credit) + 4;
    for (const s of servers) {
      for (const c of s.ices ?? []) v += installedValue(c, true, funded);
      for (const c of s.content ?? []) v += installedValue(c, true);
    }
  }
  return v;
}

export function evaluate(view: any, side: Side): number {
  const other: Side = side === "corp" ? "runner" : "corp";
  return sideValue(view, side) - sideValue(view, other);
}
