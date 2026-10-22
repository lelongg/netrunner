import { cardRef, findCard } from "../../game/actions.ts";
import type { Candidate } from "../../game/candidates.ts";
import { agendaProgress, isIcebreaker, playCostOf, rezCostOf, strengthOf } from "./tactics.ts";
import type { Observation, Plan, Proposal } from "./types.ts";

export const choiceMove = (obs: Observation, c: any): Proposal["move"] => ({ command: "choice", args: { eid: obs.prompt.eid, choice: { uuid: c.uuid } } });
export const selectMove = (obs: Observation, card: any): Proposal["move"] => ({ command: "select", args: { card: cardRef(card), eid: obs.prompt.eid } });
export const numberMove = (obs: Observation, n: number): Proposal["move"] => ({ command: "choice", args: { eid: obs.prompt.eid, choice: n } });

export const choiceLabel = (obs: Observation, c: any): string => (c.value && typeof c.value === "object" ? c.value.title ?? "" : String(c.value ?? ""));
export const choices = (obs: Observation): any[] => (Array.isArray(obs.prompt?.choices) ? obs.prompt.choices.filter((c: any) => c.value !== "Hide") : []);
export const findChoice = (obs: Observation, re: RegExp) => choices(obs).find((c) => re.test(choiceLabel(obs, c)));
export const selectable = (obs: Observation): any[] => (obs.prompt?.selectable ?? []).map((cid: unknown) => findCard(obs.view, cid)).filter((c: any) => c && !c.selected);
export const promptFrom = (obs: Observation) => String(obs.prompt?.card?.title ?? "");

export function cardWorth(obs: Observation, card: any): number {
  const type = card?.type;
  if (obs.side === "corp") {
    if (type === "Agenda") return 100;
    if (type === "ICE") return 40 + strengthOf(card);
    if (type === "Asset" || type === "Upgrade") return 25;
    return 15 + playCostOf(card);
  }
  if (isIcebreaker(card)) return 60;
  return type === "Hardware" ? 35 : type === "Resource" ? 30 : type === "Program" ? 40 : 15 + playCostOf(card);
}

function trace(obs: Observation): Proposal {
  const max = Number(obs.prompt.choices ?? 0);
  let spend = 0;
  if (obs.prompt.strength == null) spend = Math.min(max, Math.max(0, obs.credits - 2), 3);
  else {
    const needed = Math.max(0, Number(obs.prompt.strength) - Number(obs.prompt.link ?? 0));
    spend = needed <= max ? needed : 0;
  }
  return { move: numberMove(obs, spend), score: 50, why: `trace: spend ${spend}`, kind: "trace" };
}

export function genericSelect(obs: Observation): Proposal | null {
  const cards = selectable(obs);
  const done = choices(obs).find((c) => c.value === "Done");
  const msg = obs.promptText;
  const mine = (c: any) => c.side === (obs.side === "corp" ? "Corp" : "Runner");
  let pick: any;
  let why = "";
  if (/^choose a credit providing card/i.test(msg)) {
    const funded = cards.find((c) => Number(c.counter?.credit ?? 0) > 0);
    if (funded) return { move: selectMove(obs, funded), score: 30, why: `pay with the credits on ${funded.title}`, kind: "select" };
    if (done) return { move: choiceMove(obs, done), score: 30, why: "pay the rest from the credit pool", kind: "select" };
  }
  if (/discard/i.test(msg)) {
    pick = [...cards].sort((a, b) => cardWorth(obs, a) - cardWorth(obs, b))[0];
    why = "discard the least valuable card";
  } else if (/ice/i.test(msg) && obs.side === "corp" && /install/i.test(msg)) {
    pick = [...cards].filter(mine).sort((a, b) => strengthOf(b) - strengthOf(a))[0];
    why = "install the strongest ice";
  } else {
    const hostile = /(trash|derez|expose|damage|destroy|remove)/i.test(msg);
    pick = cards.find((c) => (hostile ? !mine(c) : mine(c))) ?? cards[0];
    why = hostile ? "target an opposing card" : "target one of my cards";
  }
  if (pick) return { move: selectMove(obs, pick), score: 30, why, kind: "select" };
  if (done) return { move: choiceMove(obs, done), score: 20, why: "nothing left to select", kind: "select" };
  return null;
}

