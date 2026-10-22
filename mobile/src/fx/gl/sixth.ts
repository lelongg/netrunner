import { ColorMatrixFilter, Graphics } from "pixi.js";
import { GlitchFilter, GlowFilter, ShockwaveFilter, ZoomBlurFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, GOLD, type Ready, Smoke, WHITE, burst, painted, pt, scene } from "./kit";
import { type Pt, cubeTexture, glowSprite, lerp, pose, prism, rnd } from "./more";

const HOLO = 0x59ff8a;
const NEON = 0xff4fb0;
const EMBER = 0xff9a4a;
const ICY = 0xbfe6ff;

const runnerAt = (board?: Board): Pt => (board?.runner ? pt(board.runner) : [innerWidth / 2, innerHeight * 0.88]);
const jolt = (board?: Board, d = 0.4) => board?.runner && prism(document.querySelector('[data-anchor="runner-panel"]'), d);

const streakTexture = () =>
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

const triTexture = () =>
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

function bezier(a: Pt, b: Pt, c: Pt, k: number): Pt {
  const m = 1 - k;
  return [m * m * a[0] + 2 * m * k * b[0] + k * k * c[0], m * m * a[1] + 2 * m * k * b[1] + k * k * c[1]];
}

export async function carnivorePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const grid: Pt[] = [at(0.12, 0.31), at(0.45, 0.335), at(0.38, 0.49), at(0.03, 0.455)];
  const head = at(0.53, 0.2);
  const glitch = new GlitchFilter({ slices: 8, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const halo = glowSprite(fx, glowTexture(), HOLO);
  halo.position.set(...head);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const sweep = ease.inOut(span(t, 0.05, 0.75));
    const fade = 1 - span(t, 1.2, 1.6);
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      const lit = Math.max(0, 1 - Math.abs(k - sweep) * 5);
      g.moveTo(...lerp(grid[0], grid[3], k)).lineTo(...lerp(grid[1], grid[2], k));
      g.stroke({ width: 1 + lit * 1.5, color: HOLO, alpha: (0.15 + 0.75 * lit) * fade });
      g.moveTo(...lerp(grid[0], grid[1], k)).lineTo(...lerp(grid[3], grid[2], k));
      g.stroke({ width: 1, color: HOLO, alpha: 0.15 * fade * span(t, 0, 0.3) });
    }
    const scan = span(t, 0.5, 1.3);
    if (scan > 0 && scan < 1) {
      const v = 0.06 + scan * 0.36;
      g.moveTo(...at(0.36, v)).lineTo(...at(0.7, v));
      g.stroke({ width: unit * 0.012, color: HOLO, alpha: 0.8 });
      g.moveTo(...at(0.36, v - 0.012)).lineTo(...at(0.7, v - 0.012));
      g.stroke({ width: 1, color: WHITE, alpha: 0.5 });
    }
    const on = Math.sin(Math.PI * span(t, 0.45, 1.5));
    card.filters = on > 0.05 && Math.random() < 0.25 * on ? [glitch] : [];
    glitch.offset = unit * 0.02;
    glitch.seed = Math.random();
    halo.alpha = 0.35 * on;
    halo.scale.set((unit / 128) * 0.55, (unit / 128) * 0.7);
    return t < 1.6;
  });
  card.filters = [];
  await done();
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

export async function cleaverPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const a = at(0.5, 0.16);
  const b = at(0.76, 0.43);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const bits = new Emitter(fx);
  const flare = glowSprite(fx, glowTexture(), 0xff6a5a);
  flare.position.set(...at(0.62, 0.3));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const k = ease.out(span(t, 0.15, 0.5));
    const fade = 1 - span(t, 0.9, 1.4);
    if (k > 0) {
      const tip = lerp(a, b, k);
      g.moveTo(...a)
        .lineTo(...tip)
        .stroke({ width: unit * 0.03, color: 0xff3b4a, alpha: 0.35 * fade });
      g.moveTo(...a)
        .lineTo(...tip)
        .stroke({ width: 1.6, color: 0xffe4ea, alpha: 0.95 * fade });
      if (k < 1) {
        const nx = -(b[1] - a[1]);
        const ny = b[0] - a[0];
        const l = Math.hypot(nx, ny);
        for (let n = 0; n < 3; n++) {
          const s = Math.random() < 0.5 ? 1 : -1;
          bits.add(streakTexture(), ...tip, { vx: ((s * nx) / l) * unit * rnd(0.8, 1.6), vy: ((s * ny) / l) * unit * rnd(0.8, 1.6), drag: 3, life: 0.45, tint: Math.random() < 0.3 ? 0xffd0d6 : 0xff4a5a, scale: (unit / 180) * rnd(0.3, 0.6) });
        }
      }
    }
    for (const p of bits.list) p.s.rotation = Math.atan2(p.vy, p.vx);
    const f = Math.sin(Math.PI * span(t, 0.4, 1.2));
    flare.alpha = 0.55 * f;
    flare.scale.set((unit / 128) * (0.4 + 0.3 * f));
    bits.step(dt);
    return t < 1.4 || bits.list.length > 0;
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

