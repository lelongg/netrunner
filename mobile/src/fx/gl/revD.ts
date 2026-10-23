import { Graphics } from "pixi.js";
import { Emitter, ease, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";
import { bezier, jolt, runnerAt, streakTexture } from "./sixth";

const dashTexture = () =>
  painted("rd-dash", 14, 4, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 14, 4);
  });

function strand(g: Graphics, pts: Pt[], width: number, color: number, alpha: number, core = 0xffffff) {
  if (pts.length < 2) return;
  g.moveTo(...pts[0]);
  for (const p of pts.slice(1)) g.lineTo(...p);
  g.stroke({ width, color, alpha: alpha * 0.3, cap: "round", join: "round" });
  g.moveTo(...pts[0]);
  for (const p of pts.slice(1)) g.lineTo(...p);
  g.stroke({ width: Math.max(1, width * 0.25), color: core, alpha: alpha * 0.85, cap: "round", join: "round" });
}

export async function empiricistFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const goggles = [at(0.31, 0.72), at(0.33, 0.78)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xbff0ff);
    s.position.set(...p);
    return s;
  });
  const eye = at(0.32, 0.75);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const target = runnerAt(board);
  const R = board?.runner;
  let hit = false;
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const on = span(t, 0, 0.15) * (1 - span(t, 0.5, 0.8));
    for (const s of goggles) {
      s.alpha = 0.6 * on;
      s.scale.set((unit / 128) * 0.07);
    }
    const src = root.toGlobal({ x: eye[0], y: eye[1] });
    const k = ease.inOut(span(t, 0.2, 0.55));
    const c = lerp([src.x, src.y], target, k);
    const open = ease.out(span(t, 0.55, 0.85));
    const r = unit * (0.1 + (R ? Math.min(R.width, R.height * 2) / unit - 0.1 : 0.4) * 0.5 * open);
    const fade = 1 - span(t, 1.3, 1.6);
    if (t > 0.2) {
      g.circle(c[0], c[1], r).stroke({ width: 2, color: 0x9be8ff, alpha: 0.85 * fade });
      g.circle(c[0], c[1], r * 0.86).stroke({ width: 1, color: 0x9be8ff, alpha: 0.35 * fade });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + t * 0.6;
        g.moveTo(c[0] + Math.cos(a) * r * 0.86, c[1] + Math.sin(a) * r * 0.86).lineTo(c[0] + Math.cos(a) * r * 1.12, c[1] + Math.sin(a) * r * 1.12);
      }
      g.stroke({ width: 1.5, color: 0x9be8ff, alpha: 0.8 * fade });
    }
    if (k < 1 && k > 0)
      g.moveTo(src.x, src.y)
        .lineTo(...c)
        .stroke({ width: 1, color: 0x9be8ff, alpha: 0.25 });
    if (open > 0) {
      for (const ph of [0, Math.PI]) {
        const pts: Pt[] = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24;
          const x = c[0] - r * 0.75 + u * r * 1.5;
          const y = c[1] + Math.sin(u * 9 + ph + t * 5) * r * 0.25 * Math.sin(Math.PI * u);
          pts.push([x, y]);
        }
        strand(g, pts, unit * 0.03, ph ? 0x8affc8 : 0x9be8ff, open * fade);
      }
      for (let i = 1; i < 8; i++) {
        const u = i / 8;
        const x = c[0] - r * 0.75 + u * r * 1.5;
        const y1 = c[1] + Math.sin(u * 9 + t * 5) * r * 0.25 * Math.sin(Math.PI * u);
        const y2 = c[1] + Math.sin(u * 9 + Math.PI + t * 5) * r * 0.25 * Math.sin(Math.PI * u);
        g.moveTo(x, y1).lineTo(x, y2);
      }
      g.stroke({ width: 1, color: 0xd8f6ff, alpha: 0.4 * open * fade });
    }
    if (!hit && t > 0.6) {
      hit = true;
      jolt(board, 0.3);
    }
    return t < 1.6;
  });
  g.destroy();
  await done();
}

const LETHE_GLASS: [number, number] = [0.5, 0.6];
const LETHE_RINGS: [number, number] = [0.5, 0.8];

