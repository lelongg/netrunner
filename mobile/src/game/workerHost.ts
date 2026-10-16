import type { Side } from "../engine";
import { type GameHost, type Op, type RunResult, setHostFactory } from "./runner";

let worker: Worker | null = null;
let nextGame = 1;
let nextId = 1;
const waiting = new Map<number, { resolve: (r: RunResult) => void; reject: (e: Error) => void }>();

function start() {
  if (worker) return worker;
  worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<{ id: number; result?: RunResult; error?: string }>) => {
    const { id, result, error } = event.data;
    const pending = waiting.get(id);
    waiting.delete(id);
    if (!pending) return;
    if (result) pending.resolve(result);
    else pending.reject(new Error(error ?? "engine worker failed"));
  };
  worker.postMessage({ k: "init", base: document.baseURI });
  return worker;
}

class WorkerHost implements GameHost {
  private game = nextGame++;

  run(ops: Op[], sides: Side[]) {
    const id = nextId++;
    return new Promise<RunResult>((resolve, reject) => {
      waiting.set(id, { resolve, reject });
      start().postMessage({ k: "run", id, game: this.game, ops, sides });
    });
  }

  dispose() {
    worker?.postMessage({ k: "drop", game: this.game });
  }
}

export function startEngineWorker() {
  if (typeof Worker === "undefined") return;
  start();
  setHostFactory(() => new WorkerHost());
}