export async function leechPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eyes = [at(0.47, 0.215), at(0.57, 0.165)].map((p) => {
    const s = glowSprite(fx, glowTexture(), HOLO);
    s.position.set(...p);
    return s;
  });
  const path: [Pt, Pt, Pt][] = [
    [at(0.19, 0.36), at(0.28, 0.47), at(0.5, 0.43)],
    [at(0.5, 0.43), at(0.74, 0.4), at(0.66, 0.26)],
  ];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const drops = new Emitter(fx);
  root.addChild(fx);
  const point = (k: number) => (k < 0.5 ? bezier(...path[0], k * 2) : bezier(...path[1], (k - 0.5) * 2));
  await run(app, (t, dt) => {
    g.clear();
    const head = ease.inOut(span(t, 0.1, 1.1));
    const fade = 1 - span(t, 1.3, 1.7);
    if (head > 0) {
      const tail = Math.max(0, head - 0.25);
      g.moveTo(...point(tail));
      for (let i = 1; i <= 20; i++) g.lineTo(...point(tail + ((head - tail) * i) / 20));
      g.stroke({ width: unit * 0.035, color: NEON, alpha: 0.3 * fade, cap: "round" });
      g.moveTo(...point(tail));
      for (let i = 1; i <= 20; i++) g.lineTo(...point(tail + ((head - tail) * i) / 20));
      g.stroke({ width: 1.6, color: 0xffd0ec, alpha: 0.9 * fade, cap: "round" });
      if (head < 1 && Math.random() < 0.5) drops.add(dropTexture(), ...point(head), { vy: unit * 0.3, gravity: unit * 0.6, life: 0.6, tint: NEON, scale: (unit / 180) * 0.25 });
    }
    const blink = span(t, 0.2, 0.5) * fade;
    for (const e of eyes) {
      e.alpha = blink * (0.8 + 0.2 * Math.sin(t * 20));
      e.scale.set((unit / 128) * 0.07);
    }
    drops.step(dt);
    return t < 1.7 || drops.list.length > 0;
  });
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

export async function marjanahPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const motes = new Emitter(fx);
  const strands = Array.from({ length: 6 }, (_, i) => ({ from: at(0.3 + i * 0.03, 0.2 + i * 0.035), to: at(0.98, 0.08 + i * 0.05), ph: rnd(0, 6), delay: i * 0.06 }));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.2, 1.6);
    for (const s of strands) {
      const k = ease.out(span(t, 0.05 + s.delay, 0.8 + s.delay));
      if (k <= 0) continue;
      const tail = Math.max(0, k - 0.45);
      const P = (u: number): Pt => {
        const p = lerp(s.from, s.to, u);
        return [p[0], p[1] + Math.sin(u * 7 + s.ph + t * 5) * unit * 0.025];
      };
      g.moveTo(...P(tail));
      for (let i = 1; i <= 16; i++) g.lineTo(...P(tail + ((k - tail) * i) / 16));
      g.stroke({ width: unit * 0.03, color: NEON, alpha: 0.28 * fade, cap: "round" });
      g.moveTo(...P(tail));
      for (let i = 1; i <= 16; i++) g.lineTo(...P(tail + ((k - tail) * i) / 16));
      g.stroke({ width: 1.2, color: 0xffd6ec, alpha: 0.8 * fade, cap: "round" });
      if (k < 1 && Math.random() < 0.3) motes.add(sparkTexture(), ...P(k), { vx: unit * 0.4, vy: rnd(-1, 1) * unit * 0.1, life: 0.5, tint: NEON, scale: (unit / 180) * 0.25 });
    }
    motes.step(dt);
    return t < 1.6 || motes.list.length > 0;
  });
  await done();
}