export async function lethe(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glass = glowSprite(fx, glowTexture(), 0x7fd8ff);
  glass.position.set(...at(...LETHE_GLASS));
  const motes = new Emitter(fx);
  const from = at(0.66, 0.62);
  const to = at(0.93, 0.62);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const c = at(...LETHE_RINGS);
    for (let i = 0; i < 3; i++) {
      const r = unit * (0.2 + i * 0.07);
      const k = ease.out(span(t, 0.1 + i * 0.15, 0.8 + i * 0.15));
      if (k <= 0) continue;
      const a0 = -Math.PI * 0.95 + t * (i % 2 ? 0.25 : -0.2);
      g.moveTo(c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r)
        .arc(c[0], c[1], r, a0, a0 + Math.PI * 1.3 * k)
        .stroke({ width: 1.5, color: 0xf2c25a, alpha: 0.6 * fade });
    }
    const flow = span(t, 0.3, 0.6) * fade;
    g.moveTo(...from)
      .lineTo(...to)
      .stroke({ width: unit * 0.03, color: 0x6ad0ff, alpha: 0.25 * flow });
    g.moveTo(...from)
      .lineTo(...to)
      .stroke({ width: 1.5, color: 0xd8f6ff, alpha: 0.7 * flow });
    if (flow > 0.2 && Math.random() < 0.6) motes.add(sparkTexture(), ...from, { vx: (to[0] - from[0]) * 1.4, vy: (to[1] - from[1]) * 1.4 + rnd(-1, 1) * unit * 0.03, life: 0.6, tint: 0xbff0ff, scale: (unit / 180) * 0.25 });
    const f = Math.sin(Math.PI * span(t, 0.2, 1.8));
    glass.alpha = 0.35 * f;
    glass.scale.set((unit / 128) * 0.3);
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

export async function letheFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const drops = new Emitter(world);
  const target = runnerAt(board);
  const origin = at(...LETHE_GLASS);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const src = root.toGlobal({ x: origin[0], y: origin[1] });
    const a: Pt = [src.x, src.y];
    const ctrl: Pt = [(a[0] + target[0]) / 2 + unit * 0.5, Math.min(a[1], target[1]) - unit * 0.4];
    const head = ease.inOut(span(t, 0.05, 0.5));
    const tail = ease.inOut(span(t, 0.35, 0.8));
    if (head > tail) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 20; i++) {
        const s = tail + ((head - tail) * i) / 20;
        const p = bezier(a, ctrl, target, s);
        pts.push([p[0], p[1] + Math.sin(s * 18 - t * 14) * unit * 0.012]);
      }
      strand(g, pts, unit * 0.06, 0x6ad0ff, 0.9, 0xe0f8ff);
      if (Math.random() < 0.8) drops.add(glowTexture(), ...bezier(a, ctrl, target, head), { vx: rnd(-1, 1) * unit * 0.2, vy: unit * rnd(0.1, 0.4), gravity: unit, life: 0.5, tint: 0xbff0ff, scale: (unit / 128) * 0.025 });
    }
    const r = span(t, 0.5, 1.1);
    if (r > 0 && r < 1)
      for (let i = 0; i < 3; i++) {
        const k = Math.max(0, r - i * 0.12);
        if (k <= 0) continue;
        g.ellipse(target[0], target[1], unit * (0.1 + 0.5 * ease.out(k)), unit * (0.04 + 0.18 * ease.out(k))).stroke({ width: 1.5, color: i ? 0xf2c25a : 0x9be8ff, alpha: 0.8 * (1 - k) });
      }
    if (!hit && t > 0.5) {
      hit = true;
      jolt(board, 0.4);
    }
    drops.step(dt);
    return t < 1.1 || drops.list.length > 0;
  });
  g.destroy();
  await done();
}

const MANE: [number, number] = [0.29, 0.665];

