import { ColorMatrixFilter, Graphics } from "pixi.js";
import { GlitchFilter, GlowFilter, ShockwaveFilter, ZoomBlurFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, GOLD, type Ready, Smoke, WHITE, burst, painted, pt, scene } from "./kit";
import { type Pt, cubeTexture, glowSprite, lerp, pose, prism, rnd } from "./more";

const HOLO = 0x59ff8a;
const NEON = 0xff4fb0;
const EMBER = 0xff9a4a;
const ICY = 0xbfe6ff;

export const runnerAt = (board?: Board): Pt => (board?.runner ? pt(board.runner) : [innerWidth / 2, innerHeight * 0.88]);
export const jolt = (board?: Board, d = 0.4) => board?.runner && prism(document.querySelector('[data-anchor="runner-panel"]'), d);

export const streakTexture = () =>
  painted("s6-streak", 48, 6, (g) => {
    const grad = g.createLinearGradient(0, 0, 48, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = grad;
    g.fillRect(0, 1, 48, 4);
  });

const dropTexture = () =>
  painted("s6-drop", 20, 28, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(10, 1);
    g.quadraticCurveTo(19, 16, 15, 22);
    g.arc(10, 20, 6, 0, Math.PI);
    g.quadraticCurveTo(1, 16, 10, 1);
    g.fill();
  });

export const triTexture = () =>
  painted("s6-tri", 32, 32, (g) => {
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.beginPath();
    g.moveTo(4, 6);
    g.lineTo(28, 12);
    g.lineTo(12, 28);
    g.closePath();
    g.fill();
  });

const nuggetTexture = () =>
  painted("s6-nugget", 24, 24, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(5, 9);
    g.lineTo(12, 3);
    g.lineTo(20, 8);
    g.lineTo(21, 16);
    g.lineTo(13, 21);
    g.lineTo(4, 17);
    g.closePath();
    g.fill();
  });

export function bezier(a: Pt, b: Pt, c: Pt, k: number): Pt {
  const m = 1 - k;
  return [m * m * a[0] + 2 * m * k * b[0] + k * k * c[0], m * m * a[1] + 2 * m * k * b[1] + k * k * c[1]];
}

export async function carnivore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const jaws = new Graphics();
  jaws.blendMode = "add";
  fx.addChild(jaws);
  const bits = new Emitter(fx);
  root.addChild(fx);
  const teeth = 9;
  let bit = false;
  await run(app, (t, dt) => {
    jaws.clear();
    const close = ease.back(span(t, 0.15, 0.45)) * (1 - 0.35 * span(t, 0.75, 1.1));
    const mid = 0.27;
    const fade = 1 - span(t, 0.9, 1.3);
    const show = fade * span(t, 0, 0.15);
    for (const [edge, dir] of [
      [0.07, 1],
      [0.49, -1],
    ] as const) {
      const gum = edge + (mid - dir * 0.075 - edge) * close;
      const pts: number[] = [...at(0.03, edge), ...at(0.97, edge)];
      for (let i = teeth; i >= 0; i--) {
        const u = 0.03 + (0.94 * i) / teeth;
        pts.push(...at(u, gum));
        if (i > 0) pts.push(...at(u - 0.47 / teeth, gum + dir * 0.07));
      }
      jaws.poly(pts).fill({ color: HOLO, alpha: 0.12 * show });
      jaws.poly(pts).stroke({ width: 1.6, color: HOLO, alpha: 0.85 * show });
    }
    if (!bit && t > 0.42) {
      bit = true;
      for (let i = 0; i < 26; i++) bits.add(cubeTexture(), ...at(rnd(0.15, 0.85), mid + rnd(-0.03, 0.03)), { vx: rnd(-1, 1) * unit * 1.4, vy: rnd(-1, 1) * unit * 0.9, drag: 2, spin: rnd(-6, 6), life: 0.7, tint: HOLO, scale: (unit / 180) * rnd(0.2, 0.45) });
      navigator.vibrate?.(25);
    }
    bits.step(dt);
    return t < 1.3 || bits.list.length > 0;
  });
  await done();
}

