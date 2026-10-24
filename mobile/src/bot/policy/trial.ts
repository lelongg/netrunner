import type { EngineApi, GameHandle, Side } from "../../engine.ts";
import { promptOf } from "../../game/actions.ts";
import type { Move } from "./types.ts";

export interface RunTrial {
  reached: boolean;
  credits: number;
  damage: number;
  tags: number;
  steps: number;
}

export type Trial = (server: string) => RunTrial | null;
export type AsyncTrial = (server: string) => Promise<RunTrial | null>;
export type TrialStep = (view: any, side: Side) => Move | null;

const other = (side: Side): Side => (side === "corp" ? "runner" : "corp");

function pending(view: any, side: Side): boolean {
  const p = promptOf(view, side);
  return !!p && p["prompt-type"] !== "waiting" && p["prompt-type"] !== "run";
}

export function runTrial(engine: EngineApi, game: GameHandle, side: Side, server: string, step: TrialStep): RunTrial | null {
  if (side !== "runner") return null;
  const snapshot = engine.checkpoint(game);
  try {
    const start = engine.view(game, side);
    const credits = Number(start[side]?.credit ?? 0);
    const hand = Number(start[side]?.hand?.length ?? 0);
    const tags = Number(start[side]?.tag?.total ?? start[side]?.tag?.base ?? 0);
    try {
      engine.act(game, side, "run", { server });
    } catch {
      return null;
    }
    if (engine.unchanged(game, snapshot)) return null;
    let steps = 0;
    let lastKey = "";
    let repeats = 0;
    while (steps < 80) {
      const view = engine.view(game, side);
      const run = view.run;
      const me = view[side] ?? {};
      const done = (reached: boolean): RunTrial => ({ reached, credits: credits - Number(me.credit ?? 0), damage: Math.max(0, hand - Number(me.hand?.length ?? 0)), tags: Math.max(0, Number(me.tag?.total ?? me.tag?.base ?? 0) - tags), steps });
      if (view.winner) return done(false);
      if (!run) return done(false);
      if (run.successful || run.phase === "success") return done(true);
      const opp = other(side);
      const oppView = engine.view(game, opp);
      const mover: Side = pending(view, side) ? side : pending(oppView, opp) ? opp : view["active-player"] === side ? side : opp;
      let move = step(mover === side ? view : oppView, mover);
      let actor = mover;
      if (!move) {
        actor = other(mover);
        move = step(actor === side ? view : oppView, actor);
      }
      if (!move) return done(false);
      const key = `${actor}:${move.command}:${JSON.stringify(move.args ?? null)}:${view.log?.length ?? 0}:${run.phase}:${run.position}`;
      repeats = key === lastKey ? repeats + 1 : 0;
      lastKey = key;
      if (repeats >= 3) return done(false);
      try {
        engine.act(game, actor, move.command, move.args ?? null);
      } catch {
        return done(false);
      }
      steps++;
    }
    return null;
  } finally {
    engine.restore(game, snapshot);
  }
}

export function engineTrial(engine: EngineApi, game: GameHandle, side: Side, step: TrialStep): Trial {
  return (server) => runTrial(engine, game, side, server, step);
}
