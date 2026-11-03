import { byCommand } from "../observe.ts";
import { proposal } from "../generic.ts";
import { registerPolicy } from "../registry.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { CORE_HB } from "./core.ts";
import { samplesOf } from "./samples.ts";
import { corpExtra, corpPrompt, corpProposals } from "./extras.ts";
import { glacier } from "./gateway-corp.ts";

function extras(obs: Observation, plan: Plan, out: Proposal[], push: (p: Proposal | null) => void) {
  for (const s of glacier.remotes(obs)) {
    for (const card of s.content) {
      if (card.title === "Humanoid Resources" && card.rezzed && obs.clicks >= 3 && obs.hand.filter((c) => c.type !== "Agenda").length >= 2) {
        const ability = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === card.cid)[0];
        if (ability) push(proposal(ability, 64, "Humanoid Resources: four credits, three cards and two installs", "click-economy"));
      }
    }
  }
}

corpExtra(extras);

export const coreHb: DeckPolicy = registerPolicy({
  id: "core-hb-glacier",
  version: "0.5.0",
  side: "corp",
  decks: [CORE_HB, ...samplesOf("Haas-Bioroid", "corp")],
  ...glacier,
  proposals: corpProposals,
});