export async function cleaver(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, world, fx, done, unit, at } = sc;
  const pane = at(0.62, 0.3);
  const g = new Graphics();
  world.addChild(g);
  const glow = new Graphics();
  glow.blendMode = "add";
  world.addChild(glow);
  const bits = new Emitter(world);
  root.addChild(fx);
  const W = unit * 0.32;
  const H = unit * 0.22;
  let hit = false;
  await run(
    app,
    (t, dt) => {
      g.clear();
      glow.clear();
      const src = root.toGlobal({ x: pane[0], y: pane[1] });
      const to = sc.strike ?? ([src.x, src.y] as Pt);
      const fly = ease.inOut(span(t, 0, 0.35));
      const c = lerp([src.x, src.y], to, fly);
      const rot = -0.5 + fly * 0.4;
      const part = ease.out(span(t, 0.38, 0.9));
      const fade = 1 - span(t, 0.6, 1);
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const P = (x: number, y: number, o: number): number[] => [c[0] + (x * cos - y * sin) + o * cos * unit * 0.25, c[1] + (x * sin + y * cos) + o * sin * unit * 0.25 + Math.abs(o) * unit * 0.15];
      for (const side of t < 0.38 ? [0] : [-1, 1]) {
        const o = side * part;
        const xs = side < 0 ? [-W, 0] : side > 0 ? [0, W] : [-W, W];
        const poly = [...P(xs[0], -H, o), ...P(xs[1], -H, o), ...P(xs[1], H, o), ...P(xs[0], H, o)];
        g.poly(poly).fill({ color: 0xff9fb8, alpha: 0.28 * fade });
        glow.poly(poly).stroke({ width: 1.5, color: 0xffd6e0, alpha: 0.9 * fade });
      }
      const slash = span(t, 0.36, 0.55);
      if (slash > 0 && slash < 1) {
        const L = unit * 0.9;
        const e = ease.out(slash);
        glow
          .moveTo(to[0] - L * 0.6 * Math.cos(rot + 1.3), to[1] - L * 0.6 * Math.sin(rot + 1.3))
          .lineTo(to[0] + (-0.6 + 1.2 * e) * L * Math.cos(rot + 1.3), to[1] + (-0.6 + 1.2 * e) * L * Math.sin(rot + 1.3))
          .stroke({ width: unit * 0.025 * (1 - slash) + 1.5, color: 0xff4a5a, alpha: 0.9 });
      }
      if (!hit && t > 0.38) {
        hit = true;
        for (let i = 0; i < 20; i++) bits.add(triTexture(), to[0] + rnd(-1, 1) * W * 0.5, to[1] + rnd(-1, 1) * H * 0.5, { vx: rnd(-1, 1) * unit * 2, vy: rnd(-1.2, 0.4) * unit * 1.6, gravity: unit * 3, spin: rnd(-8, 8), life: 0.7, tint: i % 3 ? 0xff7a8c : 0xffd0d8, scale: (unit / 180) * rnd(0.25, 0.5), alpha: 0.85 });
        navigator.vibrate?.(20);
      }
      bits.step(dt);
      return t < 1 || bits.list.length > 0;
    },
    sc.strike ? 1.1 : 1,
  );
  g.destroy();
  glow.destroy();
  await done();
}

export async function leech(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const mouth = at(0.63, 0.26);
  const eyes = [at(0.47, 0.215), at(0.57, 0.165)].map((p) => {
    const s = glowSprite(fx, glowTexture(), HOLO);
    s.position.set(...p);
    return s;
  });
  const drops = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + rnd(-0.2, 0.2);
    const r = unit * rnd(0.75, 1);
    const s = glowSprite(fx, dropTexture(), i % 3 ? 0xff3a6a : NEON);
    return { s, from: [mouth[0] + Math.cos(a) * r, mouth[1] + Math.sin(a) * r * 1.3] as Pt, at: i * 0.05, spin: rnd(0.6, 1.2) * (i % 2 ? 1 : -1) };
  });
  const gulp = glowSprite(fx, glowTexture(), NEON);
  gulp.position.set(...mouth);
  root.addChild(fx);
  await run(app, (t) => {
    let landed = 0;
    for (const d of drops) {
      const k = span(t, d.at, d.at + 0.6);
      const e = ease.inOut(k);
      const a = d.spin * (1 - e) * 1.5;
      const dx = d.from[0] - mouth[0];
      const dy = d.from[1] - mouth[1];
      const r = 1 - e;
      d.s.position.set(mouth[0] + (dx * Math.cos(a) - dy * Math.sin(a)) * r, mouth[1] + (dx * Math.sin(a) + dy * Math.cos(a)) * r);
      d.s.rotation = Math.atan2(-dy, -dx) + Math.PI / 2;
      d.s.alpha = k > 0 && k < 1 ? 0.9 : 0;
      d.s.scale.set((unit / 180) * 0.35);
      if (k >= 1) landed++;
    }
    const swell = landed / drops.length;
    gulp.alpha = 0.6 * swell * (1 - span(t, 1.3, 1.6));
    gulp.scale.set((unit / 128) * (0.12 + 0.2 * swell));
    for (const e of eyes) {
      e.alpha = (0.4 + 0.6 * swell) * (1 - span(t, 1.3, 1.6));
      e.scale.set((unit / 128) * 0.07);
    }
    return t < 1.6;
  });
  await done();
}

