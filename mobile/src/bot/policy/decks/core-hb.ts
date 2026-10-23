import { byCommand } from "../observe.ts";
import { proposal } from "../generic.ts";
import { registerPolicy } from "../registry.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { CORE_HB } from "./core.ts";
import { glacier } from "./gateway-corp.ts";

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = glacier.proposals(obs, plan, base);
  const push = (p: Proposal | null) => p && out.push(p);
  for (const s of glacier.remotes(obs)) {
    for (const card of s.content) {
      if (card.title === "Humanoid Resources" && card.rezzed && obs.clicks >= 3 && obs.hand.filter((c) => c.type !== "Agenda").length >= 2) {
        const ability = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === card.cid)[0];
        if (ability) push(proposal(ability, 64, "Humanoid Resources: four credits, three cards and two installs", "click-economy"));
      }
    }
  }
  return out;
}

export const coreHb: DeckPolicy = registerPolicy({
  id: "core-hb-glacier",
  version: "0.2.0",
  side: "corp",
  decks: [CORE_HB],
  ...glacier,
  proposals,
});