export function scoreChoice(obs: Observation, label: string, value: any): { score: number; why: string } {
  if (value && typeof value === "object") return value.cid ? { score: 20, why: "a card" } : { score: 10, why: "an object" };
  if (/^steal/i.test(label)) return { score: 100, why: "steal the agenda" };
  const trash = label.match(/pay (\d+) \[credits?\] to trash/i);
  if (trash) return obs.credits - Number(trash[1]) >= 2 ? { score: 60, why: "trash the accessed card" } : { score: -10, why: "cannot afford the trash" };
  if (/^(no action|done|ok|carry on!?|continue)$/i.test(label)) return { score: 15, why: "nothing better to do" };
  if (/^cancel$/i.test(label)) return { score: 0, why: "cancel" };
  if (/^yes$/i.test(label)) return { score: 30, why: "accept the optional effect" };
  if (/^no$/i.test(label)) return { score: 5, why: "decline" };
  const bet = label.match(/^(\d+) \[credits?\]$/i);
  if (bet) return Number(bet[1]) <= Math.min(1, obs.credits) ? { score: 20, why: "spend little" } : { score: 0, why: "too expensive" };
  if (/^(hq|r&d|archives|server \d+|new remote)$/i.test(label)) return { score: 18, why: "a server" };
  return { score: 16, why: "default choice" };
}

export function genericPrompt(obs: Observation, plan: Plan | null): Proposal | null {
  const prompt = obs.prompt;
  if (!prompt) return null;
  const ptype = obs.promptType;
  if (ptype === "waiting" || ptype === "run") return null;
  if (ptype === "select") return genericSelect(obs);
  if (ptype === "trace") return trace(obs);
  const ch = prompt.choices;
  if (ch === "credit") return { move: numberMove(obs, 0), score: 20, why: "spend no credits", kind: "number" };
  if (ch && !Array.isArray(ch) && typeof ch === "object") {
    if (ch.number != null) return { move: numberMove(obs, Number(ch.default ?? ch.minimum ?? 0)), score: 20, why: "default amount", kind: "number" };
    if (ch.counter) {
      const card = findCard(obs.view, prompt.card?.cid);
      return { move: numberMove(obs, Number(card?.counter?.[ch.counter] ?? 0)), score: 20, why: "all counters", kind: "number" };
    }
    if (ch["card-title"] !== undefined) return { move: numberMove(obs, (obs.side === "corp" ? "Hedge Fund" : "Sure Gamble") as any), score: 20, why: "name a common card", kind: "title" };
  }
  const list = choices(obs);
  if (list.length) {
    let best: { c: any; score: number; why: string } | null = null;
    for (const c of list) {
      const label = choiceLabel(obs, c);
      const { score, why } = scoreChoice(obs, label, c.value);
      const s = score + obs.random() * 0.01;
      if (!best || s > best.score) best = { c, score: s, why };
    }
    if (best) return { move: choiceMove(obs, best.c), score: best.score, why: best.why, kind: "choice" };
  }
  return null;
}

export function mulliganProposal(obs: Observation, keep: boolean, why: string): Proposal | null {
  const c = findChoice(obs, keep ? /^keep$/i : /^mulligan$/i);
  return c ? { move: choiceMove(obs, c), score: 100, why, kind: "mulligan" } : null;
}

export const agendaToAdvance = (cards: any[]) => [...cards].filter((c) => c.type === "Agenda").sort((a, b) => agendaProgress(b).have - agendaProgress(a).have)[0];
export const cheapestIce = (cards: any[]) => [...cards].filter((c) => c.type === "ICE").sort((a, b) => rezCostOf(a) - rezCostOf(b))[0];
export const strongestIce = (cards: any[]) => [...cards].filter((c) => c.type === "ICE").sort((a, b) => strengthOf(b) - strengthOf(a))[0];
export type { Candidate };