export async function lionsmane(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(...MANE);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const core = glowSprite(fx, glowTexture(), 0xff9a4a);
  core.position.set(...c);
  const embers = new Emitter(fx);
  const tendrils = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2 + rnd(-0.2, 0.2), len: rnd(0.16, 0.24), curl: rnd(1.8, 2.6), color: i % 3 === 0 ? 0xff5a9a : 0xff8a3a, d: rnd(0, 0.3) }));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    for (const td of tendrils) {
      const grow = ease.out(span(t, td.d, td.d + 0.8));
      if (grow <= 0) continue;
      const pts: Pt[] = [];
      for (let i = 0; i <= 18; i++) {
        const s = (i / 18) * grow;
        const a = td.a + s * td.curl + t * 0.7 + Math.sin(t * 3 + td.a) * 0.15 * s;
        const r = unit * (0.02 + td.len * s);
        pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
      }
      strand(g, pts, unit * 0.035, td.color, 0.75 * fade, 0xffd8b0);
      if (grow > 0.3 && Math.random() < 0.05) embers.add(sparkTexture(), ...pts[pts.length - 1], { vx: rnd(-1, 1) * unit * 0.1, vy: -unit * rnd(0.05, 0.2), life: 0.6, tint: 0xffb070, scale: (unit / 180) * 0.2 });
    }
    core.alpha = 0.35 * Math.sin(Math.PI * span(t, 0, 1.8));
    core.scale.set((unit / 128) * 0.25);
    embers.step(dt);
    return t < 1.8 || embers.list.length > 0;
  });
  await done();
}

export async function lionsmaneFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(...MANE);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const embers = new Emitter(world);
  const target = runnerAt(board);
  const lashes = Array.from({ length: 5 }, (_, i) => ({ bend: (i - 2) * 0.45 + rnd(-0.1, 0.1), d: i * 0.04, color: i % 2 ? 0xff5a9a : 0xff8a3a }));
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const src = root.toGlobal({ x: c[0], y: c[1] });
    const a: Pt = [src.x, src.y];
    for (const l of lashes) {
      const head = ease.out(span(t, l.d, l.d + 0.35));
      const tail = ease.inOut(span(t, l.d + 0.4, l.d + 0.8));
      if (head <= tail) continue;
      const ctrl: Pt = [(a[0] + target[0]) / 2 - (target[1] - a[1]) * l.bend, (a[1] + target[1]) / 2 + (target[0] - a[0]) * l.bend];
      const pts: Pt[] = [];
      for (let i = 0; i <= 20; i++) pts.push(bezier(a, ctrl, target, tail + ((head - tail) * i) / 20));
      strand(g, pts, unit * 0.04, l.color, 0.85, 0xffd8b0);
    }
    if (!hit && t > 0.38) {
      hit = true;
      for (let i = 0; i < 26; i++) {
        const ang = rnd(0, Math.PI * 2);
        embers.add(sparkTexture(), ...target, { vx: Math.cos(ang) * unit * rnd(0.5, 1.4), vy: Math.sin(ang) * unit * rnd(0.5, 1.4) - unit * 0.3, gravity: unit, drag: 1.5, life: rnd(0.4, 0.8), tint: i % 3 ? 0xff8a3a : 0xff5a9a, scale: (unit / 180) * rnd(0.2, 0.35) });
      }
      jolt(board, 0.4);
    }
    embers.step(dt);
    return t < 0.9 || embers.list.length > 0;
  });
  g.destroy();
  await done();
}

const SUNS: [number, number, number][] = [
  [0.26, 0.565, 0.55],
  [0.23, 0.655, 1],
  [0.18, 0.745, 1],
  [0.23, 0.83, 0.85],
];

export async function scatterField(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glows = SUNS.map(([u, v]) => {
    const s = glowSprite(fx, glowTexture(), 0xfff0d8);
    s.position.set(...at(u, v));
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    SUNS.forEach(([u, v, s], i) => {
      const d = 0.1 + i * 0.18;
      const flare = Math.sin(Math.PI * span(t, d, d + 0.5));
      const keep = span(t, d, d + 0.2) * fade;
      glows[i].alpha = (0.25 + 0.3 * flare) * keep;
      glows[i].scale.set((unit / 128) * 0.1 * s * (1 + 0.4 * flare));
      const rim = ease.out(span(t, d + 0.1, d + 0.7));
      if (rim > 0) {
        const p0 = at(u + 0.04, v);
        const p1 = at(u + 0.04 + 0.6 * rim, v);
        g.moveTo(...p0)
          .lineTo(...p1)
          .stroke({ width: unit * 0.02 * s, color: 0xffd8b8, alpha: 0.15 * keep });
        g.moveTo(...p0)
          .lineTo(...p1)
          .stroke({ width: 1, color: 0xfff4e4, alpha: 0.55 * keep });
      }
      if (flare > 0) {
        const c = at(u, v);
        g.circle(c[0], c[1], unit * 0.06 * s * (1 + flare)).stroke({ width: 1, color: 0xffe0c0, alpha: 0.45 * flare });
      }
    });
    return t < 1.9;
  });
  await done();
}

