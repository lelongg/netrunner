import type { Side } from "../engine.ts";
import type { Bot } from "./index.ts";
import type { Move } from "./heuristic.ts";
import type { AsyncTools } from "./policy/bot.ts";
import type { BotScript } from "../game/coachScript.ts";
import { promptOf } from "../game/actions.ts";

export class ScriptedBot implements Bot {
  readonly side: Side;
  private done = new Map<number, number>();
  private pending: { move: Move; turn: number; next: number } | null = null;
  private tries = { key: "", count: 0 };
  decideAsync?: (view: any, tools: AsyncTools) => Promise<Move | null>;

  constructor(
    private inner: Bot,
    private script: BotScript,
  ) {
    this.side = inner.side;
    if (inner.decideAsync) this.decideAsync = (view, tools) => Promise.resolve(this.scripted(view)).then((m) => m ?? inner.decideAsync!(view, tools));
  }

  decide(view: any): Move | null {
    return this.scripted(view) ?? this.inner.decide(view);
  }

  trialMove(view: any, side: Side) {
    return this.inner.trialMove?.(view, side) ?? null;
  }

  applied(move: Move) {
    if (this.pending?.move === move) this.done.set(this.pending.turn, this.pending.next);
    this.pending = null;
    this.inner.applied?.(move);
  }

  private scripted(view: any): Move | null {
    if (!view || view.winner) return null;
    const prompt = promptOf(view, this.side);
    if (prompt?.["prompt-type"] === "mulligan") {
      const keep = (prompt.choices ?? []).find((c: any) => /^keep$/i.test(String(c.value)));
      if (keep) return { command: "choice", args: { eid: prompt.eid, choice: { uuid: keep.uuid } } };
    }
    const reaction = this.script.react?.(view);
    if (reaction) return reaction;
    const steps = this.script.turns[view.turn];
    const main = view["active-player"] === this.side && !view.run && !view["end-turn"] && !view["corp-phase-12"] && !view["runner-phase-12"] && (view[this.side]?.click ?? 0) > 0 && !prompt;
    if (!steps || !main) return null;
    for (let i = this.done.get(view.turn) ?? 0; i < steps.length; i++) {
      const move = steps[i](view);
      const key = `${view.turn}:${i}`;
      this.tries = this.tries.key === key ? { key, count: this.tries.count + 1 } : { key, count: 1 };
      if (move && this.tries.count <= 3) {
        this.pending = { move, turn: view.turn, next: i + 1 };
        return move;
      }
    }
    this.done.set(view.turn, steps.length);
    return null;
  }
}
