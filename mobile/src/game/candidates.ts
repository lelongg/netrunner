import type { Side } from "../engine.ts";
import { basicCommands, cardCommands, cardRef, findCard, promptOf, runCommands } from "./actions.ts";
import { type Render, cardLine, otherSide, remoteKeys, serverName } from "./describe.ts";

export interface Candidate {
  label: string;
  group?: string;
  short?: string;
  command: string;
  args?: unknown;
  amount?: { min: number; max: number };
  text?: boolean;
  say?: string;
  check?: boolean;
  card?: any;
}

export const INSTALL_TARGETS = (view: any, card: any) => {
  const remotes = remoteKeys(view.corp?.servers).map(serverName);
  return card.type === "ICE" || card.type === "Upgrade" ? ["HQ", "R&D", "Archives", ...remotes, "New remote"] : [...remotes, "New remote"];
};

export function visibleCards(view: any, side: Side): any[] {
  const cards: any[] = [];
  const collect = (x: any) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(collect);
    if (x.cid && x.title) cards.push(x);
    for (const k of ["hand", "servers", "ices", "content", "rig", "program", "hardware", "resource", "facedown", "hosted", "identity", "current", "scored", "play-area", "discard", "hq", "rd", "archives"]) if (k in x) collect(x[k]);
    if (x.servers) for (const v of Object.values(x.servers)) collect(v);
  };
  collect(view[side]);
  collect(view[otherSide(side)]);
  return cards;
}

export function candidateActions(view: any, side: Side, render: Render): Candidate[] {
  if (!view || view.winner) return [];
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (a: Candidate) => {
    const key = JSON.stringify([a.command, a.args, a.say]);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(a);
  };
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  const me = view[side] ?? {};
  if (prompt && ptype !== "run" && ptype !== "waiting") {
    const eid = prompt.eid;
    const choices = prompt.choices;
    if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.number != null)
      push({ label: `Choose a number`, command: "choice", args: { eid }, amount: { min: Number(choices.minimum ?? 0), max: Number(choices.number) } });
    else if (ptype === "trace") push({ label: `Spend credits on the trace`, command: "choice", args: { eid }, amount: { min: 0, max: Number(choices ?? 0) } });
    else if (choices === "credit") push({ label: `Choose an amount of credits`, command: "choice", args: { eid }, amount: { min: 0, max: Number(me.credit ?? 0) } });
    else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices["card-title"] !== undefined) push({ label: `Name a card`, command: "choice", args: { eid }, text: true });
    else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.counter) {
      const card = findCard(view, prompt.card?.cid);
      push({ label: `Choose a number of ${choices.counter} counters`, command: "choice", args: { eid }, amount: { min: 0, max: Number(card?.counter?.[choices.counter] ?? 0) } });
    } else if (Array.isArray(choices)) {
      for (const cid of prompt.selectable ?? []) {
        const card = findCard(view, cid);
        if (card) push({ label: `Select ${cardLine(card, side)}${card.zone ? ` (${card.zone.join(" ")})` : ""}`, command: "select", args: { card: cardRef(card), eid }, card });
      }
      for (const c of choices) {
        if (c.value === "Hide") continue;
        const label = c.value && typeof c.value === "object" ? c.value.title ?? render(c.value) : render(c.value);
        push({ label: ptype === "select" ? `${label} (finish selecting)` : `Choose: ${label}`, command: "choice", args: { eid, choice: { uuid: c.uuid } }, card: c.value && typeof c.value === "object" && c.value.cid ? findCard(view, c.value.cid) ?? c.value : undefined });
      }
      if (ptype === "select" && !(prompt.selectable ?? []).length && choices.every((c: any) => c.value === "Hide")) push({ label: "Close the prompt (no valid target)", command: "say", say: "/close-prompt" });
    }
    return out;
  }
  const inRun = !!(view.run || view.encounters);
  const base = inRun ? runCommands(view, side) : basicCommands(view, side);
  for (const c of base) {
    if (c.enabled === false || c.command === "toggle-auto-no-action") continue;
    if (c.command === "generate-runnable-zones") {
      for (const key of ["hq", "rd", "archives", ...remoteKeys(view.corp?.servers)]) push({ label: `Run on ${serverName(key)}`, group: "Run on", short: serverName(key), command: "run", args: { server: serverName(key) } });
      continue;
    }
    push({ label: render(c.label), command: c.command, args: c.args, check: !!c.check });
  }
  for (const card of visibleCards(view, side)) {
    for (const c of cardCommands(card, view, side)) {
      if (c.enabled === false || c.command === "select" || c.command === "choice") continue;
      if (c.command === "generate-install-list") {
        for (const t of INSTALL_TARGETS(view, card)) push({ label: `Install ${card.title} in ${t}`, group: `Install ${card.title} in`, short: t, command: "play", args: { card: cardRef(card), server: t }, card });
        continue;
      }
      push({ label: `${card.title}: ${render(c.label)}`, command: c.command, args: c.args, check: !!c.check, card });
    }
  }
  return out;
}
