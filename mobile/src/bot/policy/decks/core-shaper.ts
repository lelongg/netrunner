import { byCommand } from "../observe.ts";
import { playOf, proposal, serverValue } from "../generic.ts";
import { choiceMove, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { registerPolicy } from "../registry.ts";
import { fromCandidate } from "../runs.ts";
import { estimateRun, isIcebreaker, playCostOf } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { CORE_SHAPER } from "./core.ts";
import { centralPressure } from "./gateway-runner.ts";

const memoryLeft = (obs: Observation) => Number(obs.me.memory?.available ?? 4) - Number(obs.me.memory?.used ?? 0);
const inRig = (obs: Observation, title: string) => obs.rig.find((c: any) => c.title === title);

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = centralPressure.proposals(obs, plan, base);
  const push = (p: Proposal | null) => p && out.push(p);
  const mu = memoryLeft(obs);
  const rd = obs.servers.find((s) => s.key === "rd")!;
  const rdRun = estimateRun(obs, rd);
  const rdOpen = !rdRun.blocked && rdRun.damage === 0 && rdRun.credits <= obs.credits;
  const breakersInstalled = obs.rig.filter((c: any) => isIcebreaker(c)).length;

  const conduit = inRig(obs, "Conduit");
  if (conduit && rdOpen && obs.memory.runsThisTurn < 2 && obs.hand.length >= 2) {
    const ability = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === conduit.cid)[0];
    const counters = Number(conduit.counter?.virus ?? 0);
    if (ability) push(proposal(ability, 56 + Math.min(counters, 4) * 6 - rdRun.credits * 2, `Conduit: run R&D for ${1 + counters} accesses`, "run", rdRun.exact));
  }
  for (const card of obs.hand) {
    const cost = playCostOf(card);
    if (cost > obs.credits) continue;
    if (card.title === "Conduit" && !conduit && mu >= 1 && breakersInstalled >= 1) push(proposal(playOf(obs, card), rdOpen ? 60 : 46, "Conduit: every R&D run digs deeper", "install"));
    if (card.title === "Devadatta Drone" && mu >= 1 && obs.credits >= 3) push(proposal(playOf(obs, card), rdOpen ? 50 : 38, "Devadatta Drone: two extra R&D accesses", "install"));
    if (card.title === "DZMZ Optimizer" && !inRig(obs, "DZMZ Optimizer") && obs.hand.some((c) => c.type === "Program")) push(proposal(playOf(obs, card), 50, "DZMZ Optimizer: memory and cheaper programs", "install"));
    if (card.title === "Pantograph" && !obs.rig.some((c: any) => (c.subtypes ?? []).includes("Console"))) push(proposal(playOf(obs, card), 54, "Pantograph: memory and a free install on every agenda", "install"));
    if (card.title === "GAMEDRAGON™ Pro" && breakersInstalled >= 1 && obs.credits >= 4) push(proposal(playOf(obs, card), 40, "GAMEDRAGON Pro: a stronger breaker", "install"));
    if (card.title === "Ritual" && obs.clicks >= 3 && obs.hand.length <= 3) push(proposal(playOf(obs, card), 58, `Ritual: draw ${obs.clicks - 1} cards`, "draw"));
    if (card.title === "Illumination" && rdOpen && obs.hand.filter((c) => c.type !== "Event").length >= 2 && obs.memory.runsThisTurn < 2) push(proposal(playOf(obs, card), 62, "Illumination: run R&D and install three cards cheaply", "run-event", rdRun.exact));
    if (card.title === "Azimat" && mu >= 2 && !inRig(obs, "Azimat") && obs.credits >= 3) push(proposal(playOf(obs, card), 36, "Azimat: two credits a turn for trashing", "install"));
    if (card.title === "\"Knickknack\" O'Brian" && !inRig(obs, "\"Knickknack\" O'Brian") && obs.credits >= 4) push(proposal(playOf(obs, card), 34, "Knickknack: sell the rig's leftovers", "install"));
  }
  for (const p of out) {
    if (p.kind === "install" && /^install (Conduit|Devadatta Drone|DZMZ Optimizer|Pantograph|GAMEDRAGON™ Pro|Azimat|"Knickknack" O'Brian)$/.test(p.why)) p.score = Math.min(p.score, 18);
    if (p.kind === "run" && /^run R&D/.test(p.why) && (conduit || inRig(obs, "Devadatta Drone"))) p.score += 6;
  }
  return out;
}

function prompt(obs: Observation, plan: Plan): Proposal | null {
  const deck = centralPressure.prompt(obs, plan);
  if (deck) return deck;
  const from = promptFrom(obs);
  const text = obs.promptText;
  if (from === "Tāo Salonga: Telepresence Magician" && obs.promptType !== "select") {
    const no = findChoice(obs, /^no$/i) ?? findChoice(obs, /done|cancel/i);
    if (no) return { move: choiceMove(obs, no), score: 60, why: "Tāo: leave the ice where it is", kind: "choice" };
  }
  if (from === "Illumination" && obs.promptType === "select") {
    const pick = [...selectable(obs)].filter((c: any) => c.type !== "Event").sort((a: any, b: any) => (isIcebreaker(b) ? 1 : 0) - (isIcebreaker(a) ? 1 : 0) || playCostOf(b) - playCostOf(a))[0];
    const done = findChoice(obs, /^done$/i);
    if (pick && playCostOf(pick) - 1 <= obs.credits) return { move: selectMove(obs, pick), score: 70, why: `Illumination: install ${pick.title}`, kind: "select" };
    if (done) return { move: choiceMove(obs, done), score: 60, why: "Illumination: nothing more to install", kind: "select" };
  }
  if (from === "Devadatta Drone" && obs.promptType !== "select") {
    const yes = findChoice(obs, /^yes$/i);
    if (yes) return { move: choiceMove(obs, yes), score: 70, why: "Devadatta Drone: one more card from R&D", kind: "choice" };
  }
  if (from === "Pantograph" && obs.promptType === "select") {
    const pick = [...selectable(obs)].filter((c: any) => playCostOf(c) <= obs.credits).sort((a: any, b: any) => (isIcebreaker(b) ? 1 : 0) - (isIcebreaker(a) ? 1 : 0) || playCostOf(b) - playCostOf(a))[0];
    const done = findChoice(obs, /^done$/i);
    if (pick) return { move: selectMove(obs, pick), score: 70, why: `Pantograph: install ${pick.title}`, kind: "select" };
    if (done) return { move: choiceMove(obs, done), score: 60, why: "Pantograph: nothing to install", kind: "select" };
  }
  if (from === "Conduit" && obs.promptType !== "select") {
    const yes = findChoice(obs, /^yes$/i);
    if (yes) return { move: choiceMove(obs, yes), score: 70, why: "Conduit: one more counter", kind: "choice" };
  }
  return null;
}

export const coreShaper: DeckPolicy = registerPolicy({
  id: "core-shaper-lock",
  version: "0.2.0",
  side: "runner",
  decks: [CORE_SHAPER],
  ...centralPressure,
  proposals,
  prompt,
});
