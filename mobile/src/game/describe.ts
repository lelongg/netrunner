import type { CardDb, Side } from "../engine.ts";
import { currentIce, findCard, promptOf } from "./actions.ts";

export const FACE_INDEX: Record<string, number> = { back: 0, brewery: 0, tank: 1, greenhouse: 2, tenure: 0, subsurface: 1, disposal: 2 };
const SERVER_NAMES: Record<string, string> = { hq: "HQ", rd: "R&D", archives: "Archives" };

export const otherSide = (s: Side): Side => (s === "corp" ? "runner" : "corp");
export const serverName = (key: string) => SERVER_NAMES[key] ?? (key.startsWith("remote") ? `Server ${key.slice(6)}` : key);
export const serverKey = (name: string) => Object.entries(SERVER_NAMES).find(([, v]) => v === name)?.[0] ?? (name.startsWith("Server ") ? `remote${name.slice(7)}` : name);

export function remoteKeys(servers: Record<string, any> | undefined) {
  return Object.keys(servers ?? {})
    .filter((k) => k.startsWith("remote"))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
}

export type Render = (msg: unknown) => string;

export function cardLine(c: any, viewer: Side): string {
  if (!c) return "?";
  const known = c.title && (c.side?.toLowerCase() === viewer || c.rezzed || c.seen || c.side === "Runner");
  if (!known) return c.type === "ICE" || c.zone?.[2] === "ices" ? "unrezzed ice" : "facedown card";
  const bits: string[] = [];
  if (c.type) bits.push(c.type + (c.subtypes?.length ? ` (${c.subtypes.join(", ")})` : ""));
  if (c.side === "Corp" && c.zone?.[0] === "servers" && !c.rezzed) bits.push("unrezzed");
  const str = c["current-strength"] ?? c.strength;
  if ((c.type === "ICE" || (c.subtypes ?? []).includes("Icebreaker")) && str != null) bits.push(`str ${str}`);
  const adv = (c["advance-counter"] ?? 0) + (c["extra-advance-counter"] ?? 0);
  if (adv) bits.push(`${adv} advancement`);
  if (c.advancementcost && c.type === "Agenda") bits.push(`needs ${c["current-advancement-requirement"] ?? c.advancementcost}`);
  for (const [k, v] of Object.entries<any>(c.counter ?? {})) if (v) bits.push(`${v} ${k} counters`);
  if (c["rec-counter"]) bits.push(`${c["rec-counter"]} recurring credits`);
  if (c.hosted?.length) bits.push(`hosting: ${c.hosted.map((h: any) => cardLine(h, viewer)).join(", ")}`);
  return `${c.title}${bits.length ? ` [${bits.join(", ")}]` : ""}`;
}

export interface DescribeOptions {
  render: Render;
  db?: CardDb;
  actionError?: string | null;
}

