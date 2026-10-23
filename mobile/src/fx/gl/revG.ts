import { Graphics } from "pixi.js";
import { Emitter, ease, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, Smoke, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";
import { bezier, jolt, runnerAt } from "./sixth";

const finTexture = () =>
  painted("rg-fin", 96, 32, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(2, 18);
    g.quadraticCurveTo(30, 8, 62, 12);
    g.lineTo(72, 2);
    g.lineTo(76, 13);
    g.quadraticCurveTo(88, 14, 94, 8);
    g.lineTo(90, 18);
    g.quadraticCurveTo(50, 30, 2, 18);
    g.fill();
  });

const mothTexture = () =>
  painted("rg-moth", 40, 24, (g) => {
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.beginPath();
    g.moveTo(20, 12);
    g.lineTo(3, 2);
    g.lineTo(6, 14);
    g.closePath();
    g.moveTo(20, 12);
    g.lineTo(37, 2);
    g.lineTo(34, 14);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff";
    g.fillRect(18, 8, 4, 10);
  });

export async function tungstenTailor(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const coil = at(0.215, 0.29);
  const base = at(0.33, 0.302);
  const tip = at(0.95, 0.178);
  const yarn: Pt[] = [at(0.86, 0.25), at(0.76, 0.26), at(0.66, 0.2)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const ring = glowSprite(fx, glowTexture(), 0x9aff6a);
  ring.position.set(...coil);
  const glint = glowSprite(fx, sparkTexture(), 0xfff0e0);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const charge = ease.out(span(t, 0, 0.45));
    ring.alpha = 0.55 * charge * fade * (0.8 + 0.2 * Math.sin(t * 20));
    ring.scale.set((unit / 128) * 0.12);
    const run1 = ease.inOut(span(t, 0.35, 0.8));
    const p = lerp(base, tip, run1);
    glint.position.set(...p);
    glint.alpha = run1 > 0 && run1 < 1 ? 0.9 : Math.sin(Math.PI * span(t, 0.8, 1.2)) * 0.8;
    glint.rotation = t * 3;
    glint.scale.set((unit / 120) * (run1 < 1 ? 0.22 : 0.35));
    if (run1 > 0)
      g.moveTo(...base)
        .lineTo(...p)
        .stroke({ width: 1.2, color: 0xe8f4ff, alpha: 0.55 * fade });
    yarn.forEach((y, i) => {
      const k = ease.out(span(t, 0.8 + i * 0.12, 1.4 + i * 0.12));
      if (k <= 0) return;
      const ctrl: Pt = [(tip[0] + y[0]) / 2 + unit * 0.04 * (i - 1), Math.min(tip[1], y[1]) - unit * 0.06];
      g.moveTo(...tip);
      for (let s = 1; s <= 16; s++) g.lineTo(...bezier(tip, ctrl, y, (k * s) / 16));
      g.stroke({ width: 1.3, color: 0xff6a5a, alpha: 0.75 * fade });
    });
    if (t > 0.1 && t < 0.6 && Math.random() < 0.5) motes.add(sparkTexture(), coil[0] + rnd(-1, 1) * unit * 0.03, coil[1] + rnd(-1, 1) * unit * 0.03, { vy: -unit * 0.15, life: 0.4, tint: 0x9aff6a, scale: (unit / 180) * 0.2 });
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

export async function tomorrowsHeadline(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const man = at(0.53, 0.33);
  const emblem = at(0.775, 0.215);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const cols = 9;
  const rows = 5;
  const tiles: { u: number; v: number; d: number }[] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const u = 0.08 + c * 0.095;
      const v = 0.1 + r * 0.065;
      if (Math.abs(u + 0.045 - 0.53) < 0.12 && v > 0.17) continue;
      if (Math.hypot(u + 0.045 - 0.775, v + 0.03 - 0.215) < 0.08) continue;
      const near = Math.hypot(u + 0.045 - 0.53, (v + 0.03 - 0.33) * 1.4);
      tiles.push({ u, v, d: 0.1 + near * 1.1 });
    }
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (const tl of tiles) {
      const k = span(t, tl.d, tl.d + 0.25);
      if (k <= 0) continue;
      const flick = k < 1 && Math.random() < 0.3 ? 0.3 : 1;
      const p0 = at(tl.u + 0.006, tl.v + 0.006);
      const p1 = at(tl.u + 0.089, tl.v + 0.059);
      g.rect(Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1])).stroke({ width: 1, color: 0x9fd8ff, alpha: 0.45 * flick * fade * (1 - 0.6 * span(t, tl.d + 0.3, tl.d + 0.8)) });
    }
    const e = ease.out(span(t, 0.5, 1.1));
    if (e > 0) {
      const R = unit * 0.075;
      const a0 = -Math.PI / 2;
      g.moveTo(emblem[0], emblem[1] - R)
        .arc(emblem[0], emblem[1], R, a0, a0 + Math.PI * 2 * e)
        .stroke({ width: 1.8, color: 0xffd27a, alpha: 0.85 * fade });
      g.moveTo(emblem[0] + R * 0.6, emblem[1])
        .arc(emblem[0], emblem[1], R * 0.6, 0, Math.PI * 2 * e)
        .stroke({ width: 1, color: 0xffd27a, alpha: 0.6 * fade });
    }
    const pulse = span(t, 1.1, 1.7);
    if (pulse > 0 && pulse < 1) g.circle(...emblem, unit * (0.075 + 0.12 * ease.out(pulse))).stroke({ width: 1.5 * (1 - pulse) + 0.5, color: 0xffd27a, alpha: 0.7 * (1 - pulse) });
    const halo = Math.sin(Math.PI * span(t, 0.2, 1.6));
    g.ellipse(man[0], man[1] - unit * 0.04, unit * 0.13, unit * 0.2).stroke({ width: unit * 0.02, color: 0x9fd8ff, alpha: 0.12 * halo });
    return t < 1.9;
  });
  await done();
}

