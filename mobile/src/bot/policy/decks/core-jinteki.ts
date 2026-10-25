import { byCommand } from "../observe.ts";
import { cardAction, playOf, proposal } from "../generic.ts";
import { registerPolicy } from "../registry.ts";
import { fromCandidate } from "../runs.ts";
import { agendaProgress, iceThreat, rezCostOf } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { CORE_JINTEKI } from "./core.ts";
import { glacier } from "./gateway-corp.ts";

const runnerGrip = (obs: Observation) => Number(obs.opp["hand-count"] ?? 0);

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = glacier.proposals(obs, plan, base);
  const push = (p: Proposal | null) => p && out.push(p);
  const vd = glacier.inHand(obs, "Anoetic Void");
  const scoring = glacier.scoringRemote(obs) ?? glacier.remotes(obs).find((s) => s.ices.length > 0 && !s.content.length);
  if (vd && scoring && scoring.ices.length > 0 && !scoring.content.some((c: any) => c.title === "Anoetic Void") && obs.hand.length >= 3) push(proposal(playOf(obs, vd, scoring.label), 58, `Anoetic Void in ${scoring.label}: two credits and two cards end any run`, "install-upgrade"));
  const installedAgenda = glacier.agendaIn(obs);
  for (const s of glacier.remotes(obs)) {
    for (const card of s.content) {
      if (card.title !== "Urtica Cipher" || !s.ices.length || installedAgenda) continue;
      const have = agendaProgress(card).have;
      if (have < 2 && obs.credits >= 3 && obs.hand.some((c) => c.type === "Agenda")) push(proposal(cardAction(obs, card, "advance"), 44, `advance Urtica Cipher (${have}): looks like the agenda the Runner expects, and bites harder`, "bluff"));
    }
  }
  for (const p of out) {
    if (p.kind === "advance" && obs.hand.some((c) => c.type === "Agenda") && /Urtica/.test(p.why)) p.score = Math.min(p.score, 30);
    if (p.kind === "install-agenda" && obs.memory.notes.scoredPointsThisTurn) p.score -= 5;
  }
  return out;
}

function run(obs: Observation, plan: Plan): Proposal | null {
  const ice = obs.currentIce;
  const rez = ice ? byCommand(obs, "rez", (c) => (c.args as any)?.card?.cid === ice.cid)[0] : undefined;
  if (rez && ice && !ice.rezzed) {
    const threat = iceThreat({ ...ice, subroutines: ice.subroutines ?? [] }, obs.info(ice), Number(obs.opp.credit ?? 0));
    const cost = rezCostOf(ice);
    const grip = runnerGrip(obs);
    if (threat.damage > 0 && grip <= threat.damage && cost <= obs.credits) return fromCandidate(rez, 95, `rez ${ice.title}: ${threat.damage} net damage against ${grip} cards in the grip`, "rez");
  }
  return glacier.run(obs, plan);
}

export const coreJinteki: DeckPolicy = registerPolicy({
  id: "core-jinteki-punish",
  version: "0.4.0",
  side: "corp",
  decks: [CORE_JINTEKI],
  ...glacier,
  proposals,
  run,
});