export function gameLines(view: any, side: Side, { render, db, actionError }: DescribeOptions): [string, string][] {
  const opp = otherSide(side);
  const L: [string, string][] = [];
  const name = (sd: Side) => view[sd]?.user?.username ?? sd;
  if (view.winner) L.push(["over", `GAME OVER: ${view.winner} (${name(view.winner)}) wins${view.reason ? ` by ${view.reason}` : ""}.`]);
  L.push(["turn", `Turn ${view.turn ?? 0} · active: ${view["active-player"]} · you are the ${side.toUpperCase()} (${name(side)}) vs ${name(opp)}`]);
  const pts = (p: any) => `${p["agenda-point"] ?? 0}/${p["agenda-point-req"] ?? 7} points`;
  const stats = (p: any, sd: Side) => {
    const out = [`${p.credit ?? 0} credits`, `${p.click ?? 0} clicks`, pts(p), `${p["hand-count"] ?? (p.hand ?? []).length} cards in ${sd === "corp" ? "HQ" : "grip"}`, `${p["deck-count"] ?? 0} in ${sd === "corp" ? "R&D" : "stack"}`];
    if (sd === "runner") {
      if (p.memory) out.push(`MU ${p.memory.used ?? 0}/${p.memory.available ?? 0}`);
      out.push(`${p.tag?.total ?? 0} tags`);
      if (p.link) out.push(`link ${p.link}`);
      if (p["brain-damage"]) out.push(`${p["brain-damage"]} core damage`);
    } else {
      const bp = (p["bad-publicity"]?.base ?? 0) + (p["bad-publicity"]?.additional ?? 0);
      if (bp) out.push(`${bp} bad publicity`);
    }
    return out.join(" · ");
  };
  const area = (sd: Side, who: string, prefix: string) => {
    const p = view[sd] ?? {};
    const out: [string, string][] = [];
    if (p.identity?.title) {
      const i = p.identity.face ? FACE_INDEX[String(p.identity.face)] : undefined;
      const face = i == null ? undefined : (db?.byTitle.get(p.identity.title) as any)?.["face-texts"]?.[i];
      out.push([`${prefix}.id`, face ? `${who} identity: ${p.identity.title}, flipped to ${face.title} (${face.text.replace(/\n/g, " ")})` : `${who} identity: ${p.identity.title}`]);
    }
    if (sd === "corp") {
      for (const key of ["hq", "rd", "archives", ...remoteKeys(p.servers)]) {
        const srv = p.servers?.[key];
        if (!srv) continue;
        const ices: any[] = srv.ices ?? [];
        const content: any[] = srv.content ?? [];
        if (!ices.length && !content.length && key.startsWith("remote")) continue;
        const iceText = ices.length ? `ice (outermost first) ${[...ices].reverse().map((c) => cardLine(c, side)).join(" > ")}` : "no ice";
        out.push([`${prefix}.${key}`, `${who} ${serverName(key)}: ${iceText}${content.length ? ` | in root: ${content.map((c) => cardLine(c, side)).join(", ")}` : ""}`]);
      }
    } else {
      let any = false;
      for (const k of ["program", "hardware", "resource", "facedown"]) {
        const cards: any[] = p.rig?.[k] ?? [];
        if (cards.length) any = true;
        out.push([`${prefix}.${k}`, cards.length ? `${who} ${k}s: ${cards.map((c) => cardLine(c, side)).join(", ")}` : ""]);
      }
      if (!any) out.push([`${prefix}.rig`, `${who} rig: nothing installed`]);
    }
    const scored: any[] = p.scored ?? [];
    out.push([`${prefix}.scored`, scored.length ? `${who} scored agendas: ${scored.map((c) => `${c.title} (${c["agendapoints"] ?? "?"} pts)`).join(", ")}` : ""]);
    const discard: any[] = p.discard ?? [];
    const total = Math.max(discard.length, Number(p["discard-count"] ?? 0));
    const titles = discard.filter((c) => c.title).map((c) => c.title);
    const hidden = total - titles.length;
    out.push([`${prefix}.discard`, total ? `${who} ${sd === "corp" ? "Archives discard pile" : "heap"}: ${[...titles, ...(hidden ? [`${hidden} facedown`] : [])].join(", ")}` : ""]);
    const current: any[] = p.current ?? [];
    out.push([`${prefix}.current`, current.length ? `${who} current: ${current.map((c) => c.title).join(", ")}` : ""]);
    return out;
  };
  const me = view[side] ?? {};
  L.push(["me", `You (${side}): ${stats(me, side)}`]);
  const hand: any[] = me.hand ?? [];
  L.push(["hand", `Your hand: ${hand.length ? hand.map((c) => `${c.title} [${c.type}${c.cost != null ? `, cost ${c.cost}` : ""}]`).join("; ") : "empty"}`]);
  L.push(...area(side, "Your", "mine"));
  L.push(["opp", `Opponent (${opp}): ${stats(view[opp] ?? {}, opp)}`]);
  L.push(...area(opp, "Their", "theirs"));
  if (view.run) {
    const run = view.run;
    L.push(["run", `RUN on ${serverName(run.server?.[0] ?? "")} · phase ${run.phase} · position ${run.position}`]);
    const ice = currentIce(view);
    if (ice) {
      L.push(["run.ice", `Current ice: ${cardLine(ice, side)}`]);
      if (ice.rezzed)
        (ice.subroutines ?? []).forEach((sub: any, i: number) => {
          const by = sub.broken && sub.breaker != null ? findCard(view, sub.breaker)?.title : undefined;
          L.push([`run.sub${i}`, `  subroutine: ${render(sub.label)} — ${sub.broken ? `broken${by ? ` by ${by}` : ""}` : sub.fired ? "fired" : sub.resolve === false ? "will not fire" : "unbroken"}`]);
        });
    }
  }
  const prompt = promptOf(view, side);
  if (prompt) L.push(["prompt", `PROMPT (${prompt["prompt-type"] ?? "other"}): ${render(prompt.msg)}${prompt.card?.title ? ` — from ${prompt.card.title}` : ""}`]);
  if (actionError) L.push(["error", `LAST ACTION FAILED: ${actionError}`]);
  return L.filter(([, t]) => t);
}

export function logLines(view: any, render: Render): string[] {
  return (view?.log ?? []).map((e: any) => (e.user === "__system__" ? render(e.text) : `${e.user?.username ?? "?"} says: ${render(e.text)}`));
}