export async function scatterFieldFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const shards = new Emitter(world);
  const glows = SUNS.map(([u, v]) => {
    const s = glowSprite(fx, glowTexture(), 0xfff0d8);
    s.position.set(...at(u, v));
    return s;
  });
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    SUNS.forEach(([u, v, s], i) => {
      const pulse = Math.sin(Math.PI * span(t, i * 0.05, 0.35 + i * 0.05));
      glows[i].alpha = 0.5 * pulse;
      glows[i].scale.set((unit / 128) * 0.12 * s);
      if (t > i * 0.05 && t < 0.35 + i * 0.05) {
        const c = at(u, v);
        const src = root.toGlobal({ x: c[0], y: c[1] });
        const base = Math.atan2(target[1] - src.y, target[0] - src.x);
        for (let n = 0; n < 3; n++) {
          const a = base + rnd(-0.6, 0.6);
          const sp = unit * rnd(2, 3.2);
          shards.add(streakTexture(), src.x, src.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.3, 0.5), tint: [0xffc8a0, 0xc8b0ff, 0xff9ab8][n % 3], scale: (unit / 180) * rnd(0.5, 0.9), alpha: 0.7 });
        }
      }
    });
    for (const p of shards.list) p.s.rotation = Math.atan2(p.vy, p.vx);
    if (!hit && t > 0.35) {
      hit = true;
      jolt(board, 0.3);
    }
    shards.step(dt);
    return t < 0.6 || shards.list.length > 0;
  });
  await done();
}

export async function merciaBallard(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const screen: [Pt, Pt, Pt, Pt] = [at(0.08, 0.27), at(0.5, 0.24), at(0.55, 0.47), at(0.1, 0.49)];
  const bil = (s: number, r: number): Pt => lerp(lerp(screen[0], screen[1], s), lerp(screen[3], screen[2], s), r);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const orchids = [at(0.1, 0.17), at(0.25, 0.12), at(0.83, 0.19), at(0.91, 0.14), at(0.97, 0.25)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xd890ff);
    s.position.set(...p);
    return s;
  });
  const circuit = [at(0.61, 0.23), at(0.615, 0.25), at(0.625, 0.27)];
  const pollen = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const on = span(t, 0.05, 0.3) * fade;
    g.poly(screen.flat()).stroke({ width: 1.4, color: 0x9bd8ff, alpha: 0.7 * on });
    const sweep = ease.inOut(span(t, 0.2, 1.1));
    for (let i = 1; i < 8; i++) {
      const r = i / 8;
      if (r > sweep) break;
      g.moveTo(...bil(0, r))
        .lineTo(...bil(1, r))
        .stroke({ width: 1, color: 0x9bd8ff, alpha: 0.2 * fade });
    }
    if (sweep > 0 && sweep < 1)
      g.moveTo(...bil(0, sweep))
        .lineTo(...bil(1, sweep))
        .stroke({ width: 2, color: 0xe0f4ff, alpha: 0.85 });
    orchids.forEach((o, i) => {
      o.alpha = 0.28 * Math.sin(Math.PI * span(t, 0.3 + i * 0.1, 1.5 + i * 0.1));
      o.scale.set((unit / 128) * 0.12);
      if (t < 1.4 && Math.random() < 0.06) pollen.add(sparkTexture(), o.x + rnd(-1, 1) * unit * 0.03, o.y, { vy: -unit * rnd(0.05, 0.15), vx: rnd(-1, 1) * unit * 0.05, life: 0.9, tint: 0xf0c8ff, scale: (unit / 180) * 0.18 });
    });
    const k = span(t, 0.6, 1.1);
    if (k > 0) {
      g.moveTo(...circuit[0]);
      const n = Math.min(2, Math.floor(k * 3));
      for (let i = 1; i <= n; i++) g.lineTo(...circuit[i]);
      g.stroke({ width: 1.2, color: 0x9bd8ff, alpha: 0.8 * fade });
      for (const p of circuit.slice(0, n + 1)) g.circle(p[0], p[1], unit * 0.006).fill({ color: 0xe0f4ff, alpha: 0.9 * fade });
    }
    pollen.step(dt);
    return t < 1.9 || pollen.list.length > 0;
  });
  await done();
}

