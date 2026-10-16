import { useLayoutEffect, useRef } from "preact/hooks";
import type { Side } from "../engine";
import { currentIce } from "../game/actions";
import { serverName } from "../game/text";
import { type Plan, collect, play, prepare } from "./cards";
import { type Point, type Tone, anchor, animate, banner, burst, buzz, coins, done, flash, floater, glitch, layer, lunge, mid, node, place, pointOf, punch, rays, rectOf, reduced, ring, shake, slash, stamp, tileEl, vignette, visible, wrapEl } from "./core";

export type IceKind = "sentry" | "gate" | "barrier" | "other";

export function iceKind(ice: any): IceKind {
  const types: string[] = ice?.subtypes ?? [];
  if (types.includes("Sentry")) return "sentry";
  if (types.includes("Code Gate")) return "gate";
  if (types.includes("Barrier")) return "barrier";
  return "other";
}

export const KIND_TONE: Record<IceKind, Tone> = { sentry: "red", gate: "blue", barrier: "orange", other: "violet" };

interface Snap {
  credits: Record<Side, number>;
  clicks: Record<Side, number>;
  points: Record<Side, number>;
  tags: number;
  rezzed: Map<unknown, boolean>;
  adv: Map<unknown, number>;
  strength: Map<unknown, number>;
  server?: string;
  phase?: string;
  ice?: unknown;
  encounter?: string;
  active?: string;
  turn?: number;
  winner?: string;
  log: number;
}

const SIDES: Side[] = ["corp", "runner"];

function snap(view: any): Snap {
  const rezzed = new Map<unknown, boolean>();
  const adv = new Map<unknown, number>();
  const strength = new Map<unknown, number>();
  const walk = (x: any) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (x.cid != null && x.zone) {
      if (x.side === "Corp" && x.zone[0] === "servers") rezzed.set(x.cid, !!x.rezzed);
      const a = (x["advance-counter"] ?? 0) + (x["extra-advance-counter"] ?? 0);
      if (a) adv.set(x.cid, a);
      if (x["current-strength"] != null && x.side === "Runner") strength.set(x.cid, x["current-strength"]);
      walk(x.hosted);
      return;
    }
    for (const [k, v] of Object.entries(x)) if (k !== "abilities" && k !== "subroutines" && k !== "basic-action-card" && k !== "prompt-state") walk(v);
  };
  walk(view.corp?.servers);
  walk(view.runner?.rig);
  const ice = currentIce(view);
  const enc = view.encounters;
  return {
    credits: { corp: view.corp?.credit ?? 0, runner: view.runner?.credit ?? 0 },
    clicks: { corp: view.corp?.click ?? 0, runner: view.runner?.click ?? 0 },
    points: { corp: view.corp?.["agenda-point"] ?? 0, runner: view.runner?.["agenda-point"] ?? 0 },
    tags: view.runner?.tag?.total ?? view.runner?.tag?.base ?? 0,
    rezzed,
    adv,
    strength,
    server: view.run?.server?.[0],
    phase: view.run?.phase,
    ice: ice?.cid,
    encounter: enc && ice?.rezzed ? `${ice.cid}:${view.run?.position ?? ""}:${enc["encounter-count"] ?? 0}` : undefined,
    active: view["active-player"],
    turn: view.turn,
    winner: view.winner,
    log: (view.log ?? []).length,
  };
}

const side2 = (s: string | undefined): Side => (s === "corp" ? "corp" : "runner");

function runnerTarget(me: Side): Point {
  const p = pointOf(anchor("runner-panel"));
  if (p) return p;
  return me === "runner" ? [innerWidth / 2, innerHeight - 120] : [innerWidth / 2, 90];
}

function iceByTitle(view: any, title: string): any {
  let best: any;
  for (const server of Object.values<any>(view.corp?.servers ?? {})) for (const c of server?.ices ?? []) if (c?.title && title.includes(c.title) && (!best || c.title.length > best.title.length)) best = c;
  return best;
}

function runnerCard(view: any, title: string): any {
  let found: any;
  const walk = (cards: any[]) =>
    cards?.forEach((c) => {
      if (!found && c.title === title) found = c;
      walk(c.hosted ?? []);
    });
  const rig = view.runner?.rig ?? {};
  for (const k of ["program", "hardware", "resource"]) walk(rig[k] ?? []);
  return found;
}