const HEADS: Pt[] = [
  [0.095, 0.212],
  [0.17, 0.205],
  [0.265, 0.208],
  [0.53, 0.218],
  [0.635, 0.213],
  [0.71, 0.215],
];

export async function touchstone(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hub = at(0.53, 0.265);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const slides: Pt[] = [at(0.38, 0.415), at(0.47, 0.44), at(0.585, 0.43)];
  const glints = slides.map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xe0fff8);
    s.position.set(...p);
    return s;
  });
  const dust = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const on = span(t, 0.1, 0.4) * (1 - span(t, 1.5, 1.9));
    const flick = 0.8 + 0.2 * Math.sin(t * 26);
    g.poly([...at(0.5, 0.235), ...at(0.565, 0.235), ...at(0.62, 0.05), ...at(0.44, 0.05)]).fill({ color: 0x8ff0d8, alpha: 0.07 * on * flick });
    const frame = Math.floor(t * 2.5);
    const fw = 0.05;
    const fh = 0.035;
    if (on > 0.2) {
      const [u, v] = [0.53 + (frame % 2 ? 0.004 : -0.004), 0.1];
      const p0 = at(u - fw, v - fh);
      const p1 = at(u + fw, v + fh);
      g.rect(Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1])).stroke({ width: 1, color: 0xd8fff4, alpha: 0.45 * on });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.floor(t * 4) * ((Math.PI * 2) / 12);
      const lit = i === 0;
      g.circle(hub[0] + Math.cos(a) * unit * 0.13, hub[1] + Math.sin(a) * unit * 0.04, unit * 0.008).fill({ color: lit ? 0xffe8a0 : 0x8ff0d8, alpha: on * (lit ? 0.8 : 0.3) });
    }
    slides.forEach((_, i) => {
      const f = Math.sin(Math.PI * span(t, 0.7 + i * 0.2, 1.1 + i * 0.2));
      glints[i].alpha = 0.7 * f;
      glints[i].rotation = t;
      glints[i].scale.set((unit / 120) * 0.22 * f);
    });
    if (on > 0.3 && Math.random() < 0.35) dust.add(glowTexture(), ...at(0.53 + rnd(-0.05, 0.05), rnd(0.07, 0.22)), { vx: rnd(-1, 1) * unit * 0.02, vy: -unit * 0.03, life: 1, tint: 0xd8fff4, scale: (unit / 128) * 0.012, alpha: 0.5 });
    dust.step(dt);
    return t < 1.9 || dust.list.length > 0;
  });
  await done();
}