export async function tranquilizerPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.5, 0.5);
  const rx = rect.width * 0.47;
  const ry = rect.height * 0.43;
  const rim = new Graphics();
  rim.blendMode = "add";
  fx.addChild(rim);
  const bubbles = new Emitter(fx);
  const dream = glowSprite(fx, glowTexture(), 0x9a8cff);
  dream.position.set(...at(0.45, 0.33));
  root.addChild(fx);
  await run(app, (t, dt) => {
    rim.clear();
    const k = ease.inOut(span(t, 0.05, 1));
    const fade = 1 - span(t, 1.4, 1.8);
    const a0 = Math.PI;
    const a1 = Math.PI + Math.PI * k;
    if (k > 0) {
      rim.moveTo(c[0] + Math.cos(a0) * rx, c[1] + Math.sin(a0) * ry);
      for (let i = 1; i <= 30; i++) {
        const a = a0 + ((a1 - a0) * i) / 30;
        rim.lineTo(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry);
      }
      rim.stroke({ width: unit * 0.02, color: 0x8fe8ff, alpha: 0.4 * fade });
      const h = Math.max(a0, a1 - 0.5);
      rim.moveTo(c[0] + Math.cos(h) * rx, c[1] + Math.sin(h) * ry);
      for (let i = 1; i <= 10; i++) {
        const a = h + ((a1 - h) * i) / 10;
        rim.lineTo(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry);
      }
      rim.stroke({ width: 1.6, color: WHITE, alpha: 0.85 * fade });
    }
    if (t < 1.3 && Math.random() < 0.25) bubbles.add(glowTexture(), ...at(rnd(0.2, 0.8), rnd(0.35, 0.45)), { vy: -unit * rnd(0.15, 0.3), vx: rnd(-1, 1) * unit * 0.03, life: 1.1, tint: 0xbfe9ff, scale: (unit / 128) * rnd(0.03, 0.06), alpha: 0.7 });
    const breath = 0.5 - 0.5 * Math.cos(t * Math.PI * 1.6);
    dream.alpha = 0.3 * breath * fade;
    dream.scale.set((unit / 128) * (0.45 + 0.1 * breath));
    bubbles.step(dt);
    return t < 1.8 || bubbles.list.length > 0;
  });
  await done();
}

const SCREEN = [0.45, 0.1, 0.94, 0.34] as const;

function screenQuad(at: (u: number, v: number) => Pt, k = 1): number[] {
  const [u0, v0, u1, v1] = SCREEN;
  return [...at(u0, v0 + 0.02), ...at(u1, v0), ...at(u1, v0 + (v1 - v0) * k), ...at(u0, v0 + 0.02 + (v1 - v0 - 0.04) * k)];
}

