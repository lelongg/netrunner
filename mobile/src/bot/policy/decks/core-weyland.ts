import { byCommand } from "../observe.ts";
import { cardAction, playOf, proposal } from "../generic.ts";
import { choiceMove, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { registerPolicy } from "../registry.ts";
import { agendaProgress, tagged } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { CORE_WEYLAND } from "./core.ts";
import { glacier } from "./gateway-corp.ts";

const advancement = (c: any) => agendaProgress(c).have;
const runnerGrip = (obs: Observation) => Number(obs.opp["hand-count"] ?? 0);
const advanceableIce = (obs: Observation) => obs.servers.flatMap((s) => s.ices).filter((i: any) => /you can advance this ice/i.test(obs.info(i).text ?? ""));

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  return glacier.proposals(obs, plan, base, (out, push) => {
  const installed = glacier.agendaIn(obs);
  const freshAdvance = (card: any, score: number, why: string) => {
    if (advancement(card) === 0 && obs.credits >= 1) push(proposal(cardAction(obs, card, "advance"), score, why, "advance"));
  };
  for (const ice of advanceableIce(obs)) {
    if (!ice.rezzed) continue;
    const have = advancement(ice);
    if (have === 0) freshAdvance(ice, obs.credits <= 6 ? 50 : 38, `advance ${ice.title}: Built to Last pays two credits back`);
    else if (ice.title === "Pharos" && have < 3 && obs.credits >= 6 && !installed) push(proposal(cardAction(obs, ice, "advance"), 36, `advance Pharos towards strength ten (${have}/3)`, "advance"));
  }
  const bait = glacier.remotes(obs).find((s) => s.ices.length > 0 && !s.content.length);
  for (const s of glacier.remotes(obs)) {
    for (const card of s.content) {
      if (card.title === "Clearinghouse") freshAdvance(card, 54, "advance Clearinghouse: two credits back and a threat");
    }
  }
  const kpi = glacier.inHand(obs, "Key Performance Indicators");
  if (kpi && obs.credits >= 1) push(proposal(playOf(obs, kpi), obs.hand.some((c) => c.type === "ICE") ? 62 : 46, "Key Performance Indicators: free ice and credits", "economy"));
  const vault = glacier.inHand(obs, "Malapert Data Vault");
  const scoring = glacier.scoringRemote(obs) ?? bait;
  if (vault && scoring && scoring.ices.length > 0 && obs.credits >= 2 && !scoring.content.some((c: any) => c.title === "Malapert Data Vault")) push(proposal(playOf(obs, vault, scoring.label), 40, `Malapert Data Vault in ${scoring.label}: a card every score`, "install-upgrade"));
  const retribution = glacier.inHand(obs, "Retribution");
  const rig = [...(obs.view.runner?.rig?.program ?? []), ...(obs.view.runner?.rig?.hardware ?? [])];
  if (retribution && tagged(obs.view) && obs.credits >= 1 && rig.length) push(proposal(playOf(obs, retribution), 78, "Retribution: trash a program or hardware while the Runner is tagged", "punish"));
  for (const p of out) {
    if (p.kind === "advance" && installed && p.why.includes(installed.card.title) && advancement(installed.card) === 0) p.score += 4;
  }
  });
}

function prompt(obs: Observation, plan: Plan): Proposal | null {
  const deck = glacier.prompt(obs, plan);
  if (deck) return deck;
  const from = promptFrom(obs);
  const text = obs.promptText;
  if (from === "Key Performance Indicators" && obs.promptType !== "select") {
    const order = obs.hand.some((c) => c.type === "ICE") ? [/install/i, /gain 2/i, /advancement/i, /draw/i] : [/gain 2/i, /advancement/i, /draw/i, /install/i];
    for (const re of order) {
      const c = findChoice(obs, re);
      if (c) return { move: choiceMove(obs, c), score: 70, why: `Key Performance Indicators: ${String(c.value)}`, kind: "choice" };
    }
  }
  if (from === "Key Performance Indicators" && obs.promptType === "select") {
    const ice = [...selectable(obs)].filter((c: any) => c.type === "ICE").sort((a: any, b: any) => glacier.iceRank(obs, b) - glacier.iceRank(obs, a))[0];
    if (ice) return { move: selectMove(obs, ice), score: 70, why: `Key Performance Indicators: install ${ice.title} for free`, kind: "select" };
  }
  if (from === "Off the Books" && obs.promptType !== "select" && /search|remove/i.test(text)) {
    const yes = findChoice(obs, /^yes$/i);
    if (yes) return { move: choiceMove(obs, yes), score: 65, why: "Off the Books: fetch a card", kind: "choice" };
  }
  if (from === "Anthill Excavation Contract" && obs.promptType !== "select") {
    const yes = findChoice(obs, /^yes$/i);
    if (yes) return { move: choiceMove(obs, yes), score: 65, why: "Anthill: take the credits and the card", kind: "choice" };
  }
  if (from === "Syailendra" && obs.promptType === "select") {
    const target = selectable(obs).find((c: any) => c.type === "Agenda") ?? selectable(obs).find((c: any) => c.title === "Clearinghouse") ?? selectable(obs)[0];
    if (target) return { move: selectMove(obs, target), score: 70, why: `Syailendra: advance ${target.title}`, kind: "select" };
  }
  return null;
}

export const coreWeyland: DeckPolicy = registerPolicy({
  id: "core-weyland-advance",
  version: "0.3.0",
  side: "corp",
  decks: [CORE_WEYLAND],
  ...glacier,
  proposals,
  prompt,
});