export async function marjanah(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, world, fx, done, unit, at } = sc;
  const head = at(0.3, 0.3);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const motes = new Emitter(world);
  root.addChild(fx);
  const comets = Array.from({ length: 5 }, (_, i) => ({ bend: (i - 2) * 0.35 + rnd(-0.1, 0.1), delay: i * 0.05 }));
  let hit = false;
  await run(
    app,
    (t, dt) => {
      g.clear();
      const src = root.toGlobal({ x: head[0], y: head[1] });
      const a: Pt = [src.x, src.y];
      const to = sc.strike ?? ([a[0] + unit * 0.6, a[1] - unit * 0.4] as Pt);
      const fade = 1 - span(t, 0.7, 1);
      for (const c of comets) {
        const k = ease.inOut(span(t, c.delay, 0.4 + c.delay));
        if (k <= 0) continue;
        const ctrl: Pt = [(a[0] + to[0]) / 2 - (to[1] - a[1]) * c.bend, (a[1] + to[1]) / 2 + (to[0] - a[0]) * c.bend];
        const tail = Math.max(0, k - 0.35);
        g.moveTo(...bezier(a, ctrl, to, tail));
        for (let i = 1; i <= 14; i++) g.lineTo(...bezier(a, ctrl, to, tail + ((k - tail) * i) / 14));
        g.stroke({ width: unit * 0.035, color: NEON, alpha: 0.3 * fade, cap: "round" });
        g.moveTo(...bezier(a, ctrl, to, tail));
        for (let i = 1; i <= 14; i++) g.lineTo(...bezier(a, ctrl, to, tail + ((k - tail) * i) / 14));
        g.stroke({ width: 1.4, color: 0xffe0f0, alpha: 0.9 * fade, cap: "round" });
      }
      if (!hit && t > 0.42) {
        hit = true;
        burst(motes, to[0], to[1], 30, NEON, unit * 1.8, { life: 0.6, scale: 0.35 });
        navigator.vibrate?.(20);
      }
      const r = span(t, 0.42, 0.85);
      if (r > 0 && r < 1) g.ellipse(to[0], to[1], unit * 0.7 * ease.out(r), unit * 0.35 * ease.out(r)).stroke({ width: unit * 0.02 * (1 - r) + 1, color: NEON, alpha: 1 - r });
      motes.step(dt);
      return t < 1 || motes.list.length > 0;
    },
    sc.strike ? 1.1 : 1,
  );
  g.destroy();
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

export async function pantographPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const tips: Pt[] = [at(0.56, 0.33), at(0.74, 0.29), at(0.83, 0.37)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const dots = tips.map((p) => {
    const s = glowSprite(fx, sparkTexture(), HOLO);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    tips.forEach((p, i) => {
      for (let w = 0; w < 3; w++) {
        const k = span(t, 0.1 + i * 0.18 + w * 0.22, 0.8 + i * 0.18 + w * 0.22);
        if (k <= 0 || k >= 1) continue;
        g.ellipse(p[0], p[1], unit * 0.18 * ease.out(k), unit * 0.1 * ease.out(k)).stroke({ width: 1.4, color: HOLO, alpha: 0.85 * (1 - k) });
      }
      const f = Math.sin(Math.PI * span(t, 0.05 + i * 0.18, 0.6 + i * 0.18));
      dots[i].alpha = f;
      dots[i].scale.set((unit / 120) * 0.35 * f);
    });
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

export async function anselFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const from = at(0.4, 0.72);
  const target = runnerAt(board);
  const shards = Array.from({ length: 12 }, (_, i) => {
    const s = glowSprite(world, triTexture(), i % 3 ? 0x6ff0e6 : 0xd8fffa);
    return { s, d: i * 0.035, off: [rnd(-1, 1) * unit * 0.3, rnd(-1, 1) * unit * 0.3] as Pt, spin: rnd(-10, 10) };
  });
  const sparks = new Emitter(world);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    const src = root.toGlobal({ x: from[0], y: from[1] });
    for (const sh of shards) {
      const k = span(t, sh.d, sh.d + 0.5);
      const e = ease.inOut(k);
      const ctrl: Pt = [(src.x + target[0]) / 2 + sh.off[0], (src.y + target[1]) / 2 + sh.off[1]];
      sh.s.position.set(...bezier([src.x, src.y], ctrl, target, e));
      sh.s.rotation = t * sh.spin;
      sh.s.alpha = k > 0 && k < 1 ? 1 : 0;
      sh.s.scale.set((unit / 180) * 0.5);
    }
    if (!hit && t > 0.55) {
      hit = true;
      burst(sparks, target[0], target[1], 20, 0x6ff0e6, unit * 1.6, { life: 0.5, scale: 0.35 });
      jolt(board);
    }
    sparks.step(dt);
    return t < 0.95 || sparks.list.length > 0;
  });
  await done();
}