export async function mitraAman(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const panel: [Pt, Pt, Pt, Pt] = [at(0.55, 0.31), at(0.7, 0.26), at(0.86, 0.41), at(0.76, 0.49)];
  const bil = (s: number, r: number): Pt => lerp(lerp(panel[0], panel[1], s), lerp(panel[3], panel[2], s), r);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const drops = [at(0.33, 0.16), at(0.39, 0.2), at(0.42, 0.23), at(0.35, 0.24), at(0.44, 0.18)].map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xffe0e8);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const trace = ease.out(span(t, 0.05, 0.6));
    const loop = [...panel, panel[0]];
    g.moveTo(...loop[0]);
    for (let i = 0; i < 4; i++) {
      const f = Math.min(1, Math.max(0, trace * 4 - i));
      if (f <= 0) break;
      g.lineTo(...lerp(loop[i], loop[i + 1], f));
    }
    g.stroke({ width: 1.5, color: 0x9be8ff, alpha: 0.75 * fade });
    const pulse = span(t, 0.5, 1.7);
    if (pulse > 0) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const s = i / 40;
        const ph = (s * 2 - pulse * 3) % 1;
        const q = ph < 0 ? ph + 1 : ph;
        const beat = q > 0.45 && q < 0.5 ? -1 : q >= 0.5 && q < 0.55 ? 0.6 : 0;
        pts.push(bil(0.1 + 0.8 * s, 0.62 + beat * 0.12));
      }
      g.moveTo(...pts[0]);
      for (const p of pts.slice(1)) g.lineTo(...p);
      g.stroke({ width: 1.4, color: 0xb0ffd8, alpha: 0.85 * fade });
    }
    const glare = span(t, 0.3, 1.2);
    if (glare > 0 && glare < 1) {
      const a = lerp(at(0.15, 0.12), at(0.8, 0.08), glare);
      g.circle(a[0], a[1], unit * 0.03).fill({ color: 0xffe0f0, alpha: 0.35 * Math.sin(Math.PI * glare) });
    }
    drops.forEach((d, i) => {
      const f = Math.sin(Math.PI * span(t, 0.4 + i * 0.12, 0.8 + i * 0.12));
      d.alpha = 0.8 * f;
      d.scale.set((unit / 120) * 0.18 * f);
    });
    return t < 1.9;
  });
  await done();
}

const AURORA_COLORS = [0x5affc8, 0x5ad8ff, 0xb68bff];

export async function magistrateRevontulet(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const crown = [at(0.425, 0.17), at(0.445, 0.16), at(0.465, 0.17)].map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xffd860);
    s.position.set(...p);
    return s;
  });
  const heart = glowSprite(fx, glowTexture(), 0xff3a5a);
  heart.position.set(...at(0.27, 0.385));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const on = Math.sin(Math.PI * span(t, 0, 2));
    AURORA_COLORS.forEach((c, n) => {
      for (let i = 0; i <= 40; i++) {
        const u = 0.2 + (0.55 * i) / 40;
        const top = 0.09 + 0.035 * Math.sin(u * 9 + t * 1.6 + n * 1.7);
        const len = 0.12 + 0.05 * Math.sin(u * 6 - t * 2.2 + n * 2.3);
        const shimmer = 0.6 + 0.4 * Math.sin(u * 40 + t * 7 + n);
        const p0 = at(u + n * 0.006, top);
        const p1 = at(u + n * 0.006, top + len);
        g.moveTo(...p0)
          .lineTo(...p1)
          .stroke({ width: unit * 0.012, color: c, alpha: 0.24 * on * shimmer });
      }
    });
    crown.forEach((s, i) => {
      const f = Math.sin(Math.PI * span(t, 0.7 + i * 0.15, 1.1 + i * 0.15));
      s.alpha = f;
      s.rotation = t * 2;
      s.scale.set((unit / 120) * 0.28 * f);
    });
    const beat = Math.max(0, Math.sin(t * 9)) ** 4;
    heart.alpha = 0.45 * beat * on;
    heart.scale.set((unit / 128) * 0.09);
    return t < 2;
  });
  await done();
}

