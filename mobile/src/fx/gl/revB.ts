import { Graphics } from "pixi.js";
import { Emitter, ease, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, coinTexture, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";
import { jolt, runnerAt, streakTexture } from "./sixth";

type At = (u: number, v: number) => Pt;

const quadPts = (at: At, q: [number, number][]) => q.flatMap(([u, v]) => at(u, v));

function ring(at: At, cu: number, cv: number, ru: number, rv: number, a0 = 0, a1 = Math.PI * 2, n = 40) {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(...at(cu + Math.cos(a) * ru, cv + Math.sin(a) * rv));
  }
  return pts;
}

export async function fransofiaWard(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const panels: [number, number][][] = [
    [
      [0.62, 0.135],
      [0.74, 0.135],
      [0.74, 0.19],
      [0.62, 0.19],
    ],
    [
      [0.59, 0.27],
      [0.79, 0.26],
      [0.79, 0.35],
      [0.59, 0.36],
    ],
    [
      [0.54, 0.385],
      [0.76, 0.385],
      [0.76, 0.48],
      [0.54, 0.48],
    ],
  ];
  const glint = glowSprite(fx, sparkTexture(), 0xd8ffe8);
  glint.position.set(...at(0.59, 0.27));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const spin = t * 2.2;
    for (let i = 0; i < 3; i++) {
      const r = 0.075 + i * 0.022;
      const a = spin * (i % 2 ? -1 : 1) + i * 1.7;
      const len = Math.PI * (0.35 + 0.5 * ease.out(span(t, 0.05 + i * 0.1, 0.6 + i * 0.1)));
      g.poly(ring(at, 0.88, 0.25, r, r * 0.72, a, a + len, 18), false).stroke({ width: 1.6, color: 0x9affc0, alpha: 0.8 * fade });
    }
    panels.forEach((q, i) => {
      const on = span(t, 0.2 + i * 0.25, 0.35 + i * 0.25) * fade;
      if (on <= 0) return;
      const flick = Math.random() < 0.06 ? 0.4 : 1;
      g.poly(quadPts(at, q))
        .fill({ color: 0x7affb0, alpha: 0.1 * on * flick })
        .stroke({ width: 1.2, color: 0xc8ffe0, alpha: 0.75 * on * flick });
      const s = (t * 0.8 + i * 0.3) % 1;
      const [a, b, c, d] = q;
      const l: Pt = at(a[0] + (d[0] - a[0]) * s, a[1] + (d[1] - a[1]) * s);
      const rr: Pt = at(b[0] + (c[0] - b[0]) * s, b[1] + (c[1] - b[1]) * s);
      g.moveTo(...l)
        .lineTo(...rr)
        .stroke({ width: 1, color: 0xe0fff0, alpha: 0.5 * on });
    });
    const gl = Math.sin(Math.PI * span(t, 0.9, 1.3));
    glint.alpha = 0.8 * gl;
    glint.rotation = t;
    glint.scale.set((unit / 120) * 0.22 * gl);
    return t < 1.9;
  });
  await done();
}

export async function illumination(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const tip = at(0.44, 0.13);
  const g = new Graphics();
  fx.addChild(g);
  const lamp = glowSprite(fx, glowTexture(), 0x9af0ff);
  lamp.position.set(...tip);
  const motes = new Emitter(fx);
  const shadows = [
    [0.12, 0.17, 0.34],
    [0.19, 0.19, 0.36],
  ];
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const on = span(t, 0.1, 0.5) * (1 - span(t, 1.5, 1.9));
    const flicker = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7);
    lamp.alpha = 0.55 * on * flicker;
    lamp.scale.set((unit / 128) * 0.14);
    g.poly([...tip, ...at(0.04, 0.1), ...at(0.04, 0.44), ...at(0.24, 0.42)]).fill({ color: 0xd8b0ff, alpha: 0.16 * on * flicker });
    for (const [u, v0, v1] of shadows) {
      const sway = Math.sin(t * 3 + u * 20) * 0.012;
      const top = at(u + sway, v0);
      const bot = at(u - sway * 0.5, v1);
      g.moveTo(...top)
        .lineTo(...bot)
        .stroke({ width: unit * 0.016, color: 0x3a1a4a, alpha: 0.6 * on });
      g.circle(...top, unit * 0.022).fill({ color: 0x3a1a4a, alpha: 0.6 * on });
      g.moveTo(...lerp(top, bot, 0.3))
        .lineTo(...at(u + sway - 0.04, v0 + 0.08 + sway))
        .stroke({ width: unit * 0.009, color: 0x3a1a4a, alpha: 0.55 * on });
      g.moveTo(...lerp(top, bot, 0.3))
        .lineTo(...at(u + sway + 0.04, v0 + 0.07 - sway))
        .stroke({ width: unit * 0.009, color: 0x3a1a4a, alpha: 0.55 * on });
    }
    if (t < 1.5 && Math.random() < 0.4) {
      const k = Math.random();
      const p = lerp(tip, at(0.08, rnd(0.15, 0.42)), k);
      motes.add(sparkTexture(), ...p, { vx: -unit * 0.08, vy: rnd(-1, 1) * unit * 0.03, life: 0.7, tint: Math.random() < 0.5 ? 0xe0c8ff : 0x9af0ff, scale: (unit / 180) * 0.16, alpha: 0.7 });
    }
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