export async function diviner(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const rods: [Pt, Pt][] = [
    [at(0.19, 0.6), at(0.35, 0.92)],
    [at(0.27, 0.58), at(0.42, 0.93)],
    [at(0.37, 0.57), at(0.5, 0.93)],
    [at(0.47, 0.55), at(0.57, 0.93)],
    [at(0.59, 0.54), at(0.67, 0.93)],
  ];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    rods.forEach(([a, b], i) => {
      const k = ease.out(span(t, 0.1 + i * 0.15, 0.6 + i * 0.15));
      if (k <= 0) return;
      g.moveTo(...a)
        .lineTo(...lerp(a, b, k))
        .stroke({ width: unit * 0.04, color: 0x3dff7a, alpha: 0.25 * fade, cap: "round" });
      g.moveTo(...a)
        .lineTo(...lerp(a, b, k))
        .stroke({ width: 1.5, color: 0xd0ffd8, alpha: 0.85 * fade, cap: "round" });
      for (let j = 1; j < 5; j++) {
        const p = lerp(a, b, (j / 5) * k);
        g.circle(p[0], p[1], unit * 0.008).fill({ color: WHITE, alpha: 0.8 * fade * (0.5 + 0.5 * Math.sin(t * 10 + j + i)) });
      }
    });
    return t < 1.7;
  });
  await done();
}

export async function divinerFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.45, 0.75);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const target = runnerAt(board);
  const R = board?.runner;
  let hit = false;
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const src = root.toGlobal({ x: eye[0], y: eye[1] });
    const on = span(t, 0, 0.15) * (1 - span(t, 1, 1.3));
    const w = R ? R.width / 2 : unit * 0.6;
    const h = R ? R.height / 2 : unit * 0.2;
    const sweep = Math.sin(t * 5) * 0.9;
    const tip: Pt = [target[0] + sweep * w, target[1]];
    g.poly([src.x, src.y, tip[0] - w * 0.12, target[1] - h, tip[0] + w * 0.12, target[1] + h]).fill({ color: 0x3dff7a, alpha: 0.14 * on });
    g.moveTo(tip[0], target[1] - h)
      .lineTo(tip[0], target[1] + h)
      .stroke({ width: 2, color: 0xd0ffd8, alpha: 0.9 * on });
    g.rect(target[0] - w, target[1] - h, w * 2, h * 2).stroke({ width: 1, color: 0x3dff7a, alpha: 0.5 * on });
    if (!hit && t > 0.9) {
      hit = true;
      jolt(board, 0.35);
    }
    return t < 1.3;
  });
  g.destroy();
  await done();
}