export async function malapertDataVault(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const windows: { u: number; v: number; w: number; h: number; color: number; d: number }[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) windows.push({ u: 0.17 + i * 0.065, v: 0.25 + j * 0.045, w: 0.045, h: 0.032, color: 0xffb8e0, d: rnd(0.1, 0.9) });
  for (let j = 0; j < 6; j++) for (let i = 0; i < 2; i++) windows.push({ u: 0.575 + i * 0.05, v: 0.13 + j * 0.045, w: 0.035, h: 0.03, color: 0x6af0d8, d: rnd(0.1, 0.9) });
  for (let i = 0; i < 3; i++) windows.push({ u: 0.76 + i * 0.05, v: 0.33, w: 0.035, h: 0.04, color: 0x6af0d8, d: rnd(0.3, 1) });
  const tip = glowSprite(fx, sparkTexture(), 0xffffff);
  tip.position.set(...at(0.5, 0.24));
  const bits = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (const w of windows) {
      const k = span(t, w.d, w.d + 0.15) * fade;
      if (k <= 0) continue;
      const a = at(w.u, w.v);
      const b = at(w.u + w.w, w.v + w.h);
      const x = Math.min(a[0], b[0]);
      const y = Math.min(a[1], b[1]);
      g.rect(x, y, Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
        .fill({ color: w.color, alpha: 0.18 * k })
        .stroke({ width: 1, color: w.color, alpha: 0.7 * k });
    }
    if (t < 1.4 && Math.random() < 0.4) bits.add(dashTexture(), ...at(rnd(0.58, 0.67), 0.42), { vy: -unit * rnd(0.3, 0.6), life: 0.6, tint: 0x6af0d8, scale: (unit / 180) * 0.3, alpha: 0.7 });
    for (const p of bits.list) p.s.rotation = Math.PI / 2;
    const f = Math.sin(Math.PI * span(t, 1, 1.5));
    tip.alpha = 0.8 * f;
    tip.rotation = t;
    tip.scale.set((unit / 120) * 0.3 * f);
    bits.step(dt);
    return t < 1.9 || bits.list.length > 0;
  });
  await done();
}

export async function idiosyncresis(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eyes = [at(0.455, 0.255), at(0.553, 0.205)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xfff07a);
    s.position.set(...p);
    return s;
  });
  const streams: [Pt, Pt, Pt][] = [
    [at(0.02, 0.4), at(0.3, 0.3), at(0.47, 0.2)],
    [at(0.06, 0.32), at(0.28, 0.26), at(0.42, 0.21)],
    [at(0.58, 0.15), at(0.72, 0.12), at(0.86, 0.12)],
  ];
  const dashes = Array.from({ length: 36 }, (_, i) => ({ s: glowSprite(fx, dashTexture(), i % 3 ? 0xd8ff5a : 0xffd84a), path: i % 3, off: rnd(0, 1), speed: rnd(0.35, 0.6) }));
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const mouth = at(0.6, 0.275);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const on = span(t, 0, 0.3) * (1 - span(t, 1.5, 1.9));
    for (const d of dashes) {
      const s = (d.off + t * d.speed) % 1;
      const [a, b, c] = streams[d.path];
      const p = bezier(a, b, c, s);
      const q = bezier(a, b, c, Math.min(1, s + 0.01));
      d.s.position.set(...p);
      d.s.rotation = Math.atan2(q[1] - p[1], q[0] - p[0]);
      d.s.alpha = 0.75 * on * Math.sin(Math.PI * s);
      d.s.scale.set((unit / 180) * 0.35, (unit / 180) * 0.35);
    }
    const glow = Math.sin(Math.PI * span(t, 0.2, 1.8));
    for (const e of eyes) {
      e.alpha = 0.8 * glow;
      e.scale.set((unit / 128) * 0.07);
    }
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.5 + i * 0.25, 1.2 + i * 0.25);
      if (k <= 0 || k >= 1) continue;
      const r = unit * (0.04 + 0.22 * ease.out(k));
      g.moveTo(mouth[0] + Math.cos(-0.9) * r, mouth[1] + Math.sin(-0.9) * r)
        .arc(mouth[0], mouth[1], r, -0.9, 0.5)
        .stroke({ width: 1.5, color: 0xff6ab0, alpha: 0.6 * (1 - k) });
    }
    return t < 1.9;
  });
  await done();
}