export async function peerReview(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const hand = at(0.5, 0.2);
  const dot = glowSprite(fx, glowTexture(), 0xff4a4a);
  const helix = (s: number, ph: number) => at(0.395 + 0.035 * Math.sin(s * 15 + ph), 0.42 - s * 0.32);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const k = ease.inOut(span(t, 0.1, 1.2));
    for (const ph of [0, Math.PI]) {
      const tail = Math.max(0, k - 0.3);
      const pts: number[] = [];
      for (let i = 0; i <= 20; i++) pts.push(...helix(tail + ((k - tail) * i) / 20, ph));
      if (k > 0) g.poly(pts, false).stroke({ width: 1.6, color: 0xffd060, alpha: 0.75 * fade });
    }
    for (let i = 0; i <= 10; i++) {
      const s = (i / 10) * k;
      if (s < Math.max(0, k - 0.3)) continue;
      g.moveTo(...helix(s, 0))
        .lineTo(...helix(s, Math.PI))
        .stroke({ width: 1, color: 0xffe8a0, alpha: 0.45 * fade });
    }
    const p = helix(k, 0);
    const beam = span(t, 0.05, 0.25) * fade;
    g.moveTo(...hand)
      .lineTo(...p)
      .stroke({ width: 1, color: 0xff5a5a, alpha: 0.65 * beam });
    dot.position.set(...p);
    dot.alpha = 0.6 * beam;
    dot.scale.set((unit / 128) * 0.035);
    return t < 1.9;
  });
  await done();
}

const NPOT_AXIS: [Pt, Pt] = [
  [0.55, 0.73],
  [0.2, 0.86],
];
const CLAMPS: [number, number][] = [
  [0.65, 0.62],
  [0.71, 0.93],
];

function mouth(at: At, k: number, r: number) {
  const [a, b] = NPOT_AXIS;
  const cu = a[0] + (b[0] - a[0]) * k;
  const cv = a[1] + (b[1] - a[1]) * k;
  return ring(at, cu, cv, r * 0.28, r, 0, Math.PI * 2, 28);
}

export async function nPot(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    for (let i = 0; i < 4; i++) {
      const k = span(t, 0.1 + i * 0.22, 0.75 + i * 0.22);
      if (k <= 0 || k >= 1) continue;
      g.poly(mouth(at, k, 0.05 + 0.11 * k)).stroke({ width: 1.5, color: 0xffe85a, alpha: 0.8 * Math.sin(Math.PI * k) * fade });
    }
    if (t > 0.15 && t < 1.4 && Math.floor(t * 20) % 3 === 0)
      for (const [u, v] of CLAMPS) {
        const a = at(u, v);
        lightning(g, a[0], a[1], ...at(u + rnd(-0.06, 0.06), v + rnd(-0.05, 0.05)), unit * 0.04, 0xffe85a, unit * 0.004);
      }
    return t < 1.8;
  });
  await done();
}