export async function karuna(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const palms: Pt[] = [at(0.26, 0.67), at(0.62, 0.64), at(0.36, 0.83), at(0.7, 0.83)];
  const glows = palms.map((p) => {
    const s = glowSprite(fx, glowTexture(), EMBER);
    s.position.set(...p);
    return s;
  });
  const embers = new Emitter(fx);
  const glow = new GlowFilter({ color: EMBER, distance: 10, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  root.addChild(fx);
  await run(app, (t, dt) => {
    palms.forEach((p, i) => {
      const f = Math.sin(Math.PI * span(t, 0.1 + i * 0.12, 1.2 + i * 0.12));
      glows[i].alpha = 0.5 * f;
      glows[i].scale.set((unit / 128) * 0.28);
      if (f > 0.3 && Math.random() < 0.25) embers.add(sparkTexture(), p[0] + rnd(-1, 1) * unit * 0.05, p[1], { vy: -unit * rnd(0.2, 0.45), vx: rnd(-1, 1) * unit * 0.05, life: 0.9, tint: Math.random() < 0.3 ? 0xffe0b0 : EMBER, scale: (unit / 180) * 0.2 });
    });
    glow.outerStrength = 1.2 * Math.sin(Math.PI * span(t, 0.2, 1.6));
    embers.step(dt);
    return t < 1.7 || embers.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function karunaFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const from = at(0.5, 0.75);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const target = runnerAt(board);
  const hits = [false, false];
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const src = root.toGlobal({ x: from[0], y: from[1] });
    const dir = Math.atan2(target[1] - src.y, target[0] - src.x);
    const dist = Math.hypot(target[0] - src.x, target[1] - src.y);
    for (let w = 0; w < 2; w++) {
      const k = span(t, w * 0.35, w * 0.35 + 0.55);
      if (k <= 0 || k >= 1) continue;
      const c: Pt = [src.x + Math.cos(dir) * dist * ease.inOut(k), src.y + Math.sin(dir) * dist * ease.inOut(k)];
      for (let r = 0; r < 3; r++) {
        const rad = unit * (0.12 + r * 0.06);
        g.moveTo(c[0] + Math.cos(dir - 0.8) * rad, c[1] + Math.sin(dir - 0.8) * rad)
          .arc(c[0], c[1], rad, dir - 0.8, dir + 0.8)
          .stroke({ width: unit * 0.02 * (1 - r * 0.25), color: r ? EMBER : 0xffe0b0, alpha: 0.85 - r * 0.25 });
      }
    }
    for (let w = 0; w < 2; w++)
      if (!hits[w] && t > w * 0.35 + 0.55) {
        hits[w] = true;
        jolt(board, 0.3);
      }
    return t < 1.3;
  });
  g.destroy();
  await done();
}

export async function anoeticVoid(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const orbs: Pt[] = [at(0.45, 0.16), at(0.75, 0.14)];
  const figure = at(0.43, 0.47);
  const dark = new ColorMatrixFilter();
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.025, wavelength: unit * 0.3, speed: unit * 1.5, brightness: 1.04, radius: unit * 0.6, time: 0 });
  card.filters = [dark, wave];
  const halos = orbs.map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xff5a3a);
    s.position.set(...p);
    return s;
  });
  const embers = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const d = Math.sin(Math.PI * span(t, 0, 1.8));
    dark.brightness(1 - 0.35 * d, false);
    const fp = filterPoint(card, figure[0], figure[1]);
    wave.center = { x: fp.x, y: fp.y };
    wave.time = Math.max(0, t - 0.3);
    wave.amplitude = unit * 0.025 * (1 - span(t, 0.3, 1.5));
    halos.forEach((h, i) => {
      h.alpha = 0.6 * Math.sin(Math.PI * span(t, 0.1 + i * 0.2, 1.4 + i * 0.2));
      h.scale.set((unit / 128) * 0.3);
    });
    if (t < 1.4 && Math.random() < 0.4) embers.add(sparkTexture(), ...at(rnd(0.05, 0.95), rnd(0.3, 0.5)), { vy: -unit * rnd(0.15, 0.35), life: 1, tint: 0xff6a3a, scale: (unit / 180) * 0.2 });
    embers.step(dt);
    return t < 1.8 || embers.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function amazeAmusements(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const base = at(0.5, 0.44);
  const top = at(0.48, 0.12);
  const lights = Array.from({ length: 16 }, (_, i) => ({ s: glowSprite(fx, sparkTexture(), i % 4 ? GOLD : 0x9be8ff), d: i * 0.05 }));
  const sparks = new Emitter(fx);
  let popped = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    for (const l of lights) {
      const k = span(t, l.d, l.d + 0.9);
      const e = ease.inOut(k);
      const y = base[1] + (top[1] - base[1]) * e;
      const r = rect.width * 0.36 * (1 - e) + rect.width * 0.03;
      const a = e * Math.PI * 7;
      l.s.position.set(base[0] + (top[0] - base[0]) * e + Math.cos(a) * r, y + Math.sin(a) * r * 0.18);
      l.s.alpha = k > 0 && k < 1 ? (Math.sin(a) > -0.2 ? 1 : 0.3) : 0;
      l.s.scale.set((unit / 120) * 0.3);
    }
    if (!popped && t > 1.1) {
      popped = true;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const v = unit * rnd(0.45, 0.7);
        sparks.add(glowTexture(), ...top, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: unit * 0.8, drag: 1.5, life: 0.8, tint: [0xe8b23a, 0xe0609a, 0x6ac8e8][i % 3], scale: (unit / 128) * 0.035, alpha: 0.8 });
      }
    }
    sparks.step(dt);
    return t < 1.2 || sparks.list.length > 0;
  });
  await done();
}

