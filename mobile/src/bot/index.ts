import type { Side } from "../engine.ts";
import { HeuristicBot, type Lookup, type Move } from "./heuristic.ts";
import { type AsyncTools, PolicyBot, type BotOptions } from "./policy/bot.ts";
import { type AnyDeck, findPolicy } from "./policy/registry.ts";
import "./policy/decks/index.ts";

export interface Bot {
  readonly side: Side;
  decide(view: any): Move | null;
  decideAsync?(view: any, tools: AsyncTools): Promise<Move | null>;
  trialMove?(view: any, side: Side): Move | null;
  applied?(move: Move): void;
}

export type BotKind = "heuristic" | "policy" | "auto";

export function makeBot(side: Side, deck: AnyDeck | undefined, lookup: Lookup, kind: BotKind = "auto", options: BotOptions = {}): Bot {
  const match = kind === "heuristic" ? null : findPolicy(side, deck);
  if (kind === "policy" || match) return new PolicyBot(side, match?.policy ?? null, lookup, { rescue: true, deck, ...options });
  return new HeuristicBot(side, lookup, options.random);
}

export { HeuristicBot, PolicyBot, findPolicy };