export async function vicsekFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const body = at(0.65, 0.73);
  const target = runnerAt(board);
  const flock = Array.from({ length: 14 }, (_, i) => ({ s: glowSprite(world, mothTexture(), i % 4 ? 0xbfe8ff : 0xffb0a0), off: [rnd(-1, 1), rnd(-1, 1)] as Pt, lag: rnd(0, 0.12), ph: rnd(0, 6) }));
  let hit = false;
  root.addChild(fx);
  await run(app, (t) => {
    const src = root.toGlobal({ x: body[0], y: body[1] });
    const s: Pt = [src.x, src.y];
    const ctrl: Pt = [(s[0] + target[0]) / 2 + unit * 0.9, Math.min(s[1], target[1]) - unit * 0.4];
    for (const f of flock) {
      const k = ease.inOut(span(t, f.lag, f.lag + 0.85));
      const spread = unit * 0.35 * (1 - k) * (1 - k) + unit * 0.06;
      const c = bezier(s, ctrl, target, k);
      const ahead = bezier(s, ctrl, target, Math.min(1, k + 0.02));
      const dir = Math.atan2(ahead[1] - c[1], ahead[0] - c[0]);
      f.s.position.set(c[0] + f.off[0] * spread + Math.sin(t * 5 + f.ph) * unit * 0.02, c[1] + f.off[1] * spread);
      f.s.rotation = dir + Math.PI / 2;
      f.s.alpha = k > 0 && k < 1 ? 0.85 : 0;
      f.s.scale.set((unit / 180) * 0.55, (unit / 180) * 0.55 * (0.5 + 0.5 * Math.abs(Math.sin(t * 28 + f.ph))));
    }
    if (!hit && t > 0.95) {
      hit = true;
      jolt(board, 0.35);
    }
    return t < 1.05;
  });
  await done();
}

export async function topDownSolutions(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eyes = HEADS.map((h) => {
    const s = glowSprite(fx, glowTexture(), 0xd8ff6a);
    s.position.set(...at(...h));
    return s;
  });
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const beamL = at(0.04, 0.305);
  const beamR = at(0.96, 0.315);
  const mist = new Smoke(fx);
  const chatter = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    HEADS.forEach(([u, v], i) => {
      const on = span(t, 0.1 + i * 0.1, 0.25 + i * 0.1) * fade;
      eyes[i].alpha = 0.8 * on * (0.8 + 0.2 * Math.sin(t * 9 + i));
      eyes[i].scale.set((unit / 128) * 0.05);
      if (i < HEADS.length - 1) {
        const k = span(t, 0.3 + i * 0.1, 0.55 + i * 0.1);
        if (k > 0) {
          const a = at(u, v);
          const b = at(...HEADS[i + 1]);
          const mid: Pt = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - unit * 0.06];
          g.moveTo(...a);
          for (let s = 1; s <= 10; s++) g.lineTo(...bezier(a, mid, b, (k * s) / 10));
          g.stroke({ width: 1.2, color: 0xd8ff6a, alpha: 0.6 * fade });
          if (k > 0 && k < 1 && Math.random() < 0.5) chatter.add(sparkTexture(), ...bezier(a, mid, b, k), { life: 0.3, tint: 0xd8ff6a, scale: (unit / 180) * 0.2, grow: -0.5 });
        }
      }
    });
    const sweep = ease.inOut(span(t, 0.7, 1.4));
    if (sweep > 0 && sweep < 1) {
      const p = lerp(beamL, beamR, sweep);
      g.moveTo(p[0] - unit * 0.06, p[1])
        .lineTo(p[0] + unit * 0.06, p[1])
        .stroke({ width: unit * 0.012, color: 0xc8b8ff, alpha: 0.7 });
    }
    if (t < 1.4 && Math.random() < 0.3) mist.puff(...at(rnd(0.05, 0.4), rnd(0.42, 0.48)), { vx: unit * rnd(0.08, 0.15), vy: -unit * 0.01, size: unit * rnd(0.12, 0.2), life: 1.4, grow: 1.6, tint: 0xd8c8f0, alpha: 0.18 });
    mist.step(dt);
    chatter.step(dt);
    return t < 1.9 || mist.list.length > 0 || chatter.list.length > 0;
  });
  await done();
}

