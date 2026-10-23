import { registerPolicy } from "../registry.ts";
import type { DeckPolicy } from "../types.ts";
import { CORE_CRIMINAL } from "./core.ts";
import { centralPressure } from "./gateway-runner.ts";

export const coreCriminal: DeckPolicy = registerPolicy({
  id: "core-criminal-central-pressure",
  version: "0.2.0",
  side: "runner",
  decks: [CORE_CRIMINAL],
  ...centralPressure,
});