export async function redTeamPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const [u0, v0, u1, v1] = SCREEN;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const rows = Array.from({ length: 9 }, () => ({ u: rnd(u0 + 0.03, u1 - 0.25), w: rnd(0.05, 0.2), v: rnd(v0 + 0.04, v1 - 0.04) }));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const k = ease.out(span(t, 0.05, 0.6));
    const fade = 1 - span(t, 1.3, 1.7);
    if (k > 0) g.poly(screenQuad(at, k)).fill({ color: 0x66c8ff, alpha: 0.12 * fade });
    const scan = v0 + (v1 - v0) * k;
    if (k < 1)
      g.moveTo(...at(u0, scan))
        .lineTo(...at(u1, scan))
        .stroke({ width: 1.8, color: WHITE, alpha: 0.9 });
    rows.forEach((r, i) => {
      if (r.v > scan) return;
      const on = Math.random() < 0.92 ? 1 : 0;
      const w = r.w * (0.6 + 0.4 * Math.sin(t * 6 + i));
      g.moveTo(...at(r.u, r.v))
        .lineTo(...at(r.u + w, r.v))
        .stroke({ width: unit * 0.008, color: 0x8fd8ff, alpha: 0.7 * on * fade });
    });
    return t < 1.7;
  });
  await done();
}

export async function redTeam(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const [u0, v0, u1, v1] = SCREEN;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const lock = at(0.74, 0.26);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.2, 1.6);
    const alarm = 0.5 + 0.5 * Math.sin(t * 14);
    g.poly(screenQuad(at)).fill({ color: 0xff3040, alpha: 0.12 * alarm * fade * span(t, 0, 0.2) });
    for (let i = 0; i < 7; i++) {
      const v = v0 + 0.03 + ((((i * 0.045 + t * 0.12) % (v1 - v0 - 0.06)) + v1 - v0 - 0.06) % (v1 - v0 - 0.06));
      g.moveTo(...at(u0 + 0.02, v))
        .lineTo(...at(u0 + 0.02 + 0.08 + ((i * 37) % 10) * 0.02, v))
        .stroke({ width: unit * 0.008, color: 0xff6a70, alpha: 0.7 * fade });
    }
    const k = ease.out(span(t, 0.2, 0.7));
    const R = unit * (0.22 - 0.12 * k);
    g.circle(lock[0], lock[1], R).stroke({ width: 1.5, color: 0xff4a50, alpha: 0.9 * fade * span(t, 0.15, 0.3) });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + (1 - k) * 1.2;
      g.moveTo(lock[0] + Math.cos(a) * R * 0.6, lock[1] + Math.sin(a) * R * 0.6).lineTo(lock[0] + Math.cos(a) * R * 1.35, lock[1] + Math.sin(a) * R * 1.35);
    }
    g.stroke({ width: 1.5, color: 0xff4a50, alpha: 0.9 * fade * span(t, 0.15, 0.3) });
    if (k >= 1) g.circle(lock[0], lock[1], unit * 0.015).fill({ color: 0xffd0d0, alpha: fade * (Math.floor(t * 8) % 2) });
    return t < 1.6;
  });
  await done();
}

export async function t400Pose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const gems: Pt[] = [at(0.32, 0.28), at(0.55, 0.3), at(0.74, 0.19), at(0.86, 0.37), at(0.43, 0.42)];
  const trace: Pt[] = [at(0.04, 0.47), at(0.2, 0.47), at(0.3, 0.38), at(0.32, 0.28), at(0.55, 0.3), at(0.86, 0.37)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const stars = gems.map((p) => {
    const s = glowSprite(fx, sparkTexture(), WHITE);
    s.position.set(...p);
    return s;
  });
  const halos = gems.map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xa98cff);
    s.position.set(...p);
    return s;
  });
  const lens: number[] = [];
  for (let i = 1; i < trace.length; i++) lens.push(Math.hypot(trace[i][0] - trace[i - 1][0], trace[i][1] - trace[i - 1][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const along = (d: number): Pt => {
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i]) return lerp(trace[i], trace[i + 1], d / lens[i]);
      d -= lens[i];
    }
    return trace[trace.length - 1];
  };
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const k = ease.inOut(span(t, 0, 1.1));
    const fade = 1 - span(t, 1.3, 1.7);
    const head = k * total;
    const tail = Math.max(0, head - total * 0.25);
    g.moveTo(...along(tail));
    for (let i = 1; i <= 24; i++) g.lineTo(...along(tail + ((head - tail) * i) / 24));
    g.stroke({ width: 1.6, color: 0x9dffc8, alpha: 0.85 * fade });
    let d = 0;
    gems.forEach((_, i) => {
      const idx = trace.findIndex((p) => p === gems[i]);
      if (idx > 0) d = lens.slice(0, idx).reduce((a, b) => a + b, 0);
      else d = total * (0.75 + i * 0.05);
      const reach = (d / total) * 1.1;
      const f = Math.sin(Math.PI * span(t, reach, reach + 0.45));
      stars[i].alpha = f;
      stars[i].rotation = t * 1.5 + i;
      stars[i].scale.set((unit / 120) * 0.45 * f);
      halos[i].alpha = 0.35 * f;
      halos[i].scale.set((unit / 128) * 0.18);
    });
    return t < 1.7;
  });
  await done();
}

