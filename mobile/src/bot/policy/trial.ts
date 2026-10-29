import type { EngineApi, GameHandle, Side } from "../../engine.ts";
import { basicCommands, promptOf } from "../../game/actions.ts";
import type { Move } from "./types.ts";

export interface RunTrial {
  reached: boolean;
  credits: number;
  damage: number;
  tags: number;
  steps: number;
  prelude: boolean;
  corpCredits?: number;
}

export type Trial = (server: string, prelude?: Move[]) => RunTrial | null;
export type AsyncTrial = (server: string, prelude?: Move[]) => Promise<RunTrial | null>;
export type TrialStep = (view: any, side: Side) => Move | null;

const TURN_COMMANDS = new Set(["start-turn", "end-phase-12", "phase-12-pass-priority", "end-post-discard", "post-discard-pass-priority"]);
const other = (side: Side): Side => (side === "corp" ? "runner" : "corp");

function pending(view: any, side: Side): boolean {
  const p = promptOf(view, side);
  return !!p && p["prompt-type"] !== "waiting" && p["prompt-type"] !== "run";
}

const hidden = (view: any, side: Side) => ({ ...view, [side]: { ...(view[side] ?? {}), hand: [] } });

function act(engine: EngineApi, game: GameHandle, side: Side, move: Move): boolean {
  try {
    engine.act(game, side, move.command, move.args ?? null);
    return true;
  } catch {
    return false;
  }
}

function runnerCounts(view: any) {
  const r = view.runner ?? {};
  return { credits: Number(r.credit ?? 0), hand: Number(r["hand-count"] ?? (Array.isArray(r.hand) ? r.hand.length : 0)), tags: Number(r.tag?.total ?? r.tag?.base ?? 0), corp: Number(view.corp?.credit ?? 0) };
}

function settle(engine: EngineApi, game: GameHandle, side: Side, step: TrialStep, limit: number): boolean {
  for (let i = 0; i < limit; i++) {
    const mine = engine.view(game, side);
    if (mine.winner) return false;
    if (pending(mine, side)) {
      const move = step(mine, side);
      if (!move || !act(engine, game, side, move)) return false;
      continue;
    }
    const opp = other(side);
    const theirs = engine.view(game, opp);
    if (pending(theirs, opp)) {
      const move = step(hidden(theirs, opp), opp);
      if (!move || !act(engine, game, opp, move)) return false;
      continue;
    }
    let moved = false;
    for (const s of [side, opp]) {
      const v = s === side ? mine : theirs;
      const turn = basicCommands(v, s).find((c) => TURN_COMMANDS.has(c.command) && c.enabled !== false);
      if (turn && act(engine, game, s, { command: turn.command, args: turn.args })) {
        moved = true;
        break;
      }
    }
    if (!moved) return true;
  }
  return false;
}

export function runTrial(engine: EngineApi, game: GameHandle, side: Side, server: string, step: TrialStep, prelude: Move[] = []): RunTrial | null {
  const snapshot = engine.checkpoint(game);
  try {
    const ongoing = !!engine.view(game, side).run;
    const before = runnerCounts(engine.view(game, side));
    for (const m of prelude) if (!act(engine, game, side, m)) return null;
    if (side === "corp" && !ongoing) {
      if (!settle(engine, game, side, step, 12)) return null;
      for (let i = 0; i < 4; i++) {
        const v = engine.view(game, "corp");
        if (v["active-player"] !== "corp" || !(Number(v.corp?.click ?? 0) > 0)) break;
        if (!act(engine, game, "corp", { command: "credit" })) return null;
      }
      if (!act(engine, game, "corp", { command: "end-turn" })) return null;
      if (!settle(engine, game, side, step, 16)) return null;
      const v = engine.view(game, "runner");
      if (v["active-player"] !== "runner" || !(Number(v.runner?.click ?? 0) > 0) || v.run) return null;
    }
    if (!ongoing) Object.assign(before, runnerCounts(engine.view(game, side)));
    if (!ongoing && !act(engine, game, "runner", { command: "run", args: { server } })) return null;
    let steps = 0;
    let lastKey = "";
    let repeats = 0;
    while (steps < 80) {
      const view = engine.view(game, side);
      const run = view.run;
      const now = runnerCounts(view);
      const done = (reached: boolean): RunTrial => ({ reached, credits: before.credits - now.credits, damage: Math.max(0, before.hand - now.hand), tags: Math.max(0, now.tags - before.tags), steps, prelude: prelude.length > 0, corpCredits: before.corp - now.corp });
      if (view.winner) return done(false);
      if (!run) return done(false);
      if (run.successful || run.phase === "success") return done(true);
      const opp = other(side);
      const oppView = hidden(engine.view(game, opp), opp);
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
      if (!act(engine, game, actor, move)) return done(false);
      steps++;
    }
    return null;
  } finally {
    engine.restore(game, snapshot);
  }
}

export function engineTrial(engine: EngineApi, game: GameHandle, side: Side, step: TrialStep): Trial {
  return (server, prelude = []) => runTrial(engine, game, side, server, step, prelude);
}