const decorations = new Map<string, { el: HTMLElement; host: HTMLElement; stop: () => void }>();

function decorate(key: string, host: HTMLElement | null, build: (host: HTMLElement) => { el: HTMLElement; stop: () => void }) {
  const cur = decorations.get(key);
  if (cur && cur.host === host && cur.el.isConnected) return;
  if (cur) {
    cur.stop();
    cur.el.remove();
    decorations.delete(key);
  }
  if (!host) return;
  decorations.set(key, { ...build(host), host });
}

function clearDecorations() {
  for (const [key, d] of decorations) {
    d.stop();
    d.el.remove();
    decorations.delete(key);
  }
}

function lockOn(host: HTMLElement, tone: Tone) {
  const el = document.createElement("div");
  el.className = `fx-lock tone-${tone}`;
  for (const c of ["tl", "tr", "bl", "br"]) {
    const i = document.createElement("i");
    i.className = c;
    el.appendChild(i);
  }
  host.appendChild(el);
  if (reduced()) return { el, stop: () => {} };
  animate(el, { scale: [1.9, 1], opacity: [0, 1], rotate: [45, 0] }, { type: "spring", visualDuration: 0.4, bounce: 0.3 });
  const loop = animate(el, { transform: ["scale(1)", "scale(1.1)", "scale(1)"] }, { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.45 });
  return { el, stop: () => loop.stop() };
}

function firewall(host: HTMLElement, tone: Tone) {
  const el = document.createElement("div");
  el.className = `fx-firewall tone-${tone}`;
  const scan = document.createElement("i");
  el.appendChild(scan);
  host.appendChild(el);
  if (reduced()) return { el, stop: () => {} };
  animate(el, { opacity: [0, 1] }, { duration: 0.3 });
  const a = animate(scan, { transform: ["translateY(-120%)", "translateY(320%)"] }, { duration: 1.5, repeat: Infinity, ease: "linear" });
  const b = animate(el, { opacity: [1, 0.65, 1] }, { duration: 0.9, repeat: Infinity, ease: "easeInOut" });
  return {
    el,
    stop: () => {
      a.stop();
      b.stop();
    },
  };
}

function serverScan(host: HTMLElement) {
  const el = document.createElement("div");
  el.className = "fx-server-scan";
  host.appendChild(el);
  if (reduced()) return { el, stop: () => {} };
  const a = animate(el, { transform: ["translateY(-100%)", "translateY(900%)"] }, { duration: 1.8, repeat: Infinity, ease: "linear" });
  return { el, stop: () => a.stop() };
}

let camera: { stop: () => void } | null = null;

function cameraTo(target: Element | null, zoom: number) {
  const field = document.querySelector(".playfield") as HTMLElement | null;
  if (!field || reduced()) return;
  camera?.stop();
  if (!target || zoom === 1) {
    camera = animate(field, { scale: 1 }, { type: "spring", visualDuration: 0.5, bounce: 0.15 });
    return;
  }
  const f = field.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const ox = ((t.left + t.width / 2 - f.left) / f.width) * 100;
  const oy = ((t.top + t.height / 2 - f.top) / f.height) * 100;
  field.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
  camera = animate(field, { scale: zoom }, { type: "spring", visualDuration: 0.6, bounce: 0.2 });
}

function kick(power = 1) {
  const field = document.querySelector(".playfield") as HTMLElement | null;
  if (!field || reduced()) return;
  animate(field, { filter: [`brightness(${1 + 0.35 * power}) saturate(${1 + 0.4 * power})`, "brightness(1) saturate(1)"] }, { duration: 0.35 });
}

function warp(to: Point, tone: Tone) {
  if (reduced()) return;
  for (let i = 0; i < 26; i++) {
    const el = node(`fx-streak tone-${tone}`);
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(innerWidth, innerHeight) * (0.55 + Math.random() * 0.3);
    const sx = to[0] + Math.cos(angle) * dist;
    const sy = to[1] + Math.sin(angle) * dist;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    el.style.rotate = `${(angle * 180) / Math.PI}deg`;
    done(animate(el, { x: [0, to[0] - sx], y: [0, to[1] - sy], scaleX: [0.2, 2.2, 0.1], opacity: [0, 1, 0] }, { duration: 0.42 + Math.random() * 0.2, delay: Math.random() * 0.18, ease: [0.55, 0, 0.9, 0.4] }), el);
  }
}