export async function sprint(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.45, 0.27);
  const zoom = new ZoomBlurFilter({ strength: 0, innerRadius: unit * 0.25, radius: unit * 0.8 });
  card.filters = [zoom];
  const lines = new Emitter(fx);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = Math.sin(Math.PI * span(t, 0, 1.4));
    const fp = filterPoint(card, c[0], c[1]);
    zoom.center = { x: fp.x, y: fp.y };
    zoom.strength = 0.06 * on;
    if (t < 1.1)
      for (let n = 0; n < 3; n++) {
        const a = rnd(0, Math.PI * 2);
        const v = unit * rnd(1.4, 2.4);
        lines.add(streakTexture(), c[0] + Math.cos(a) * unit * 0.08, c[1] + Math.sin(a) * unit * 0.08, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35, tint: Math.random() < 0.4 ? WHITE : 0x7ad0ff, scale: (unit / 180) * rnd(0.4, 0.9) });
      }
    for (const p of lines.list) p.s.rotation = Math.atan2(p.vy, p.vx);
    g.clear();
    for (let i = 0; i < 4; i++) {
      const k = ((t * 1.4 + i / 4) % 1) * span(t, 0, 0.2) * (1 - span(t, 1.1, 1.4));
      if (k <= 0) continue;
      g.ellipse(c[0], c[1], unit * 0.7 * k * k, unit * 0.6 * k * k).stroke({ width: 1 + 2 * k, color: 0x7ad0ff, alpha: 0.6 * k * (1 - k) * 3 });
    }
    lines.step(dt);
    return t < 1.4 || lines.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function neurospike(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.47, 0.3);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const bolt = new Graphics();
  bolt.blendMode = "add";
  world.addChild(bolt);
  const core = glowSprite(fx, glowTexture(), 0x7dff9a);
  core.position.set(...c);
  const sparks = new Emitter(world);
  const spikes = Array.from({ length: 11 }, (_, i) => ({ a: (i / 11) * Math.PI * 2 + rnd(-0.15, 0.15), len: unit * rnd(0.3, 0.55), d: rnd(0, 0.15) }));
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 0.9, 1.3);
    for (const s of spikes) {
      const k = ease.out(span(t, 0.05 + s.d, 0.35 + s.d));
      if (k <= 0) continue;
      const p0: Pt = [c[0] + Math.cos(s.a) * unit * 0.1, c[1] + Math.sin(s.a) * unit * 0.1];
      const p1: Pt = [c[0] + Math.cos(s.a) * (unit * 0.1 + s.len * k), c[1] + Math.sin(s.a) * (unit * 0.1 + s.len * k)];
      const nx = -Math.sin(s.a) * unit * 0.012;
      const ny = Math.cos(s.a) * unit * 0.012;
      g.poly([p0[0] + nx, p0[1] + ny, ...p1, p0[0] - nx, p0[1] - ny]).fill({ color: 0xeafff0, alpha: 0.85 * fade });
    }
    const pulse = Math.sin(Math.PI * span(t, 0, 0.8));
    core.alpha = 0.7 * pulse;
    core.scale.set((unit / 128) * (0.25 + 0.25 * pulse));
    bolt.clear();
    const k = span(t, 0.45, 0.75);
    if (k > 0 && k < 1) {
      const src = root.toGlobal({ x: c[0], y: c[1] });
      const tip = lerp([src.x, src.y], target, ease.inOut(k));
      const back = lerp([src.x, src.y], target, Math.max(0, ease.inOut(k) - 0.25));
      bolt
        .moveTo(...back)
        .lineTo(...tip)
        .stroke({ width: unit * 0.03, color: 0x7dff9a, alpha: 0.35 });
      bolt
        .moveTo(...back)
        .lineTo(...tip)
        .stroke({ width: 2, color: WHITE, alpha: 0.95 });
    }
    if (!hit && t > 0.75) {
      hit = true;
      burst(sparks, target[0], target[1], 22, 0x7dff9a, unit * 1.6, { life: 0.5, scale: 0.35 });
      jolt(board);
    }
    sparks.step(dt);
    return t < 1.3 || sparks.list.length > 0;
  });
  bolt.destroy();
  await done();
}

