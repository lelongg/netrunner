import type { EngineApi, GameHandle, Side } from "../../engine.ts";
import type { Move, Observation, Proposal } from "./types.ts";

export interface SimOutcome {
  refused: boolean;
  view: any | null;
}

export type Simulator = (moves: Move[]) => SimOutcome;
export type AsyncSimulator = (moves: Move[]) => Promise<SimOutcome>;

export interface SimReport {
  refused: boolean;
  delta: number;
  steps: number;
  unresolved: boolean;
}

const HIDDEN = /\b(draw|access|reveal|look at|search|shuffle|random|expose|run\b|trace)/i;
const DIRECT = new Set(["credit", "advance", "score", "rez", "derez", "remove-tag", "purge", "trash", "trash-resource"]);
const SKIP = new Set(["draw", "run", "say", "toast", "end-turn", "jack-out", "continue", "start-turn", "toggle-auto-no-action", "generate-runnable-zones", "generate-install-list"]);

export function simulatable(p: Proposal, obs: Observation): boolean {
  const { command, args, say } = p.move;
  if (say || SKIP.has(command)) return false;
  if (DIRECT.has(command)) return true;
  if (obs.run || obs.encounter) return false;
  if (command === "choice" || command === "select") {
    const prompt = obs.prompt;
    if (!prompt || !obs.myTurn) return false;
    const card = prompt.card;
    if (card && card.side && String(card.side).toLowerCase() !== obs.side) return false;
    return !HIDDEN.test(`${obs.promptText} ${card ? obs.info(card).text ?? "" : ""}`);
  }
  const key = JSON.stringify(args ?? null);
  const candidate = obs.candidates.find((c) => c.command === command && JSON.stringify(c.args ?? null) === key);
  const card = candidate?.card ?? (args as any)?.card;
  if (!card) return false;
  const text = obs.info(card).text ?? "";
  if (command === "play" && card.type !== "Event" && card.type !== "Operation") return true;
  return !HIDDEN.test(text);
}

export function viewSignature(view: any, side: Side): string {
  const me = view?.[side] ?? {};
  const servers = Object.values<any>(view?.corp?.servers ?? {});
  const rig = view?.runner?.rig ?? {};
  const prompt = me["prompt-state"] ?? me.prompt?.[0];
  return [me.click, me.credit, me["agenda-point"], Array.isArray(me.hand) ? me.hand.length : me["hand-count"], view?.log?.length, servers.map((s) => `${(s.ices ?? []).map((i: any) => `${i.rezzed ? 1 : 0}${i["advance-counter"] ?? 0}`).join("")}/${(s.content ?? []).map((c: any) => `${c.rezzed ? 1 : 0}${c["advance-counter"] ?? 0}`).join("")}`).join("|"), ["program", "hardware", "resource"].map((z) => (rig[z] ?? []).length).join(","), prompt?.["prompt-type"], prompt?.eid?.eid, view?.run?.phase, view?.run?.position, view?.["active-player"], view?.turn].join(":");
}

export function applyMoves(engine: EngineApi, game: GameHandle, side: Side, moves: Move[]): SimOutcome {
  const snapshot = engine.mark(game);
  const before = viewSignature(engine.view(game, side), side);
  try {
    for (const [i, m] of moves.entries()) {
      try {
        engine.attempt(game, side, m.command, m.args ?? null);
      } catch {
        return { refused: true, view: null };
      }
      if (i === 0 && moves.length === 1 && viewSignature(engine.view(game, side), side) === before) return { refused: true, view: null };
    }
    const view = engine.view(game, side);
    if (moves.length > 1 && viewSignature(view, side) === before) return { refused: true, view: null };
    return { refused: false, view };
  } finally {
    engine.restore(game, snapshot);
  }
}

export function engineSimulator(engine: EngineApi, game: GameHandle, side: Side): Simulator {
  return (moves) => applyMoves(engine, game, side, moves);
}