function reticle(at: Point) {
  if (reduced()) return;
  const el = node("fx-reticle");
  el.style.left = `${at[0]}px`;
  el.style.top = `${at[1]}px`;
  animate(el, { scale: [3.2, 1], rotate: [120, 0], opacity: [0, 1] }, { type: "spring", visualDuration: 0.45, bounce: 0.25 });
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.75, 1] }), el);
}

function cracks(at: Point) {
  if (reduced()) return;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const el = node("fx-crack");
    el.style.left = `${at[0]}px`;
    el.style.top = `${at[1]}px`;
    el.style.width = `${80 + Math.random() * 160}px`;
    el.style.rotate = `${(i / n) * 360 + Math.random() * 25}deg`;
    done(animate(el, { scaleX: [0, 1, 1], opacity: [1, 1, 0] }, { duration: 0.9, times: [0, 0.15, 1], ease: "easeOut" }), el);
  }
}

function digitize(el: HTMLElement | null, tone: Tone) {
  if (!el || reduced()) return;
  animate(el, { x: [0, -5, 6, -3, 2, 0], opacity: [1, 0.3, 1, 0.5, 1] }, { duration: 0.5 });
  const r = rectOf(el);
  if (visible(r)) burst(mid(r), tone, 10, 50, { size: 3, gravity: 0, shards: true });
}

function rezFlip(cid: unknown, tone: Tone, dramatic: boolean) {
  const el = tileEl(cid);
  const r = rectOf(el);
  if (!el || !visible(r) || reduced()) return;
  animate(el, { rotateY: [-180, 0], scale: [0.9, 1], transformPerspective: 600 } as any, { type: "spring", visualDuration: 0.55, bounce: 0.25 });
  const glint = document.createElement("i");
  glint.className = "fx-glint";
  el.appendChild(glint);
  done(animate(glint, { x: ["-120%", "160%"], opacity: [0, 1, 0] }, { duration: 0.6, delay: 0.25, ease: "easeInOut" }), glint);
  const at = mid(r);
  setTimeout(() => {
    ring(at, tone, dramatic ? 170 : 110);
    burst(at, tone, dramatic ? 22 : 12, dramatic ? 85 : 55, { size: 5, gravity: 10 });
    if (dramatic) {
      shake(0.5);
      vignette(tone === "blue" ? "cyan" : tone === "red" ? "red" : tone === "orange" ? "orange" : "violet", 0.35);
      buzz([30, 30, 60]);
    }
  }, 260);
}

function confetti() {
  const colors = ["#f6e03a", "#22d3ee", "#ff3b30", "#ffffff", "#c792ff"];
  for (let i = 0; i < 70; i++) {
    const el = node("fx-confetti");
    el.style.left = `${Math.random() * innerWidth}px`;
    el.style.top = `-20px`;
    el.style.background = colors[i % colors.length];
    const fall = innerHeight * (0.7 + Math.random() * 0.5);
    done(animate(el, { y: [0, fall], x: [0, (Math.random() - 0.5) * 160], rotate: [0, (Math.random() - 0.5) * 900], opacity: [1, 1, 0] }, { duration: 1.8 + Math.random() * 1.4, delay: Math.random() * 0.6, ease: [0.2, 0.5, 0.4, 1] }), el);
  }
}

