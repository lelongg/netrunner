import { byCommand } from "../observe.ts";
import { playOf, proposal } from "../generic.ts";
import { registerPolicy } from "../registry.ts";
import { coverage, isIcebreaker, playCostOf } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { CORE_ANARCH } from "./core.ts";
import { centralPressure } from "./gateway-runner.ts";

const memoryLeft = (obs: Observation) => Number(obs.me.memory?.available ?? 4) - Number(obs.me.memory?.used ?? 0);
const counters = (c: any) => Number(c?.counter?.virus ?? 0);

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = centralPressure.proposals(obs, plan, base);
  const push = (p: Proposal | null) => p && out.push(p);
  const mu = memoryLeft(obs);
  const cov = coverage(obs);
  const rigTitles = new Set(obs.rig.map((c: any) => c.title));

  for (const card of obs.rig) {
    if (card.title === "Fermenter") {
      const n = counters(card);
      const ability = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === card.cid)[0];
      if (ability && n >= 3 && (obs.credits < 6 || n >= 5 || obs.clicks === 1)) push(proposal(ability, 48 + n * 4, `Fermenter: cash ${n} counters for ${n * 2} credits`, "click-economy"));
    }
    if (card.title === "Rent Rioters" && obs.clicks >= 3 && obs.credits <= 6 && !obs.hand.some((c) => obs.profile.economyEvents.has(c.title) && playCostOf(c) <= obs.credits)) {
      const ability = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === card.cid)[0];
      if (ability) push(proposal(ability, 62, "Rent Rioters: three clicks for nine credits", "click-economy"));
    }
  }
  for (const card of obs.hand) {
    const cost = playCostOf(card);
    if (cost > obs.credits) continue;
    if (card.title === "Fermenter" && mu >= 1 && obs.rig.filter((c: any) => c.title === "Fermenter").length < 2) push(proposal(playOf(obs, card), obs.turn <= 4 ? 56 : 44, "Fermenter: a credit engine that grows every turn", "install-economy"));
    if (card.title === "Cookbook" && !rigTitles.has("Cookbook") && (obs.hand.some((c) => (c.subtypes ?? []).includes("Virus")) || obs.turn <= 3)) push(proposal(playOf(obs, card), 42, "Cookbook: every virus starts charged", "install"));
    if (card.title === "Leech" && mu >= 1 && !rigTitles.has("Leech") && cov.size >= 1) push(proposal(playOf(obs, card), 46, "Leech: successful central runs weaken the ice", "install"));
    if (card.title === "Gourmand" && mu >= 1 && !rigTitles.has("Gourmand") && obs.credits >= 2) push(proposal(playOf(obs, card), 44, "Gourmand: trash an asset for free on access", "install"));
    if (card.title === "Botulus" && mu >= 1) {
      const wall = obs.servers.filter((s) => !s.remote).flatMap((s) => s.ices).find((i: any) => i.rezzed && !(i.subtypes ?? []).some((t: string) => cov.has(t as any)));
      if (wall) push(proposal(playOf(obs, card), 58, `Botulus on ${wall.title}: a counter a turn breaks it`, "install-breaker"));
    }
    if (card.title === "Scrounge" && obs.clicks >= 2) {
      const lost = (obs.me.discard ?? []).filter((c: any) => isIcebreaker(c) && !rigTitles.has(c.title));
      if (lost.length && mu >= 1) push(proposal(playOf(obs, card), 60, `Scrounge: bring back ${lost[0].title}`, "play"));
    }
    if (card.title === "Carnivore" && !obs.rig.some((c: any) => (c.subtypes ?? []).includes("Console")) && obs.credits >= 6) push(proposal(playOf(obs, card), 48, "Carnivore: memory and a way to trash what matters", "install"));
  }
  for (const p of out) {
    if (p.kind === "install" && /^install (Botulus|Leech|Fermenter|Gourmand|Cookbook)$/.test(p.why)) p.score = Math.min(p.score, 18);
  }
  return out;
}

function prompt(obs: Observation, plan: Plan): Proposal | null {
  const deck = centralPressure.prompt(obs, plan);
  if (deck) return deck;
  const text = obs.promptText;
  if (/^you accessed/i.test(text) && obs.promptType !== "select") {
    const trash = (Array.isArray(obs.prompt.choices) ? obs.prompt.choices : []).find((c: any) => /pay \d+ \[credits?\] to trash/i.test(String(c.value ?? "")));
    const cost = Number(String(trash?.value ?? "").match(/pay (\d+)/i)?.[1] ?? 99);
    const card = obs.prompt.card;
    if (trash && card && card.type !== "Agenda" && obs.credits - cost >= 1 && cost <= 4) return { move: { command: "choice", args: { eid: obs.prompt.eid, choice: { uuid: trash.uuid } } }, score: 72, why: `Loup: trash ${card.title} for ${cost}, gain a credit and a card`, kind: "choice" };
  }
  return null;
}

export const coreAnarch: DeckPolicy = registerPolicy({
  id: "core-anarch-virus",
  version: "0.2.0",
  side: "runner",
  decks: [CORE_ANARCH],
  ...centralPressure,
  proposals,
  prompt,
});
