import type { ComponentChildren } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { type CardDb, type EngineApi, type Side, loadEngine } from "../engine";
import { Board } from "../game/Board";
import { type Card, type Model, type Scene, type Slot, plain } from "./FxLab";

const IDENTITY: Record<Side, string> = { corp: "Nebula Talent Management: Making Stars", runner: "Tao Salonga: Telepresence Magician" };

function gameView(m: Model, me: Side, lines: string[], byPlain: Map<string, Card>) {
  const owner = (s: Slot): Side => s.holder ?? (s.side === "Corp" ? "corp" : "runner");
  const card = (s: Slot) => {
    const hidden = s.side === "Corp" && me === "runner" && !s.rezzed && s.zone[0] === "servers";
    const base = { cid: s.cid, side: s.side, zone: s.zone, rezzed: s.rezzed, "advance-counter": s.adv, facedown: false };
    if (hidden) return { ...base, type: s.type === "ICE" ? "ICE" : undefined };
    const c = byPlain.get(plain(s.title));
    return { ...base, title: s.title, code: c?.code, type: s.type, subtypes: s.subtypes ?? c?.subtypes ?? [], "current-strength": s.strength, strength: s.strength, agendapoints: c?.agendapoints, subroutines: [] };
  };
  const at = (zone: string[], who?: Side) => m.slots.filter((s) => zone.every((z, i) => s.zone[i] === z) && (!who || owner(s) === who)).map(card);
  const identity = (side: Side) => {
    const c = byPlain.get(plain(IDENTITY[side]));
    const back = side === "corp" && m.face === "back";
    return { cid: `id-${side}`, title: c?.title ?? IDENTITY[side], code: c?.code && back ? `${c.code}-0` : c?.code, type: "Identity", side: side === "corp" ? "Corp" : "Runner", zone: ["identity"] };
  };
  const server = (key: string) => ({ ices: at(["servers", key, "ices"]), content: at(["servers", key, "content"]) });
  const hand = (side: Side) => at(["hand"], side);
  const ice = m.encounter ? m.slots.find((s) => s.cid === m.encounter!.cid) : undefined;
  return {
    gameid: "lab",
    turn: 3,
    "active-player": m.active,
    "end-turn": false,
    winner: m.winner,
    log: lines.map((text) => ({ user: "__system__", text })),
    corp: {
      identity: identity("corp"),
      credit: m.credits.corp,
      click: m.clicks.corp,
      "agenda-point": m.points.corp,
      "hand-size": { base: 5, total: 5 },
      hand: me === "corp" ? hand("corp") : [],
      "hand-count": hand("corp").length + 3,
      "deck-count": 24,
      discard: at(["discard"], "corp"),
      "play-area": at(["play-area"], "corp"),
      scored: at(["scored"], "corp"),
      servers: { hq: { ices: [], content: [] }, rd: { ices: [], content: [] }, archives: { ices: [], content: [] }, remote1: server("remote1") },
    },
    runner: {
      identity: identity("runner"),
      credit: m.credits.runner,
      click: m.clicks.runner,
      "agenda-point": m.points.runner,
      "hand-size": { base: 5, total: 5 },
      hand: me === "runner" ? hand("runner") : [],
      "hand-count": hand("runner").length,
      "deck-count": 30,
      discard: at(["discard"], "runner"),
      "play-area": at(["play-area"], "runner"),
      scored: at(["scored"], "runner"),
      rig: { program: at(["rig", "program"]), hardware: at(["rig", "hardware"]), resource: at(["rig", "resource"]) },
      memory: { used: at(["rig", "program"]).length, available: 4 },
      tag: { base: m.tags, total: m.tags },
      link: 0,
    },
    run: m.run ? { server: [m.run.server], phase: m.run.phase, position: m.run.position } : null,
    encounters: ice ? { ice: card(ice), "encounter-count": m.encounter!.count } : null,
  };
}

const session = (me: Side): any => ({
  lobby: { code: "", role: "host", status: "connected", myName: "Gerald", mySide: me, opponentDeckReady: true, started: true, players: { corp: "Corp", runner: "Gerald" } },
  pending: false,
  actionError: null,
  deckFor: () => undefined,
  say() {},
  send() {},
  probe: () => Promise.resolve([]),
  concede() {},
  journal() {},
  freeSeat() {},
  freeSeatSide: undefined,
  clearActionError() {},
});

export function useSwipe(go: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: PointerEvent) => (start.current = { x: e.clientX, y: e.clientY }),
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => (start.current = null),
    style: { touchAction: "pan-y" },
  };
}

export function LabScene({ scene, byPlain, controls }: { scene: Scene | undefined; byPlain: Map<string, Card>; controls: ComponentChildren }) {
  const [env, setEnv] = useState<{ engine: EngineApi; db: CardDb } | null>(null);
  const [state, setState] = useState<{ view: any; quiet: boolean; me: Side } | null>(null);
  useEffect(() => {
    void loadEngine().then(setEnv);
  }, []);
  useEffect(() => {
    if (!scene || !env || !byPlain.size) return;
    const me = scene.me ?? "runner";
    const lines = scene.lines ?? [];
    document.querySelector(".fx-layer")?.replaceChildren();
    setState({ view: gameView(scene.before, me, [], byPlain), quiet: true, me });
    const timers = [setTimeout(() => setState({ view: gameView(scene.after, me, lines, byPlain), quiet: false, me }), 80)];
    const then = scene.then;
    if (then) timers.push(setTimeout(() => setState({ view: gameView(scene.after, me, [...lines, ...then.lines], byPlain), quiet: false, me }), 80 + then.after));
    return () => timers.forEach(clearTimeout);
  }, [scene, env, byPlain]);
  const fake = useMemo(() => session(state?.me ?? "runner"), [state?.me]);
  if (!env || !state) return <div class="lab-loading label">Loading…</div>;
  return <Board key={state.me} session={fake} engine={env.engine} db={env.db} side={state.me} view={state.view} quiet={state.quiet} controls={controls} onLeave={() => {}} onExit={() => {}} />;
}