export async function treadLightly(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.6, 0.185);
  const ghost: Pt[] = [at(0.08, 0.5), at(0.12, 0.44), at(0.17, 0.42), at(0.22, 0.45), at(0.2, 0.5)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const lens = glowSprite(fx, glowTexture(), 0xd8f0ff);
  lens.position.set(...eye);
  const shimmer = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const on = span(t, 0.05, 0.3) * (1 - span(t, 1.5, 1.9));
    card.tint = 0xffffff - Math.round(0x18 * on) * 0x10000 - Math.round(0x10 * on) * 0x100;
    lens.alpha = 0.55 * on * (0.8 + 0.2 * Math.sin(t * 15));
    lens.scale.set((unit / 128) * 0.08);
    const a = Math.PI * 0.7 + 0.45 * Math.sin(t * 2 + 0.4);
    const len = unit * 0.95;
    const tip: Pt = [eye[0] + Math.cos(a) * len, eye[1] + Math.sin(a) * len];
    g.poly([...eye, eye[0] + Math.cos(a - 0.13) * len, eye[1] + Math.sin(a - 0.13) * len, eye[0] + Math.cos(a + 0.13) * len, eye[1] + Math.sin(a + 0.13) * len]).fill({ color: 0xd8f0ff, alpha: 0.16 * on });
    g.moveTo(...eye)
      .lineTo(...tip)
      .stroke({ width: 1, color: 0xe8f8ff, alpha: 0.35 * on });
    const c = ghost[2];
    const dist = Math.abs((tip[0] - eye[0]) * (eye[1] - c[1]) - (eye[0] - c[0]) * (tip[1] - eye[1])) / len;
    const lit = Math.max(0, 1 - dist / (unit * 0.18));
    const vis = (1 - lit) * on;
    g.moveTo(...ghost[0]);
    for (const p of ghost.slice(1)) g.lineTo(p[0] + Math.sin(t * 9 + p[1]) * unit * 0.004, p[1]);
    g.stroke({ width: 1.2, color: 0x9ae8ff, alpha: 0.6 * vis });
    if (Math.random() < 0.7 * vis) {
      const q = lerp(ghost[Math.floor(rnd(0, 4))], ghost[Math.floor(rnd(1, 5))], Math.random());
      shimmer.add(sparkTexture(), q[0], q[1], { vy: -unit * 0.06, life: 0.45, tint: 0x9ae8ff, scale: (unit / 180) * 0.2 });
    }
    shimmer.step(dt);
    return t < 1.9 || shimmer.list.length > 0;
  });
  card.tint = 0xffffff;
  await done();
}

const SWARM: Pt[] = [
  [0.22, 0.6],
  [0.3, 0.58],
  [0.26, 0.66],
  [0.33, 0.7],
  [0.22, 0.74],
  [0.36, 0.63],
  [0.4, 0.88],
  [0.7, 0.92],
];

const PANELS: [Pt, Pt][] = [
  [
    [0.66, 0.7],
    [0.74, 0.54],
  ],
  [
    [0.62, 0.7],
    [0.42, 0.58],
  ],
  [
    [0.6, 0.78],
    [0.33, 0.96],
  ],
  [
    [0.66, 0.8],
    [0.56, 0.98],
  ],
];

export async function vicsek(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const core = glowSprite(fx, glowTexture(), 0xff6a4a);
  core.position.set(...at(0.66, 0.74));
  const flock = SWARM.map(([u, v], i) => {
    const s = glowSprite(fx, mothTexture(), i % 3 ? 0xe8c8ff : 0xbfe8ff);
    return { s, p: at(u, v), a: rnd(0, Math.PI * 2) };
  });
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    PANELS.forEach(([a, b], i) => {
      const k = span(t, 0.1 + i * 0.12, 0.7 + i * 0.12);
      if (k <= 0 || k >= 1) return;
      const p0 = at(...a);
      const p1 = at(...b);
      const head = lerp(p0, p1, ease.inOut(k));
      const tail = lerp(p0, p1, Math.max(0, ease.inOut(k) - 0.3));
      g.moveTo(...tail)
        .lineTo(...head)
        .stroke({ width: unit * 0.05, color: 0x9ee8ff, alpha: 0.35 * Math.sin(Math.PI * k) });
      g.moveTo(...tail)
        .lineTo(...head)
        .stroke({ width: 1.5, color: 0xe8f8ff, alpha: 0.85 * Math.sin(Math.PI * k) });
    });
    core.alpha = 0.4 * Math.sin(Math.PI * span(t, 0.2, 1.8)) * (0.7 + 0.3 * Math.sin(t * 12));
    core.scale.set((unit / 128) * 0.1);
    const order = span(t, 0.4, 1.2);
    const heading = -2.4;
    for (const f of flock) {
      let d = heading - f.a;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      f.a += d * order * 0.12 + rnd(-0.4, 0.4) * (1 - order);
      const speed = unit * (0.08 + 0.35 * order);
      f.p = [f.p[0] + Math.cos(f.a) * speed * dt, f.p[1] + Math.sin(f.a) * speed * dt];
      f.s.position.set(...f.p);
      f.s.rotation = f.a + Math.PI / 2;
      f.s.alpha = 0.8 * span(t, 0, 0.2) * fade;
      f.s.scale.set((unit / 180) * 0.4, (unit / 180) * 0.4 * (0.5 + 0.5 * Math.abs(Math.sin(t * 26 + f.p[0]))));
    }
    return t < 1.9;
  });
  await done();
}
