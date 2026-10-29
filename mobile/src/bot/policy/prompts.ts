import { cardRef, findCard } from "../../game/actions.ts";
import { agendaProgress, gainOf, isIcebreaker, playCostOf, rezCostOf, strengthOf } from "./tactics.ts";
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
    const net = type === "Operation" ? gainOf(obs.info(card).text) - playCostOf(card) : 0;
    if (net >= 3) return 50 + net;
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

export function genericSelect(obs: Observation): Proposal[] {
  const cards = selectable(obs);
  const done = choices(obs).find((c) => c.value === "Done");
  const msg = obs.promptText;
  const mine = (c: any) => c.side === (obs.side === "corp" ? "Corp" : "Runner");
  const out: Proposal[] = [];
  let pick: any;
  let why = "";
  if (/^choose a credit providing card/i.test(msg)) {
    const funded = cards.find((c) => Number(c.counter?.credit ?? 0) > 0);
    if (funded) out.push({ move: selectMove(obs, funded), score: 30, why: `pay with the credits on ${funded.title}`, kind: "select" });
    if (done) out.push({ move: choiceMove(obs, done), score: 25, why: "pay the rest from the credit pool", kind: "select" });
    return out;
  }
  if (/discard/i.test(msg)) {
    pick = [...cards].sort((a, b) => cardWorth(obs, a) - cardWorth(obs, b))[0];
    why = "discard the least valuable card";
  } else if (/ice/i.test(msg) && obs.side === "corp" && /install/i.test(msg)) {
    pick = [...cards].filter(mine).sort((a, b) => strengthOf(b) - strengthOf(a))[0];
    why = "install the strongest ice";
  } else {
    const hostile = /(trash|derez|expose|damage|destroy|remove)/i.test(msg);
    const own = cards.filter(mine);
    if (hostile && own.length === cards.length) {
      pick = [...own].sort((a, b) => cardWorth(obs, a) - cardWorth(obs, b))[0];
      why = "give up the least valuable of my cards";
    } else {
      pick = cards.find((c) => (hostile ? !mine(c) : mine(c))) ?? cards[0];
      why = hostile ? "target an opposing card" : "target one of my cards";
    }
  }
  if (pick) out.push({ move: selectMove(obs, pick), score: 30, why, kind: "select" });
  if (done) out.push({ move: choiceMove(obs, done), score: 20, why: "nothing left to select", kind: "select" });
  return out;
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
  const gain = label.match(/^gain (\d+) \[credits?\]/i);
  if (gain) return { score: 22 + Number(gain[1]) * 0.5, why: `gain ${gain[1]} credits` };
  const draw = label.match(/^draw (\d+) cards?/i);
  if (draw) {
    const deckLeft = Number(obs.me["deck-count"] ?? 0);
    if (obs.side === "corp" && deckLeft <= 8) return { score: 2, why: "R&D is nearly empty" };
    return obs.hand.length <= 3 ? { score: 26, why: `draw ${draw[1]}: the hand is thin` } : { score: 18, why: `draw ${draw[1]}` };
  }
  return { score: 16, why: "default choice" };
}

export function genericPrompt(obs: Observation, plan: Plan | null): Proposal[] {
  const prompt = obs.prompt;
  if (!prompt) return [];
  const ptype = obs.promptType;
  if (ptype === "waiting" || ptype === "run") return [];
  if (ptype === "select") return genericSelect(obs);
  if (ptype === "trace") return [trace(obs)];
  const ch = prompt.choices;
  if (ch === "credit") return [{ move: numberMove(obs, 0), score: 20, why: "spend no credits", kind: "number" }];
  if (ch && !Array.isArray(ch) && typeof ch === "object") {
    if (ch.number != null) return [{ move: numberMove(obs, Number(ch.default ?? ch.minimum ?? 0)), score: 20, why: "default amount", kind: "number" }];
    if (ch.counter) {
      const card = findCard(obs.view, prompt.card?.cid);
      return [{ move: numberMove(obs, Number(card?.counter?.[ch.counter] ?? 0)), score: 20, why: "all counters", kind: "number" }];
    }
    if (ch["card-title"] !== undefined) return [{ move: numberMove(obs, (obs.side === "corp" ? "Hedge Fund" : "Sure Gamble") as any), score: 20, why: "name a common card", kind: "title" }];
  }
  return choices(obs).map((c) => {
    const { score, why } = scoreChoice(obs, choiceLabel(obs, c), c.value);
    return { move: choiceMove(obs, c), score: score + obs.random() * 0.01, why, kind: "choice" };
  });
}

export function mulliganProposal(obs: Observation, keep: boolean, why: string): Proposal | null {
  const c = findChoice(obs, keep ? /^keep$/i : /^mulligan$/i);
  return c ? { move: choiceMove(obs, c), score: 100, why, kind: "mulligan" } : null;
}

export const agendaToAdvance = (cards: any[]) => [...cards].filter((c) => c.type === "Agenda").sort((a, b) => agendaProgress(b).have - agendaProgress(a).have)[0];
export const cheapestIce = (cards: any[]) => [...cards].filter((c) => c.type === "ICE").sort((a, b) => rezCostOf(a) - rezCostOf(b))[0];
export const strongestIce = (cards: any[]) => [...cards].filter((c) => c.type === "ICE").sort((a, b) => strengthOf(b) - strengthOf(a))[0];
