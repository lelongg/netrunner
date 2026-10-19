import { useEffect, useState } from "preact/hooks";
import type { Command } from "./actions";
import type { Probe, ProbeResult } from "./runner";
import { quietUntil } from "../fx/director";

export type Prober = (probes: Probe[]) => Promise<ProbeResult[]>;

export function useProbe(probes: Probe[], probe: Prober | undefined, stamp: unknown): ProbeResult[] | null {
  const key = JSON.stringify(probes);
  const [result, setResult] = useState<{ key: string; stamp: unknown; out: ProbeResult[] } | null>(null);
  const known = result?.key === key;
  useEffect(() => {
    if (!probe || !probes.length) return;
    let live = true;
    const run = () =>
      probe(probes)
        .then((out) => live && setResult({ key, stamp, out }))
        .catch(() => {});
    const wait = Math.max(known ? 400 : 0, quietUntil - performance.now());
    const timer = wait > 0 ? setTimeout(run, wait) : undefined;
    if (wait <= 0) run();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, stamp, probe]);
  return known ? result!.out : null;
}

export function useChecked(commands: Command[], probe: Prober | undefined, stamp: unknown): Command[] {
  const checked = commands.filter((c) => c.check);
  const known = useProbe(
    checked.map((c) => ({ k: "try", command: c.command, args: c.args ?? null })),
    probe,
    stamp,
  );
  if (!probe) return commands;
  let i = 0;
  return commands.flatMap((c) => {
    if (!c.check) return [c];
    const ok = known?.[i++]?.ok;
    const enabled = c.enabled !== false && (ok ?? c.guess ?? true);
    if (!enabled && c.check === "hide") return [];
    return [{ ...c, enabled }];
  });
}