export async function ansel(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const swirl = at(0.62, 0.84);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const tris = Array.from({ length: 16 }, () => {
    const u = rnd(0.12, 0.9);
    const v = rnd(0.55, 0.95);
    return { pts: [at(u, v), at(u + rnd(-0.1, 0.1), v + rnd(0.03, 0.08)), at(u + rnd(0.04, 0.12), v + rnd(-0.06, 0.02))], d: rnd(0, 0.6) };
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    for (const tr of tris) {
      const f = Math.sin(Math.PI * span(t, tr.d, tr.d + 0.7));
      if (f <= 0) continue;
      g.poly(tr.pts.flat())
        .fill({ color: 0x6ff0e6, alpha: 0.12 * f })
        .stroke({ width: 1.2, color: 0xbffff6, alpha: 0.7 * f });
    }
    for (let i = 0; i < 4; i++) {
      const r = unit * (0.05 + i * 0.045);
      const a = t * (i % 2 ? -2.5 : 2) + i;
      const len = Math.PI * (0.6 + 0.8 * ease.out(span(t, 0.1 + i * 0.1, 0.7 + i * 0.1)));
      g.moveTo(swirl[0] + Math.cos(a) * r, swirl[1] + Math.sin(a) * r)
        .arc(swirl[0], swirl[1], r, a, a + len)
        .stroke({ width: 1.6, color: 0x6ff0e6, alpha: 0.8 * fade * span(t, 0.1 + i * 0.1, 0.3 + i * 0.1) });
    }
    return t < 1.7;
  });
  await done();
}

export async function ballista(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const bars: [Pt, Pt, number][] = [
    [at(0.38, 0.87), at(0.8, 0.53), ICY],
    [at(0.32, 0.6), at(0.79, 0.86), ICY],
    [at(0.52, 0.84), at(0.88, 0.53), 0xff4a4a],
  ];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const landed = [false, false, false];
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.2, 1.6);
    bars.forEach(([a, b, c], i) => {
      const k = ease.out(span(t, 0.1 + i * 0.2, 0.45 + i * 0.2));
      if (k <= 0) return;
      const tip = lerp(a, b, k);
      g.moveTo(...a)
        .lineTo(...tip)
        .stroke({ width: i === 2 ? 1.6 : unit * 0.025, color: c, alpha: (i === 2 ? 0.9 : 0.5) * fade });
      if (k >= 1 && !landed[i]) {
        landed[i] = true;
        burst(sparks, ...b, 8, c, unit * 0.8, { life: 0.35, scale: 0.3 });
      }
    });
    sparks.step(dt);
    return t < 1.6 || sparks.list.length > 0;
  });
  await done();
}

export async function ballistaFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const nock = at(0.38, 0.87);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const sparks = new Emitter(world);
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const src = root.toGlobal({ x: nock[0], y: nock[1] });
    const draw = ease.out(span(t, 0, 0.25));
    const dir = Math.atan2(target[1] - src.y, target[0] - src.x);
    const L = unit * 0.5;
    const pull = draw * unit * 0.12;
    const k = ease.inOut(span(t, 0.3, 0.55));
    const tip: Pt = [src.x - Math.cos(dir) * pull + (target[0] - src.x) * k, src.y - Math.sin(dir) * pull + (target[1] - src.y) * k];
    if (t < 0.6) {
      const tail: Pt = [tip[0] - Math.cos(dir) * L, tip[1] - Math.sin(dir) * L];
      g.moveTo(...tail)
        .lineTo(...tip)
        .stroke({ width: unit * 0.03, color: ICY, alpha: 0.85 });
      g.moveTo(tail[0] + Math.sin(dir) * unit * 0.02, tail[1] - Math.cos(dir) * unit * 0.02)
        .lineTo(tip[0] + Math.sin(dir) * unit * 0.02, tip[1] - Math.cos(dir) * unit * 0.02)
        .stroke({ width: 1.4, color: 0xff4a4a, alpha: 0.9 });
      if (k > 0)
        g.moveTo(src.x, src.y)
          .lineTo(...tail)
          .stroke({ width: 1, color: ICY, alpha: 0.3 });
    }
    if (!hit && t > 0.55) {
      hit = true;
      for (let i = 0; i < 18; i++) sparks.add(triTexture(), ...target, { vx: rnd(-1, 1) * unit * 2, vy: rnd(-1.4, 0.2) * unit * 1.6, gravity: unit * 3, spin: rnd(-8, 8), life: 0.6, tint: i % 3 ? ICY : 0xff6a6a, scale: (unit / 180) * rnd(0.25, 0.45), alpha: 0.85 });
      jolt(board);
      navigator.vibrate?.(30);
    }
    sparks.step(dt);
    return t < 0.7 || sparks.list.length > 0;
  });
  g.destroy();
  await done();
}