export async function nPotFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const w = new Graphics();
  w.blendMode = "add";
  world.addChild(w);
  const sparks = new Emitter(world);
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    w.clear();
    const charge = span(t, 0, 0.35);
    if (charge < 1)
      for (let i = 0; i < 3; i++) {
        const k = (charge * 2 + i / 3) % 1;
        g.poly(mouth(at, k, 0.05 + 0.11 * k)).stroke({ width: 1.4, color: 0xffe85a, alpha: 0.7 * (1 - k) });
      }
    const src = at(...NPOT_AXIS[1]);
    const s = root.toGlobal({ x: src[0], y: src[1] });
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.35 + i * 0.08, 0.75 + i * 0.08);
      if (k <= 0 || k >= 1) continue;
      const c = lerp([s.x, s.y], target, k);
      const dir = Math.atan2(target[1] - s.y, target[0] - s.x);
      const R = unit * (0.08 + 0.12 * k);
      w.moveTo(c[0] + Math.cos(dir - 1.2) * R, c[1] + Math.sin(dir - 1.2) * R)
        .arc(c[0], c[1], R, dir - 1.2, dir + 1.2)
        .stroke({ width: 2 * (1 - k) + 0.8, color: 0xffe85a, alpha: 0.8 * (1 - k * 0.5) });
    }
    if (!hit && t > 0.75) {
      hit = true;
      for (let n = 0; n < 16; n++) sparks.add(sparkTexture(), ...target, { vx: rnd(-1, 1) * unit * 1.4, vy: rnd(-1, 1) * unit * 1.2, drag: 2.5, life: 0.45, tint: 0xffe85a, scale: (unit / 180) * 0.25, alpha: 0.8 });
      jolt(board);
    }
    sparks.step(dt);
    return t < 0.95 || sparks.list.length > 0;
  });
  w.destroy();
  await done();
}

export async function plutus(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sockets = [at(0.461, 0.254), at(0.528, 0.258)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xb07aff);
    s.position.set(...p);
    return s;
  });
  const glints = Array.from({ length: 6 }, () => ({ s: glowSprite(fx, sparkTexture(), 0xffe08a), p: at(rnd(0.4, 0.62), rnd(0.36, 0.46)), d: rnd(0.3, 1.2) }));
  const coins = new Emitter(fx);
  const lip = at(0.49, 0.33);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const fade = 1 - span(t, 1.5, 1.9);
    sockets.forEach((s, i) => {
      s.alpha = 0.45 * span(t, 0.1 + i * 0.1, 0.4 + i * 0.1) * fade * (0.8 + 0.2 * Math.sin(t * 6));
      s.scale.set((unit / 128) * 0.07);
    });
    for (const gl of glints) {
      const f = Math.sin(Math.PI * span(t, gl.d, gl.d + 0.3));
      gl.s.position.set(...gl.p);
      gl.s.alpha = 0.85 * f;
      gl.s.rotation = t;
      gl.s.scale.set((unit / 120) * 0.2 * f);
    }
    if (t > 0.4 && t < 1.2 && Math.random() < 0.18) coins.add(coinTexture(), lip[0] + rnd(-1, 1) * unit * 0.04, lip[1], { vx: rnd(-1, 1) * unit * 0.12, vy: unit * rnd(0.05, 0.15), gravity: unit * 1.4, spin: rnd(-5, 5), life: 0.6, scale: (unit / 180) * rnd(0.1, 0.14), blend: "normal" });
    coins.step(dt);
    return t < 1.9 || coins.list.length > 0;
  });
  await done();
}

export async function sideHustlePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const thruster = at(0.41, 0.44);
  const plume = new Emitter(fx);
  const streaks = new Emitter(fx);
  const core = at(0.42, 0.24);
  const glow = glowSprite(fx, glowTexture(), 0x4fc8ff);
  glow.position.set(...thruster);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.25) * (1 - span(t, 1.3, 1.6));
    glow.alpha = 0.35 * on * (0.8 + 0.2 * Math.sin(t * 30));
    glow.scale.set((unit / 128) * 0.16, (unit / 128) * 0.1);
    if (t < 1.3) for (let n = 0; n < 2; n++) plume.add(sparkTexture(), thruster[0] + rnd(-1, 1) * unit * 0.05, thruster[1], { vx: rnd(-1, 1) * unit * 0.1, vy: unit * rnd(0.25, 0.45), life: 0.3, tint: Math.random() < 0.6 ? 0x4fc8ff : 0xb0ecff, scale: (unit / 180) * rnd(0.2, 0.3), alpha: 0.75 });
    if (t < 1.2 && Math.random() < 0.5) {
      const a = rnd(0, Math.PI * 2);
      const r = unit * rnd(0.22, 0.3);
      streaks.add(streakTexture(), core[0] + Math.cos(a) * r, core[1] + Math.sin(a) * r * 0.8, { vx: Math.cos(a) * unit * 1.6, vy: Math.sin(a) * unit * 1.3, life: 0.22, tint: 0xd8f0ff, scale: (unit / 180) * rnd(0.4, 0.7), alpha: 0.4 });
    }
    for (const p of streaks.list) p.s.rotation = Math.atan2(p.vy, p.vx);
    plume.step(dt);
    streaks.step(dt);
    return t < 1.6 || plume.list.length > 0 || streaks.list.length > 0;
  });
  await done();
}