export async function clearinghouse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.165, 0.33);
  const lamp = glowSprite(fx, glowTexture(), 0xff7a2a);
  lamp.position.set(...eye);
  const flare = [0, Math.PI].map((r) => {
    const s = glowSprite(fx, streakTexture(), 0xffa060);
    s.anchor.set(1, 0.5);
    s.rotation = r;
    s.position.set(...eye);
    return s;
  });
  const smoke = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const flick = t < 0.5 ? (Math.floor(t * 18) % 3 === 0 ? 1 : 0.15) : 1;
    const on = span(t, 0.1, 0.2) * (1 - span(t, 1.4, 1.8)) * flick;
    lamp.alpha = 0.85 * on;
    lamp.scale.set((unit / 128) * 0.2);
    for (const f of flare) {
      f.alpha = 0.7 * on;
      f.scale.set((unit / 48) * 0.35 * (0.6 + 0.4 * span(t, 0.5, 0.9)), 0.6);
    }
    if (t > 0.4 && t < 1.3 && Math.random() < 0.35) smoke.puff(...at(rnd(0.05, 0.32), 0.47), { vx: rnd(-1, 1) * unit * 0.05, vy: -unit * 0.12, size: unit * 0.16, life: 1.2, tint: 0x5a6066, alpha: 0.45 });
    smoke.step(dt);
    return t < 1.8 || smoke.list.length > 0;
  });
  await done();
}

export async function clearinghouseFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.165, 0.33);
  const lamp = glowSprite(fx, glowTexture(), 0xff7a2a);
  lamp.position.set(...eye);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const smoke = new Smoke(world);
  const sparks = new Emitter(world);
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    lamp.alpha = 0.9 * (1 - span(t, 0.8, 1.1));
    lamp.scale.set((unit / 128) * (0.12 + 0.1 * Math.sin(Math.PI * span(t, 0, 0.3))));
    const src = root.toGlobal({ x: eye[0], y: eye[1] });
    const k = span(t, 0.25, 0.6);
    if (k > 0 && k < 1) {
      const peak: Pt = [(src.x + target[0]) / 2, Math.min(src.y, target[1]) - unit * 0.5];
      const p = bezier([src.x, src.y], peak, target, ease.inOut(k));
      g.circle(p[0], p[1], unit * 0.035).fill({ color: 0xff7a2a, alpha: 0.5 });
      g.circle(p[0], p[1], unit * 0.018).fill({ color: 0xffe0c0 });
      sparks.add(sparkTexture(), p[0], p[1], { life: 0.3, tint: 0xff9a4a, scale: (unit / 180) * 0.35, grow: -1 });
      smoke.puff(p[0], p[1], { size: unit * 0.1, life: 0.8, tint: 0x6a7076, alpha: 0.5 });
    }
    if (!hit && t > 0.6) {
      hit = true;
      burst(sparks, target[0], target[1], 24, 0xff7a2a, unit * 1.8, { life: 0.5, scale: 0.4, gravity: unit * 2 });
      jolt(board);
    }
    smoke.step(dt);
    sparks.step(dt);
    return t < 1.1 || sparks.list.length > 0 || smoke.list.length > 0;
  });
  g.destroy();
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

export async function regolith(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const dome = at(0.5, 0.11);
  const table = at(0.5, 0.36);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const dust = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    for (let i = 0; i < 4; i++) {
      const f = span(t, 0.1 + i * 0.15, 0.3 + i * 0.15) * fade;
      if (f <= 0) continue;
      g.ellipse(dome[0], dome[1], rect.width * (0.12 + i * 0.07), rect.width * (0.025 + i * 0.012)).stroke({ width: 1.5, color: 0x8fe8ff, alpha: 0.75 * f * (0.7 + 0.3 * Math.sin(t * 8 + i)) });
    }
    if (t > 0.5 && t < 1.4 && Math.random() < 0.5) dust.add(sparkTexture(), table[0] + rnd(-1, 1) * rect.width * 0.18, table[1], { vy: -unit * rnd(0.1, 0.3), vx: rnd(-1, 1) * unit * 0.04, life: 0.9, tint: GOLD, scale: (unit / 180) * 0.2 });
    dust.step(dt);
    return t < 1.7 || dust.list.length > 0;
  });
  await done();
}