function finale(won: boolean) {
  if (reduced()) return;
  const el = node(`fx-finale ${won ? "won" : "lost"}`);
  const word = node("fx-finale-word", el);
  const text = won ? "VICTORY" : "DEFEAT";
  const letters = [...text].map((ch) => {
    const s = document.createElement("span");
    s.textContent = ch;
    word.appendChild(s);
    return s;
  });
  animate(el, { opacity: [0, 1] }, { duration: 0.4 });
  letters.forEach((s, i) =>
    animate(s, won ? { y: [-160, 0], rotate: [(i % 2 ? 1 : -1) * 40, 0], opacity: [0, 1] } : { y: [0, 0], scale: [2.4, 1], opacity: [0, 1], filter: ["blur(10px)", "blur(0px)"] }, {
      type: "spring",
      visualDuration: 0.5,
      bounce: won ? 0.45 : 0.1,
      delay: 0.2 + i * 0.07,
    }),
  );
  const center: Point = [innerWidth / 2, innerHeight / 2];
  if (won) {
    setTimeout(() => {
      rays(center, "gold", Math.max(innerWidth, innerHeight) * 1.1, 2.6);
      ring(center, "gold", 420);
      flash("gold", 0.4);
      confetti();
      buzz([60, 60, 60, 60, 200]);
    }, 650);
  } else {
    setTimeout(() => {
      glitch(2);
      flash("red", 0.45, 0.9);
      shake(1.4);
      buzz([200, 80, 300]);
      const field = document.querySelector(".board") as HTMLElement | null;
      if (field) animate(field, { filter: ["grayscale(0)", "grayscale(0.85) brightness(0.7)"] }, { duration: 1.4 });
    }, 650);
  }
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 3.6, times: [0, 0.85, 1] }), el);
}

interface Hit {
  kind: "break" | "fire" | "damage" | "purge" | "trash-access";
  ice?: any;
  breaker?: any;
  text?: string;
  power?: number;
}

function readLog(view: any, from: number, render: (m: unknown) => string): Hit[] {
  const log: any[] = view.log ?? [];
  if (log.length - from > 16) return [];
  const out: Hit[] = [];
  for (const e of log.slice(from)) {
    if (e.user !== "__system__") continue;
    const text = render(e.text);
    let m: RegExpMatchArray | null;
    if ((m = text.match(/\bbreak (.*?)subroutines? on (.+?)(?: \(|\.?$)/i))) {
      const name = text.match(/use (.+?) to break/i)?.[1] ?? text.match(/strength of (.+?) to \d+/i)?.[1];
      const all = /\ball\b/i.test(m[1]);
      out.push({ kind: "break", ice: iceByTitle(view, m[2]), breaker: name ? runnerCard(view, name) : undefined, power: all ? 3 : 1 });
    } else if ((m = text.match(/^.+? uses (.+?) to (.+?)\.?$/i)) && !/\brez\b/i.test(m[2])) {
      const ice = iceByTitle(view, m[1]);
      if (ice && ice.title === m[1]) out.push({ kind: "fire", ice, text: m[2] });
    } else if ((m = text.match(/(\d+)?\s*(net|meat|core|brain) damage/i)) && /\b(suffers?|takes?|deals?|does|trashes)\b/i.test(text)) {
      out.push({ kind: "damage", text: m[2], power: /core|brain/i.test(m[2]) ? 1.6 : 1 });
    } else if (/purges? virus counters/i.test(text)) out.push({ kind: "purge" });
  }
  const dmg = out.filter((h) => h.kind === "damage");
  return dmg.length > 1 ? [...out.filter((h) => h.kind !== "damage"), dmg[0]] : out;
}

function shortText(t: string) {
  const s = t.replace(/^(?:do|deal) /i, "").replace(/\[[^\]]+\]/g, "");
  return s.length > 26 ? `${s.slice(0, 24)}…` : s;
}

