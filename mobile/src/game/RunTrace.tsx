import { useEffect, useRef, useState } from "preact/hooks";
import { currentIce } from "./actions";

interface Beam {
  id: number;
  kind: "break" | "fire" | "jack";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Float {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface Snap {
  server?: string;
  phase?: string;
  ice?: unknown;
  strength: Map<unknown, number>;
}

const BEAM_MS = 900;

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function tileOf(cid: unknown): HTMLElement | null {
  return (document.querySelector(`[data-cid="${String(cid)}"]`)?.closest(".tile-wrap") as HTMLElement | null) ?? null;
}

function center(el: Element | null): [number, number] | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
  return [r.left + r.width / 2, r.top + r.height / 2];
}

export function iceKind(ice: any): string {
  const types: string[] = ice?.subtypes ?? [];
  if (types.includes("Sentry")) return "sentry";
  if (types.includes("Code Gate")) return "gate";
  if (types.includes("Barrier")) return "barrier";
  return "other";
}

function runnerCards(view: any): any[] {
  const out: any[] = [];
  const walk = (cards: any[]) =>
    cards?.forEach((c) => {
      out.push(c);
      walk(c.hosted ?? []);
    });
  const rig = view.runner?.rig ?? {};
  for (const k of ["program", "hardware", "resource"]) walk(rig[k] ?? []);
  return out;
}

function snapshot(view: any): Snap {
  const ice = currentIce(view);
  const strength = new Map<unknown, number>();
  for (const c of runnerCards(view)) if (c["current-strength"] != null) strength.set(c.cid, c["current-strength"]);
  return { server: view.run?.server?.[0], phase: view.run?.phase, ice: ice?.cid, strength };
}

function retrigger(el: HTMLElement, cls: string, ms: number) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function iceByTitle(view: any, title: string): any {
  for (const server of Object.values<any>(view.corp?.servers ?? {})) for (const c of server?.ices ?? []) if (c?.title && title.includes(c.title)) return c;
  return undefined;
}

export function RunTrace({ view, render }: { view: any; render: (m: unknown) => string }) {
  const [beams, setBeams] = useState<Beam[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const [glitch, setGlitch] = useState(0);
  const prev = useRef<Snap | null>(null);
  const next = useRef(1);
  const marked = useRef<HTMLElement | null>(null);
  const seen = useRef<number | null>(null);
  const log: any[] = view.log ?? [];

  const ice = currentIce(view);
  const encountering = !!view.encounters || view.run?.phase === "encounter-ice";
  const phase = !view.run || !ice ? undefined : encountering && ice.rezzed ? "encounter" : view.run.phase === "approach-ice" ? "approach" : undefined;

  useEffect(() => {
    const el = phase ? tileOf(ice.cid) : null;
    if (marked.current && marked.current !== el) {
      delete marked.current.dataset.trace;
      delete marked.current.dataset.kind;
    }
    marked.current = el;
    if (el) {
      el.dataset.trace = phase;
      el.dataset.kind = ice.rezzed ? iceKind(ice) : "unknown";
    }
  });

  useEffect(
    () => () => {
      if (marked.current) {
        delete marked.current.dataset.trace;
        delete marked.current.dataset.kind;
      }
    },
    [],
  );

  useEffect(() => {
    const now = snapshot(view);
    const before = prev.current;
    prev.current = now;
    if (!before || still()) {
      seen.current = log.length;
      return;
    }
    const add: Beam[] = [];
    const beam = (kind: Beam["kind"], from: [number, number] | null, to: [number, number] | null) => {
      if (from && to) add.push({ id: next.current++, kind, x1: from[0], y1: from[1], x2: to[0], y2: to[1] });
    };
    const runnerAt = () => center(tileOf(view.runner?.identity?.cid)) ?? [innerWidth / 2, innerHeight - 40];

    if (now.server && !before.server) {
      const target = center(document.querySelector(".server.running"));
      beam("jack", runnerAt(), target);
    }
    if (!now.server && before.server && before.phase !== "success") setGlitch(next.current++);

    if (before.ice != null && now.ice !== before.ice && now.server && now.server === before.server) {
      const el = tileOf(before.ice);
      if (el) retrigger(el, "fx-passed", 800);
    }

    const pumps: Float[] = [];
    for (const [cid, str] of now.strength) {
      const old = before.strength.get(cid);
      if (old == null || str <= old || !now.server) continue;
      const el = tileOf(cid);
      const at = center(el);
      if (el) retrigger(el, "fx-pump", 700);
      if (at) pumps.push({ id: next.current++, x: at[0], y: at[1], text: `+${str - old} str` });
    }
    const from = seen.current;
    seen.current = log.length;
    if (from !== null && log.length > from && log.length - from <= 14) {
      let fired = false;
      for (const e of log.slice(from)) {
        if (e.user !== "__system__") continue;
        const text = render(e.text);
        let m: RegExpMatchArray | null;
        if ((m = text.match(/\bbreak (?:.*?)subroutines? on (.+?)(?: \(|\.?$)/i))) {
          const name = text.match(/use (.+?) to break/i)?.[1] ?? text.match(/strength of (.+?) to \d+/i)?.[1];
          const breaker = name ? runnerCards(view).find((c) => c.title === name) : undefined;
          const ice = iceByTitle(view, m[1]);
          if (ice) beam("break", center(tileOf(breaker?.cid)) ?? runnerAt(), center(tileOf(ice.cid)));
        } else if ((m = text.match(/^.+? uses (.+?) to (.+?)\.?$/i)) && !/\brez\b/i.test(m[2])) {
          const ice = iceByTitle(view, m[1]);
          if (ice && ice.title === m[1]) {
            beam("fire", center(tileOf(ice.cid)), runnerAt());
            fired = true;
          }
        }
      }
      if (fired) setGlitch(next.current++);
    }
    if (add.length) setBeams((b) => [...b, ...add]);
    if (pumps.length) setFloats((f) => [...f, ...pumps]);
  });

  useEffect(() => {
    if (!beams.length) return;
    const t = setTimeout(() => setBeams((b) => b.slice(1)), BEAM_MS);
    return () => clearTimeout(t);
  }, [beams]);

  useEffect(() => {
    if (!floats.length) return;
    const t = setTimeout(() => setFloats((f) => f.slice(1)), 1000);
    return () => clearTimeout(t);
  }, [floats]);

  useEffect(() => {
    if (!glitch) return;
    const t = setTimeout(() => setGlitch(0), 450);
    return () => clearTimeout(t);
  }, [glitch]);

  return (
    <>
      {beams.length > 0 && (
        <svg class="fx-beams" aria-hidden="true">
          {beams.map((b) => {
            const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
            return (
              <g key={b.id} class={`beam beam-${b.kind}`} style={`--len: ${len}px`}>
                <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} class="beam-glow" />
                <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} class="beam-core" />
                <circle cx={b.x2} cy={b.y2} r="14" class="beam-hit" />
              </g>
            );
          })}
        </svg>
      )}
      {floats.map((f) => (
        <span key={f.id} class="fx-float" style={`left: ${f.x}px; top: ${f.y}px`} aria-hidden="true">
          {f.text}
        </span>
      ))}
      {glitch > 0 && <div key={glitch} class="screen-fx fx-glitch" aria-hidden="true" />}
    </>
  );
}