export async function regolithUse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const table = at(0.5, 0.36);
  const nuggets = Array.from({ length: 3 }, (_, i) => ({ s: glowSprite(fx, nuggetTexture(), GOLD), x: table[0] + (i - 1) * rect.width * 0.12, d: i * 0.12 }));
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const popped = [false, false, false];
  await run(app, (t, dt) => {
    nuggets.forEach((n, i) => {
      const k = span(t, n.d, n.d + 0.6);
      const e = ease.out(k);
      n.s.position.set(n.x, table[1] - unit * 0.35 * e);
      n.s.alpha = k > 0 && k < 1 ? 1 : 0;
      n.s.rotation = t * 2 + i;
      n.s.scale.set((unit / 180) * 0.6);
      if (k >= 1 && !popped[i]) {
        popped[i] = true;
        burst(sparks, n.x, table[1] - unit * 0.35, 10, GOLD, unit * 0.7, { life: 0.4, scale: 0.3 });
      }
    });
    sparks.step(dt);
    return t < 1 || sparks.list.length > 0;
  });
  await done();
}

export async function palisade(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const stakes = Array.from({ length: 9 }, (_, i) => ({ u: 0.16 + i * 0.09 + rnd(-0.015, 0.015), top: rnd(0.55, 0.66), d: Math.abs(i - 4) * 0.06 }));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    for (const s of stakes) {
      const k = ease.back(span(t, 0.1 + s.d, 0.5 + s.d));
      if (k <= 0) continue;
      const v = 0.97 - (0.97 - s.top) * k;
      g.moveTo(...at(s.u, 0.97))
        .lineTo(...at(s.u, v))
        .stroke({ width: unit * 0.025, color: 0x3fc8a8, alpha: 0.3 * fade });
      g.moveTo(...at(s.u, 0.97))
        .lineTo(...at(s.u, v))
        .stroke({ width: 2, color: 0xd8fff4, alpha: 0.9 * fade });
      g.circle(...at(s.u, v), unit * 0.008).fill({ color: WHITE, alpha: fade });
    }
    return t < 1.7;
  });
  await done();
}

export async function palisadeFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const dust = new Emitter(fx);
  const stakes = Array.from({ length: 8 }, (_, i) => ({ u: 0.08 + i * 0.12, d: (i % 3) * 0.05 }));
  root.addChild(fx);
  let slam = false;
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 0.9, 1.3);
    for (const st of stakes) {
      const k = span(t, st.d, st.d + 0.25) ** 2;
      if (k <= 0) continue;
      const v1 = 0.96 * k;
      const h = Math.max(0, v1 - 0.35);
      g.moveTo(...at(st.u, h))
        .lineTo(...at(st.u, v1))
        .stroke({ width: unit * 0.02, color: 0x5fd8bc, alpha: 0.18 * fade });
      g.moveTo(...at(st.u, h))
        .lineTo(...at(st.u, v1))
        .stroke({ width: 1.5, color: 0xd8fff4, alpha: 0.7 * fade });
      if (k >= 1)
        g.moveTo(...at(st.u, 0.04))
          .lineTo(...at(st.u, 0.96))
          .stroke({ width: 1, color: 0x9dffe8, alpha: 0.35 * fade });
    }
    if (!slam && t > 0.38) {
      slam = true;
      for (let i = 0; i < 18; i++) dust.add(sparkTexture(), ...at(rnd(0.05, 0.95), 0.95), { vx: rnd(-1, 1) * unit * 0.5, vy: -unit * rnd(0.2, 0.6), gravity: unit * 2, life: 0.45, tint: 0x9dfff0, scale: (unit / 180) * 0.22 });
      navigator.vibrate?.(30);
    }
    dust.step(dt);
    return t < 1.3 || dust.list.length > 0;
  });
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
