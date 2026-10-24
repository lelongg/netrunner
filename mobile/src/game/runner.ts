import type { EngineApi, Funds, GameHandle, Side, Snapshot } from "../engine";

export type Seat = Side | "spectator";
import { type BreakPlan, breakStep, cardRef, findCard, promptOf } from "./actions";

export type LocalEntry = { side: Side; kind: "act"; command: string; args: unknown } | { side: Side; kind: "say"; user?: string; text: string } | { side: Side; kind: "concede" };

export type Op = { k: "boot"; setup: unknown; seed: number[] } | { k: "exec"; entry: LocalEntry };

export interface RunResult {
  failed: number[];
  views: Partial<Record<Seat, any>>;
}

export type Probe = { k: "try"; command: string; args: unknown } | { k: "break"; ice: unknown; breaker: unknown; want: string[]; boost?: number } | { k: "funds"; card: unknown };

export interface ProbeResult {
  ok: boolean;
  credits?: number;
  funds?: Funds;
}

export interface GameHost {
  run(ops: Op[], sides: Seat[]): Promise<RunResult>;
  probe(side: Side, probes: Probe[]): Promise<ProbeResult[]>;
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

  private aligned(game: GameHandle, side: Side, args: unknown) {
    const eid = (args as { eid?: { eid?: unknown } } | null)?.eid;
    if (!eid || typeof eid !== "object") return args ?? null;
    const current = promptOf(this.engine.view(game, side), side)?.eid;
    return current && current.eid !== eid.eid ? { ...(args as object), eid: current } : args;
  }

  private exec(entry: LocalEntry) {
    const game = this.game;
    if (!game) return false;
    try {
      this.withRng(() => {
        if (entry.kind === "act") {
          const ice = entry.command === "continue" ? this.unbrokenOnPass(game, entry.side) : null;
          if (ice) this.engine.act(game, "corp", "unbroken-subroutines", { card: ice });
          else this.engine.act(game, entry.side, entry.command, this.aligned(game, entry.side, entry.args));
        } else if (entry.kind === "say") this.engine.say(game, entry.side, { username: entry.user }, entry.text);
        else this.engine.concede(game, entry.side);
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  private tryOn(game: GameHandle, side: Side, command: string, args: unknown, views: boolean) {
    try {
      if (views) this.engine.act(game, side, command, this.aligned(game, side, args));
      else this.engine.attempt(game, side, command, this.aligned(game, side, args));
      return true;
    } catch {
      return false;
    }
  }

  private trial(game: GameHandle, side: Side, probe: Probe, snapshot: Snapshot): ProbeResult {
    if (probe.k === "try") return { ok: this.tryOn(game, side, probe.command, probe.args, false) && !this.engine.unchanged(game, snapshot) };
    if (probe.k === "funds") {
      const funds = this.engine.availableCredits(game, side, probe.card);
      return { ok: !!funds, funds };
    }
    const open = promptOf(this.engine.view(game, side), side);
    if (open && open["prompt-type"] !== "run") return { ok: false };
    if (probe.boost && !this.tryOn(game, side, "change", { key: "credit", delta: probe.boost }, true)) return { ok: false };
    const credit = this.engine.availableCredits(game, side, probe.breaker)?.total ?? 0;
    const plan: BreakPlan = { ice: probe.ice, breaker: probe.breaker, want: probe.want, stage: "pump", steps: 0 };
    const render = (m: unknown) => this.engine.renderMessage(m);
    for (let next = breakStep(this.engine.view(game, side), side, plan, render, true); next && next !== "wait"; next = breakStep(this.engine.view(game, side), side, plan, render, true)) {
      if (!this.tryOn(game, side, next.command, next.args, true)) return { ok: false };
    }
    const after = this.engine.view(game, side);
    const ice = findCard(after, probe.ice);
    const left = (ice?.subroutines ?? []).filter((s: any) => !s.broken && !s.fired && probe.want.includes(s.label));
    return { ok: !!ice && !left.length, credits: credit - (this.engine.availableCredits(game, side, probe.breaker)?.total ?? 0) };
  }

  probe(side: Side, probes: Probe[]): ProbeResult[] {
    const game = this.game;
    if (!game) return probes.map(() => ({ ok: false }));
    const snapshot = this.engine.checkpoint(game);
    return probes.map((p) => {
      try {
        return this.trial(game, side, p, snapshot);
      } finally {
        this.engine.restore(game, snapshot);
      }
    });
  }

  run(ops: Op[], sides: Seat[]): RunResult {
    const failed: number[] = [];
    ops.forEach((op, i) => {
      if (op.k === "boot") {
        this.rng = sfc32(op.seed[0], op.seed[1], op.seed[2], op.seed[3]);
        this.game = this.withRng(() => this.engine.createGame(op.setup));
      } else if (!this.exec(op.entry)) failed.push(i);
    });
    const views: Partial<Record<Seat, any>> = {};
    if (this.game) for (const side of sides) views[side] = this.engine.view(this.game, side);
    return { failed, views };
  }
}

export class DirectHost implements GameHost {
  private runner: GameRunner;

  constructor(engine: EngineApi) {
    this.runner = new GameRunner(engine);
  }

  run(ops: Op[], sides: Seat[]) {
    return Promise.resolve(this.runner.run(ops, sides));
  }

  probe(side: Side, probes: Probe[]) {
    return Promise.resolve(this.runner.probe(side, probes));
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
