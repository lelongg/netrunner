import type { EngineApi, GameHandle, Side } from "../engine";
import { cardRef } from "./actions";

export type LocalEntry = { side: Side; kind: "act"; command: string; args: unknown } | { side: Side; kind: "say"; user?: string; text: string } | { side: Side; kind: "concede" };

export type Op = { k: "boot"; setup: unknown; seed: number[] } | { k: "exec"; entry: LocalEntry };

export interface RunResult {
  failed: number[];
  views: Partial<Record<Side, any>>;
}

export interface GameHost {
  run(ops: Op[], sides: Side[]): Promise<RunResult>;
  dispose(): void;
}

function sfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export class GameRunner {
  private game?: GameHandle;
  private rng?: () => number;

  constructor(private engine: EngineApi) {}

  private withRng<T>(f: () => T): T {
    const random = Math.random;
    Math.random = this.rng!;
    try {
      return f();
    } finally {
      Math.random = random;
    }
  }

  private unbrokenOnPass(game: GameHandle, side: Side) {
    const enc = this.engine.view(game, "corp")?.encounters;
    const ice = enc?.ice;
    const passed = enc?.["no-action"];
    if (!ice?.rezzed || !passed || passed === side) return null;
    const live = (ice.subroutines ?? []).some((s: any) => !s.broken && !s.fired && s.resolve !== false);
    return live ? cardRef(ice) : null;
  }

  private exec(entry: LocalEntry) {
    const game = this.game;
    if (!game) return false;
    try {
      this.withRng(() => {
        if (entry.kind === "act") {
          const ice = entry.command === "continue" ? this.unbrokenOnPass(game, entry.side) : null;
          if (ice) this.engine.act(game, "corp", "unbroken-subroutines", { card: ice });
          else this.engine.act(game, entry.side, entry.command, entry.args ?? null);
        } else if (entry.kind === "say") this.engine.say(game, entry.side, { username: entry.user }, entry.text);
        else this.engine.concede(game, entry.side);
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  run(ops: Op[], sides: Side[]): RunResult {
    const failed: number[] = [];
    ops.forEach((op, i) => {
      if (op.k === "boot") {
        this.rng = sfc32(op.seed[0], op.seed[1], op.seed[2], op.seed[3]);
        this.game = this.withRng(() => this.engine.createGame(op.setup));
      } else if (!this.exec(op.entry)) failed.push(i);
    });
    const views: Partial<Record<Side, any>> = {};
    if (this.game) for (const side of sides) views[side] = this.engine.view(this.game, side);
    return { failed, views };
  }
}

export class DirectHost implements GameHost {
  private runner: GameRunner;

  constructor(engine: EngineApi) {
    this.runner = new GameRunner(engine);
  }

  run(ops: Op[], sides: Side[]) {
    return Promise.resolve(this.runner.run(ops, sides));
  }

  dispose() {}
}

let factory: ((engine: EngineApi) => GameHost) | null = null;

export function setHostFactory(make: (engine: EngineApi) => GameHost) {
  factory = make;
}

export function makeHost(engine: EngineApi): GameHost {
  return factory ? factory(engine) : new DirectHost(engine);
}