function events(prev: Snap, now: Snap, view: any, me: Side, render: (m: unknown) => string, focus: Point | null) {
  if (reduced()) return;
  let busy = 0;

  if (now.winner && !prev.winner) {
    finale(now.winner === me);
    return;
  }

  if (now.active && prev.active && now.active !== prev.active) {
    const mine = now.active === me;
    banner(mine ? "Your turn" : `${now.active === "corp" ? "Corp" : "Runner"} turn`, mine ? `${now.clicks[me]} clicks` : "", mine ? "gold" : "white", { size: mine ? "xl" : "md", hold: mine ? 0.6 : 0.35 });
    if (mine) {
      buzz([20, 40, 20]);
      const pips = [...document.querySelectorAll(`[data-anchor="${me}-clicks"] i`)];
      pips.forEach((p, i) => animate(p, { scale: [0, 1.4, 1], opacity: [0, 1] }, { duration: 0.45, delay: 0.5 + i * 0.09, ease: "easeOut" }));
    }
    busy = 0.4;
  }

  for (const s of SIDES) {
    const delta = now.credits[s] - prev.credits[s];
    if (!delta) continue;
    const el = anchor(`${s}-credits`);
    const at = pointOf(el);
    if (!at) continue;
    punch(el, delta > 0 ? 1.3 : 1.15);
    if (delta > 0) {
      const from: Point = focus ?? [at[0] + (Math.random() - 0.5) * 30, at[1] + 70];
      coins(from, at, delta, "gold");
      floater([at[0], at[1] - 18], `+${delta}`, "gold", 50, true);
      setTimeout(() => burst(at, "gold", 10, 40, { size: 4, gravity: 0 }), 500);
    } else {
      if (focus) coins(at, focus, -delta, "gold");
      floater([at[0], at[1] + 10], `−${-delta}`, "white", -40);
    }
  }

  if (now.clicks[me] < prev.clicks[me] && now.active === prev.active) {
    const pips = [...document.querySelectorAll(`[data-anchor="${me}-clicks"] i`)];
    for (let i = now.clicks[me]; i < prev.clicks[me]; i++) {
      const p = pips[i];
      if (!p) continue;
      animate(p, { scale: [1.8, 1] }, { type: "spring", visualDuration: 0.3, bounce: 0.4 });
      const pt = pointOf(p);
      if (pt) burst(pt, "cyan", 8, 26, { size: 3, gravity: 0 });
    }
  }

  for (const s of SIDES) {
    if (now.points[s] > prev.points[s]) {
      const el = anchor(`${s}-points`);
      setTimeout(() => {
        punch(el, 1.5);
        const pt = pointOf(el);
        if (pt) burst(pt, s === "runner" ? "red" : "gold", 14, 45, { size: 4, gravity: 0 });
      }, 1300);
    }
  }

  for (const [cid, rez] of now.rezzed) {
    if (!rez || prev.rezzed.get(cid) !== false) continue;
    const card = findIn(view, cid);
    const isIce = card?.type === "ICE";
    rezFlip(cid, isIce ? KIND_TONE[iceKind(card)] : "blue", isIce && !!now.server);
  }

  for (const [cid, a] of now.adv) {
    const before = prev.adv.get(cid) ?? 0;
    if (a <= before) continue;
    const el = tileEl(cid);
    const pt = pointOf(el);
    if (!pt) continue;
    punch(el, 1.12);
    ring(pt, "blue", 150);
    setTimeout(() => ring(pt, "blue", 70), 120);
    floater([pt[0], pt[1] - 10], `▲ ${a}`, "blue", 70, true);
    burst(pt, "blue", 10, 40, { size: 3, gravity: -60 });
  }

  for (const [cid, str] of now.strength) {
    const before = prev.strength.get(cid);
    if (before == null || str <= before) continue;
    const el = tileEl(cid);
    const pt = pointOf(el);
    if (!pt) continue;
    animate(el!, { scale: [1.25, 1], filter: ["brightness(2)", "brightness(1)"] }, { type: "spring", visualDuration: 0.35, bounce: 0.5 });
    floater([pt[0], pt[1] - 20], `+${str - before} str`, "cyan", 60, true);
    burst(pt, "cyan", 12, 40, { size: 4, gravity: -50 });
  }

  if (now.tags > prev.tags) {
    const at = runnerTarget(me);
    reticle(at);
    setTimeout(() => stamp(at, now.tags - prev.tags > 1 ? `+${now.tags - prev.tags} tags` : "Tagged", "red"), 350);
    vignette("red", 0.4);
    buzz([30, 50, 30]);
  }

  if (now.server && !prev.server) {
    const server = document.querySelector(".server.running");
    const to = pointOf(server) ?? [innerWidth / 2, innerHeight / 3];
    warp(to, "cyan");
    banner("Run", serverName(now.server), "cyan", { size: "xl", hold: 0.45 });
    setTimeout(() => {
      ring(to, "cyan", 220);
      punch(server, 1.04);
      kick(0.6);
    }, 420);
    cameraTo(server, 1.035);
    buzz([20, 40, 60]);
    busy = 0.9;
  }

  const hits = readLog(view, prev.log, render);
  let t = busy;
  for (const h of hits) {
    if (h.kind === "break" && h.ice) {
      const iceEl = tileEl(h.ice.cid);
      const target = pointOf(iceEl);
      if (!target) continue;
      const breakerEl = h.breaker ? tileEl(h.breaker.cid) : null;
      const delay = t;
      setTimeout(() => {
        lunge(breakerEl, target, {
          onHit: () => {
            const n = h.power ?? 1;
            for (let i = 0; i < n; i++) setTimeout(() => slash(target, "cyan", 110, -40 + i * 50), i * 90);
            burst(target, "cyan", 16 * n, 70, { size: 6, shards: true, gravity: 40 });
            ring(target, "cyan", 120);
            if (iceEl) animate(iceEl, { x: [0, 7, -6, 4, 0], rotate: [0, 2, -2, 0] }, { duration: 0.35 });
            kick(0.5);
            buzz(20);
          },
        });
        if (!breakerEl) {
          slash(target, "cyan", 110);
          burst(target, "cyan", 14, 60, { size: 5, shards: true });
        }
      }, delay * 1000);
      t += 0.45;
    } else if (h.kind === "fire" && h.ice) {
      const iceEl = tileEl(h.ice.cid);
      const at = runnerTarget(me);
      const delay = t;
      const tone = KIND_TONE[iceKind(h.ice)];
      setTimeout(() => {
        lunge(iceEl, at, {
          reach: 0.9,
          onHit: () => {
            ring(at, "red", 170);
            burst(at, "red", 22, 90, { size: 6, gravity: 30 });
            floater([at[0], at[1] - 30], shortText(h.text ?? ""), "red", 50, true);
            shake(0.9);
            flash("red", 0.22);
            glitch(0.8);
            buzz([60, 30, 60]);
          },
        });
        if (!iceEl) vignette(tone === "blue" ? "cyan" : tone === "red" ? "red" : tone === "orange" ? "orange" : "violet", 0.3);
      }, delay * 1000);
      t += 0.55;
    } else if (h.kind === "damage") {
      const delay = t;
      setTimeout(() => {
        const at: Point = [innerWidth / 2, innerHeight * 0.62];
        cracks(at);
        vignette("red", 0.7);
        flash("red", 0.3);
        shake(1.2 * (h.power ?? 1));
        glitch(1.2);
        stamp([innerWidth / 2, innerHeight * 0.45], `${h.text} damage`, "red");
        buzz([90, 40, 90]);
      }, delay * 1000);
      t += 0.3;
    } else if (h.kind === "purge") {
      flash("violet", 0.35);
      ring([innerWidth / 2, innerHeight / 2], "violet", 360);
      stamp([innerWidth / 2, innerHeight * 0.4], "Purge", "violet");
    }
  }

  if (now.encounter && now.encounter !== prev.encounter) {
    const ice = findIn(view, now.ice);
    if (ice) setTimeout(() => showdown(ice), (t + (prev.rezzed.get(now.ice) === false ? 0.6 : 0)) * 1000);
  }

  if (prev.ice != null && now.ice !== prev.ice && now.server && now.server === prev.server) digitize(wrapEl(prev.ice), "cyan");

  if (prev.server && !now.server) {
    cameraTo(null, 1);
    const server = document.querySelector(`[data-server="${prev.server}"]`);
    const at = pointOf(server) ?? [innerWidth / 2, innerHeight / 3];
    if (prev.phase === "success") {
      banner("Breach", serverName(prev.server), "cyan", { size: "xl", hold: 0.5 });
      ring(at, "cyan", 260);
      rays(at, "cyan", 380, 1);
      burst(at, "cyan", 24, 110, { size: 5, gravity: 20 });
      buzz([30, 30, 30, 30, 80]);
    } else {
      const jacked = (view.log ?? []).slice(prev.log).some((e: any) => /jacks? out/i.test(render(e.text)));
      setTimeout(() => {
        banner(jacked ? "Jacked out" : "Run ended", serverName(prev.server!), "red", { size: "lg", hold: 0.4, from: "right" });
        glitch(1);
        buzz(120);
      }, t * 1000);
    }
  } else if (now.phase === "success" && prev.phase !== "success" && now.server) {
    const server = document.querySelector(".server.running");
    const at = pointOf(server);
    banner("Breach", serverName(now.server), "cyan", { size: "xl", hold: 0.5 });
    if (at) {
      ring(at, "cyan", 260);
      rays(at, "cyan", 380, 1);
      burst(at, "cyan", 24, 110, { size: 5, gravity: 20 });
    }
    buzz([30, 30, 30, 30, 80]);
  }
}

