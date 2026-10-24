import type { DeckList } from "../types.ts";
import { CORE_DECKS } from "./core.ts";
import { GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE, GATEWAY_RUNNER_BEGINNER, GATEWAY_RUNNER_INTERMEDIATE } from "./gateway.ts";

const KNOWN: DeckList[] = [...CORE_DECKS, GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE, GATEWAY_RUNNER_BEGINNER, GATEWAY_RUNNER_INTERMEDIATE];

export const knownDeck = (identity: string | undefined): DeckList | undefined => (identity ? KNOWN.find((d) => d.identity === identity) : undefined);
