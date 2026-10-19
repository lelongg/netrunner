import { createContext } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Side } from "../engine";
import { type Command, advancement, cardRef } from "./actions";
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

export const Verified = createContext<Set<unknown> | null>(null);

export function useVerified(view: any, side: Side, probe: Prober | undefined, stamp: unknown): Set<unknown> | null {
  const owners: unknown[] = [];
  const probes: Probe[] = [];
  const trusted: unknown[] = [];
  const seen = new Set<unknown>();
  const inRun = !!(view?.run || view?.encounters);
  const visit = (card: any) => {
    if (!card || typeof card !== "object") return;
    if (Array.isArray(card)) return card.forEach(visit);
    if (card.cid != null && card.zone && !seen.has(card.cid) && card.side !== (side === "corp" ? "Corp" : "Runner")) {
      seen.add(card.cid);
      const theirs: any[] = card[side === "corp" ? "corp-abilities" : "runner-abilities"] ?? [];
      theirs.forEach((_ab: any, i: number) => {
        owners.push(card.cid);
        probes.push({ k: "try", command: side === "corp" ? "corp-ability" : "runner-ability", args: { card: cardRef(card), ability: i } });
      });
    } else if (card.cid != null && card.zone && !seen.has(card.cid)) {
      seen.add(card.cid);
      const zone = card.zone[0];
      if (zone === "hand" && card.playable && !inRun) {
        if (side === "corp" && card.type !== "Operation") trusted.push(card.cid);
        else {
          owners.push(card.cid);
          probes.push({ k: "try", command: "play", args: { card: cardRef(card) } });
        }
      } else if (side === "corp" && zone === "servers" && card.type === "Agenda" && !inRun && advancement(card) >= (card["current-advancement-requirement"] ?? card.advancementcost ?? Infinity)) {
        owners.push(card.cid);
        probes.push({ k: "try", command: "score", args: { card: cardRef(card) } });
      } else if (side === "corp" && zone === "servers" && !card.rezzed && (card.type === "Asset" || card.type === "Upgrade")) {
        owners.push(card.cid);
        probes.push({ k: "try", command: "rez", args: { card: cardRef(card) } });
      } else if (zone !== "hand" && zone !== "deck" && zone !== "discard") {
        (card.abilities ?? []).forEach((ab: any, i: number) => {
          if (!ab.playable || (inRun && ab.action)) return;
          owners.push(card.cid);
          probes.push({ k: "try", command: ab.dynamic ? "dynamic-ability" : "ability", args: ab.dynamic ? { card: cardRef(card), dynamic: ab.dynamic, source: ab.source, index: ab.index } : { card: cardRef(card), ability: i } });
        });
      }
    }
    for (const [k, v] of Object.entries(card)) if (k !== "abilities" && k !== "subroutines" && k !== "log" && v && typeof v === "object") visit(v);
  };
  visit(view?.corp);
  visit(view?.runner);
  const results = useProbe(probes, probe, stamp);
  const last = useRef<Set<unknown> | null>(null);
  if (!probe) return null;
  if (!probes.length) last.current = new Set(trusted);
  else if (results) {
    const ok = new Set<unknown>(trusted);
    results.forEach((r, i) => r.ok && ok.add(owners[i]));
    last.current = ok;
  }
  return last.current ?? new Set(trusted);
}