function findIn(view: any, cid: unknown): any {
  let found: any;
  const walk = (x: any) => {
    if (found || !x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (x.cid === cid && x.zone) {
      found = x;
      return;
    }
    for (const [k, v] of Object.entries(x)) if (k !== "abilities" && k !== "subroutines" && k !== "log") walk(v);
  };
  walk(view.corp);
  walk(view.runner);
  return found;
}

function showdown(ice: any) {
  const el = tileEl(ice.cid);
  const r = rectOf(el);
  if (!el || !visible(r) || reduced()) return;
  const kind = iceKind(ice);
  const tone = KIND_TONE[kind];
  const w = Math.min(innerWidth * 0.5, 220);
  const h = w * (88 / 63);
  const big = new DOMRect((innerWidth - w) / 2, Math.max(70, innerHeight * 0.42 - h / 2), w, h);
  const stageEl = node(`fx-showdown tone-${tone}`);
  const ghost = node("fx-ghost fx-showcase", stageEl);
  place(ghost, big);
  const face = el.cloneNode(true) as HTMLElement;
  face.removeAttribute("data-cid");
  face.style.opacity = "";
  const img = face.querySelector("img");
  if (img && ice.code) {
    const hi = new Image();
    hi.onload = () => {
      img.removeAttribute("srcset");
      img.src = hi.src;
    };
    hi.src = `https://card-images.netrunnerdb.com/v2/large/${ice.code}.jpg`;
  }
  ghost.appendChild(face);
  const aura = node(`fx-aura tone-${tone}`, ghost);
  const label = node("fx-showdown-label", stageEl);
  label.innerHTML = "";
  const t1 = document.createElement("span");
  t1.className = "fx-showdown-kind";
  t1.textContent = `Encounter · ${(ice.subtypes ?? []).slice(0, 2).join(" · ")}`;
  const t2 = document.createElement("span");
  t2.className = "fx-showdown-title";
  t2.textContent = ice.title ?? "";
  label.append(t1, t2);
  label.style.top = `${big.bottom + 14}px`;
  const subs = node("fx-showdown-subs", stageEl);
  subs.style.top = `${big.bottom + 64}px`;
  const rows = (ice.subroutines ?? []).slice(0, 4).map((s: any) => {
    const row = document.createElement("span");
    row.textContent = `↳ ${String(s.label ?? "Subroutine").replace(/\[[^\]]+\]/g, "")}`;
    subs.appendChild(row);
    return row;
  });
  const sx = r.width / big.width;
  const sy = r.height / big.height;
  ghost.style.transformOrigin = "0 0";
  el.style.opacity = "0";
  animate(stageEl, { opacity: [0, 1] }, { duration: 0.25 });
  animate(ghost, { x: [r.left - big.left, 0], y: [r.top - big.top, 0], scaleX: [sx, 1], scaleY: [sy, 1], rotate: [-8, 0] }, { type: "spring", visualDuration: 0.45, bounce: 0.3 });
  animate(aura, { opacity: [0, 1, 0.7], scale: [0.8, 1.08, 1] }, { duration: 0.6 });
  animate(t1, { opacity: [0, 1], letterSpacing: ["0.8em", "0.28em"] }, { duration: 0.5, delay: 0.15 });
  animate(t2, { opacity: [0, 1], y: [20, 0], scale: [1.4, 1] }, { type: "spring", visualDuration: 0.4, bounce: 0.4, delay: 0.2 });
  rows.forEach((row: HTMLElement, i: number) => animate(row, { opacity: [0, 1], x: [-30, 0] }, { type: "spring", visualDuration: 0.35, bounce: 0.3, delay: 0.35 + i * 0.08 }));
  setTimeout(() => {
    ring(mid(big), tone, w * 1.9);
    burst(mid(big), tone, 18, w * 0.8, { size: 5, gravity: 0 });
    shake(0.5);
    buzz([40, 30, 40]);
  }, 300);
  const hold = 0.95 + rows.length * 0.12;
  setTimeout(() => {
    animate([label, subs], { opacity: 0 }, { duration: 0.2 });
    animate(aura, { opacity: 0 }, { duration: 0.2 });
    const back = rectOf(tileEl(ice.cid)) ?? r;
    animate(ghost, { x: back.left - big.left, y: back.top - big.top, scaleX: back.width / big.width, scaleY: back.height / big.height, rotate: 0 }, { duration: 0.38, ease: [0.5, 0, 0.3, 1] }).finished.then(
      () => {
        stageEl.remove();
        const cur = tileEl(ice.cid);
        if (cur) {
          cur.style.opacity = "";
          punch(cur, 1.12);
        }
        el.style.opacity = "";
      },
      () => {
        stageEl.remove();
        el.style.opacity = "";
      },
    );
    animate(stageEl, { backgroundColor: ["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"] }, { duration: 0.38 });
  }, hold * 1000);
}

function persistent(view: any) {
  const ice = currentIce(view);
  const encountering = !!view.encounters || view.run?.phase === "encounter-ice";
  const phase = !view.run || !ice ? undefined : encountering && ice.rezzed ? "encounter" : view.run.phase === "approach-ice" ? "approach" : undefined;
  const host = phase ? wrapEl(ice.cid) : null;
  const tone: Tone = ice?.rezzed ? KIND_TONE[iceKind(ice)] : "cyan";
  decorate("lock", phase === "approach" ? host : null, (h) => lockOn(h, tone));
  decorate("firewall", phase === "encounter" ? host : null, (h) => firewall(h, tone));
  decorate("server", view.run ? (document.querySelector(".server.running") as HTMLElement | null) : null, serverScan);
}

function focusPoint(plan: Plan | null, prev: Snap | null, now: Snap): Point | null {
  for (const [cid, rez] of now.rezzed) if (rez && prev?.rezzed.get(cid) === false) return pointOf(tileEl(cid));
  for (const m of plan?.moves ?? []) {
    const p = pointOf(tileEl(m.cid));
    if (p) return p;
  }
  return null;
}

function flipSiblings(rects: Map<unknown, DOMRect>, moved: Set<unknown>) {
  if (reduced()) return;
  for (const el of document.querySelectorAll<HTMLElement>(".playfield .tile[data-cid], .dock .tile[data-cid]")) {
    const cid = el.dataset.cid;
    if (moved.has(cid)) continue;
    const before = rects.get(cid);
    if (!before) continue;
    const after = el.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;
    if (Math.abs(dx) > innerWidth || Math.abs(dy) > innerHeight) continue;
    animate(el, { x: [dx, 0], y: [dy, 0] }, { type: "spring", visualDuration: 0.4, bounce: 0.2 });
  }
}

export function useFx(view: any, me: Side, render: (m: unknown) => string) {
  const last = useRef<any>(null);
  const cards = useRef<ReturnType<typeof collect> | null>(null);
  const plan = useRef<Plan | null>(null);
  const rects = useRef<Map<unknown, DOMRect>>(new Map());
  const state = useRef<Snap | null>(null);

  if (last.current !== view) {
    const next = collect(view);
    plan.current = cards.current && !document.hidden ? prepare(cards.current, next) : null;
    cards.current = next;
    rects.current = new Map();
    if (plan.current) for (const el of document.querySelectorAll<HTMLElement>(".playfield .tile[data-cid], .dock .tile[data-cid]")) rects.current.set(el.dataset.cid, el.getBoundingClientRect());
    last.current = view;
  }

  useLayoutEffect(() => {
    layer();
    const now = snap(view);
    const prev = state.current;
    state.current = now;
    const p = plan.current;
    plan.current = null;
    if (prev && p && !document.hidden) {
      const moved = new Set(p.moves.map((m) => String(m.cid)));
      flipSiblings(rects.current, moved);
      play(p, me);
      events(prev, now, view, me, render, focusPoint(p, prev, now));
    }
    persistent(view);
  }, [view]);

  useLayoutEffect(
    () => () => {
      clearDecorations();
      camera?.stop();
      document.querySelector(".fx-layer")?.replaceChildren();
    },
    [],
  );
}
