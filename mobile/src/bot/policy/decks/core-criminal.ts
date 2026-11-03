import { registerPolicy } from "../registry.ts";
import type { DeckPolicy } from "../types.ts";
import { CORE_CRIMINAL } from "./core.ts";
import { samplesOf } from "./samples.ts";
import { runnerPrompt, runnerProposals } from "./extras.ts";
import { centralPressure } from "./gateway-runner.ts";

export const coreCriminal: DeckPolicy = registerPolicy({
  id: "core-criminal-central-pressure",
  version: "0.4.0",
  side: "runner",
  decks: [CORE_CRIMINAL, ...samplesOf("Criminal", "runner")],
  ...centralPressure,
  proposals: runnerProposals,
  prompt: runnerPrompt,
});