export async function tithe(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const c = at(0.48, 0.76);
  const core = glowSprite(fx, glowTexture(), 0xd8f4ff);
  core.position.set(...c);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.02, wavelength: unit * 0.25, speed: unit * 1.2, brightness: 1.05, radius: unit * 0.5, time: 0 });
  card.filters = [wave];
  root.addChild(fx);
  await run(app, (t) => {
    const f = Math.sin(Math.PI * span(t, 0, 1.6));
    core.alpha = 0.55 * f;
    const [sx, sy] = [(unit / 128) * (0.4 + 0.15 * f), (unit / 128) * (0.22 + 0.08 * f)];
    core.scale.set(sideways ? sy : sx, sideways ? sx : sy);
    const fp = filterPoint(card, c[0], c[1]);
    wave.center = { x: fp.x, y: fp.y };
    wave.time = t;
    wave.amplitude = unit * 0.02 * (1 - span(t, 0.2, 1.4));
    return t < 1.6;
  });
  card.filters = [];
  await done();
}

export async function titheFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const c = at(0.48, 0.76);
  const core = glowSprite(fx, glowTexture(), 0xd8f4ff);
  core.position.set(...c);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const target = runnerAt(board);
  const wisps = Array.from({ length: 8 }, (_, i) => ({ off: [rnd(-1, 1) * unit * 0.5, rnd(-1, 1) * unit * 0.4] as Pt, d: 0.25 + i * 0.05, from: [target[0] + rnd(-1, 1) * unit * 0.4, target[1] + rnd(-0.5, 0.5) * unit * 0.2] as Pt }));
  root.addChild(fx);
  jolt(board, 0.3);
  await run(app, (t) => {
    g.clear();
    const src = root.toGlobal({ x: c[0], y: c[1] });
    const dst: Pt = [src.x, src.y];
    for (const w of wisps) {
      const k = ease.inOut(span(t, w.d, w.d + 0.6));
      if (k <= 0 || k >= 1) continue;
      const ctrl: Pt = [(w.from[0] + dst[0]) / 2 + w.off[0], (w.from[1] + dst[1]) / 2 + w.off[1]];
      const tail = Math.max(0, k - 0.3);
      g.moveTo(...bezier(w.from, ctrl, dst, tail));
      for (let i = 1; i <= 12; i++) g.lineTo(...bezier(w.from, ctrl, dst, tail + ((k - tail) * i) / 12));
      g.stroke({ width: 1.6, color: 0xd8f4ff, alpha: 0.8, cap: "round" });
    }
    const f = span(t, 0.5, 1) * (1 - span(t, 1.1, 1.4));
    core.alpha = 0.7 * f;
    const [sx, sy] = [(unit / 128) * (0.3 + 0.2 * f), (unit / 128) * 0.2];
    core.scale.set(sideways ? sy : sx, sideways ? sx : sy);
    return t < 1.4;
  });
  g.destroy();
  await done();
}

export const anselPose = pose(0x6ff0e6, [0.4, 0.72]);
export const divinerPose = pose(0x3dff7a, [0.45, 0.62]);
export const karunaPose = pose(EMBER, [0.62, 0.64]);
export const ballistaPose = pose(ICY, [0.61, 0.74]);
export const palisadePose = pose(0x6ff0d0, [0.6, 0.62]);
export const tithePose = pose(0xd8f4ff, [0.48, 0.76]);
