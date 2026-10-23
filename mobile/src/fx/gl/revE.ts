import { Graphics } from "pixi.js";
import { Emitter, ease, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, Smoke, painted, petalTexture, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";
import { bezier, jolt, runnerAt, triTexture } from "./sixth";

const flyerTexture = () =>
  painted("re-flyer", 20, 26, (g) => {
    g.fillStyle = "rgba(244,238,226,0.95)";
    g.fillRect(1, 1, 18, 24);
    g.fillStyle = "rgba(60,50,70,0.7)";
    g.fillRect(4, 5, 12, 3);
    g.fillRect(4, 11, 10, 2);
    g.fillRect(4, 15, 12, 2);
  });

const bolt = (g: Graphics, a: Pt, b: Pt, width: number, color: number, alpha: number) =>
  g
    .moveTo(...a)
    .lineTo(...b)
    .stroke({ width, color, alpha, cap: "round" });

const SLOTS: Pt[] = [];
for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) SLOTS.push([0.445 + 0.067 * c + 0.009 * r, 0.555 + 0.044 * r + 0.008 * c]);

export async function syailendra(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const tip = glowSprite(fx, glowTexture(), 0xe8fff0);
  tip.position.set(...at(0.27, 0.61));
  const pip = glowSprite(fx, sparkTexture(), 0xdff6ff);
  const ring = (a: number) => at(0.245 + 0.125 * Math.cos(a), 0.76 + 0.225 * Math.sin(a));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.6, 2);
    SLOTS.forEach(([u, v], i) => {
      const d = 0.15 + (u - 0.44) * 1.6 + (v - 0.55) * 1.2;
      const lit = span(t, d, d + 0.2) * fade;
      if (lit <= 0) return;
      const [x, y] = at(u, v);
      g.circle(x, y, unit * 0.026).fill({ color: 0x9dffc0, alpha: 0.3 * lit });
      g.circle(x, y, unit * 0.011).fill({ color: 0xf0fff4, alpha: 0.9 * lit });
    });
    const k = ease.inOut(span(t, 0.1, 1.5));
    const a0 = -Math.PI / 2;
    const head = a0 + k * Math.PI * 2;
    if (k > 0 && k < 1) {
      g.moveTo(...ring(Math.max(a0, head - 1.2)));
      for (let i = 1; i <= 20; i++) g.lineTo(...ring(Math.max(a0, head - 1.2) + ((head - Math.max(a0, head - 1.2)) * i) / 20));
      g.stroke({ width: 2.2, color: 0xbfeaff, alpha: 0.9 * fade });
    }
    pip.position.set(...ring(head));
    pip.alpha = k > 0 && k < 1 ? 0.9 * fade : 0;
    pip.scale.set((unit / 120) * 0.25);
    const b = Math.sin(Math.PI * span(t, 0.9, 1.8));
    tip.alpha = 0.45 * b;
    tip.scale.set((unit / 128) * 0.12);
    return t < 2;
  });
  await done();
}

function lattice(g: Graphics, c: Pt, R: number, spin: number, alpha: number, grow = 1) {
  for (let i = 0; i < 6; i++) {
    const a = spin + (i / 6) * Math.PI;
    const w = Math.abs(Math.cos(a)) * R * grow;
    g.ellipse(c[0], c[1], Math.max(0.5, w), R * grow).stroke({ width: 1, color: 0xbff4ff, alpha: alpha * (Math.sin(a) > 0 ? 0.9 : 0.35) });
  }
  for (let j = 1; j < 5; j++) {
    const y = -1 + (2 * j) / 5;
    g.ellipse(c[0], c[1] + y * R * grow, R * grow * Math.sqrt(1 - y * y), R * grow * 0.12).stroke({ width: 1, color: 0xbff4ff, alpha: alpha * 0.5 });
  }
}

export async function kessleroid(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.53, 0.74);
  const R = unit * 0.28;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const heart = glowSprite(fx, glowTexture(), 0xff3a4a);
  heart.position.set(...c);
  const specks = Array.from({ length: 14 }, (_, i) => ({ s: glowSprite(fx, sparkTexture(), 0xd8f2ff), a: (i / 14) * Math.PI * 2, r: rnd(1.15, 1.4), tilt: rnd(-0.6, 0.6), w: rnd(0.6, 1.1) }));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const on = span(t, 0, 0.4) * (1 - span(t, 1.6, 2));
    lattice(g, c, R, t * 0.8, 0.55 * on);
    const beat = Math.pow(Math.max(0, Math.sin(t * 5)), 6);
    heart.alpha = on * (0.25 + 0.35 * beat);
    heart.scale.set((unit / 128) * (0.45 + 0.08 * beat));
    for (const s of specks) {
      s.a += s.w * dt;
      const x = Math.cos(s.a) * R * s.r;
      const y = Math.sin(s.a) * R * s.r * 0.3;
      s.s.position.set(c[0] + x * Math.cos(s.tilt) - y * Math.sin(s.tilt), c[1] + x * Math.sin(s.tilt) + y * Math.cos(s.tilt));
      s.s.alpha = on * (Math.sin(s.a) > 0 ? 0.8 : 0.25);
      s.s.scale.set((unit / 120) * 0.14);
    }
    return t < 2;
  });
  await done();
}

export async function kessleroidFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.53, 0.74);
  const R = unit * 0.28;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const w = new Graphics();
  w.blendMode = "add";
  world.addChild(w);
  const heart = glowSprite(fx, glowTexture(), 0xff3a4a);
  heart.position.set(...c);
  const target = runnerAt(board);
  const bits = Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * Math.PI * 2 + rnd(-0.1, 0.1), len: rnd(0.08, 0.16), spin: rnd(-6, 6), d: rnd(0, 0.12), aim: i % 3 === 0, off: [rnd(-1, 1) * unit * 0.4, rnd(-1, 1) * unit * 0.3] as Pt }));
  let hit = false;
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    w.clear();
    const swell = ease.out(span(t, 0, 0.2));
    if (t < 0.25) lattice(g, c, R, t * 3, 0.7, 1 + 0.08 * swell);
    heart.alpha = 0.5 * Math.sin(Math.PI * span(t, 0, 0.5));
    heart.scale.set((unit / 128) * 0.5);
    const src = root.toGlobal({ x: c[0], y: c[1] });
    for (const b of bits) {
      const k = span(t, 0.22 + b.d, 0.22 + b.d + (b.aim ? 0.5 : 0.7));
      if (k <= 0 || k >= 1) continue;
      const start: Pt = [src.x + Math.cos(b.a) * R, src.y + Math.sin(b.a) * R];
      const end: Pt = b.aim ? [target[0] + b.off[0], target[1] + b.off[1] * 0.3] : [src.x + Math.cos(b.a) * R * 3.2, src.y + Math.sin(b.a) * R * 3.2];
      const p = b.aim ? bezier(start, [(start[0] + end[0]) / 2 + b.off[0], (start[1] + end[1]) / 2 + b.off[1]], end, ease.inOut(k)) : lerp(start, end, ease.out(k));
      const ang = b.a + t * b.spin;
      const L = unit * b.len * 0.5;
      bolt(w, [p[0] - Math.cos(ang) * L, p[1] - Math.sin(ang) * L], [p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L], 1.4, b.aim ? 0xffb0b8 : 0xbff4ff, 0.85 * (1 - k * 0.6));
    }
    if (!hit && t > 0.7) {
      hit = true;
      jolt(board);
      navigator.vibrate?.([30, 20, 30]);
    }
    return t < 1.1;
  });
  w.destroy();
  await done();
}

export async function floodTheMarket(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const petals = new Emitter(fx);
  const bottles: [Pt, number][] = [
    [at(0.34, 0.37), 0x7ae8ff],
    [at(0.43, 0.065), 0xffb060],
    [at(0.68, 0.1), 0x7ae8ff],
    [at(0.6, 0.43), 0xffb060],
  ];
  const glints = bottles.map(([p, tint]) => {
    const s = glowSprite(fx, sparkTexture(), tint);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t, dt) => {
    if (t < 1.3 && Math.random() < 0.55) {
      const [x, y] = at(rnd(0, 1), rnd(0.04, 0.12));
      petals.add(petalTexture(), x, y, { vx: unit * rnd(0.04, 0.18), vy: unit * rnd(0.1, 0.22), spin: rnd(-3, 3), life: rnd(1, 1.5), tint: Math.random() < 0.6 ? 0xf2b8cf : 0xd97aa8, scale: (unit / 180) * rnd(0.22, 0.38), alpha: 0.75, blend: "normal" });
    }
    for (const p of petals.list) p.s.x += Math.sin(p.age * 4 + p.s.y * 0.03) * 0.5;
    glints.forEach((s, i) => {
      const f = Math.sin(Math.PI * span(t, 0.2 + i * 0.25, 0.65 + i * 0.25));
      s.alpha = 0.85 * f;
      s.rotation = t * 2;
      s.scale.set((unit / 120) * 0.32 * f);
    });
    petals.step(dt);
    return t < 1.5 || petals.list.length > 0;
  });
  await done();
}

export async function rentRioters(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sign = glowSprite(fx, glowTexture(), 0xd86ad8);
  sign.position.set(...at(0.3, 0.165));
  const mouths: Pt[] = [at(0.285, 0.205), at(0.735, 0.125)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const flyers = new Emitter(fx);
  const smoke = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.6, 2);
    sign.alpha = 0.3 * fade * (Math.random() < 0.85 ? 1 : 0.2);
    sign.scale.set((unit / 128) * 0.3, (unit / 128) * 0.15);
    mouths.forEach((m, j) => {
      for (let i = 0; i < 3; i++) {
        const k = ((t * 1.3 + i / 3 + j * 0.5) % 1) * span(t, 0.1, 0.3) * fade;
        if (k <= 0) continue;
        const r = unit * (0.03 + 0.12 * k);
        const dir = j === 0 ? -2.3 : -1.2;
        g.moveTo(m[0] + Math.cos(dir - 0.5) * r, m[1] + Math.sin(dir - 0.5) * r)
          .arc(m[0], m[1], r, dir - 0.5, dir + 0.5)
          .stroke({ width: 1.4, color: 0xfff0e0, alpha: 0.6 * (1 - k) });
      }
    });
    if (t > 0.3 && t < 1.2 && Math.random() < 0.3) flyers.add(flyerTexture(), ...at(rnd(0.1, 0.9), rnd(0.25, 0.35)), { vx: rnd(-1, 1) * unit * 0.3, vy: -unit * rnd(0.4, 0.7), gravity: unit * 0.9, drag: 1.2, spin: rnd(-4, 4), life: 1.2, scale: (unit / 180) * rnd(0.25, 0.35), blend: "normal", alpha: 0.9 });
    if (t < 1.4 && Math.random() < 0.15) smoke.puff(...at(rnd(0.1, 0.9), 0.47), { vx: rnd(-1, 1) * unit * 0.05, vy: -unit * 0.06, life: 1.6, size: unit * 0.16, grow: 2, tint: 0x8a7e8a, alpha: 0.3 });
    flyers.step(dt);
    smoke.step(dt);
    return t < 2 || flyers.list.length > 0;
  });
  await done();
}

const SCREENS: [number, number, number, number][] = [
  [0.15, 0.6, 0.34, 0.77],
  [0.36, 0.55, 0.56, 0.63],
  [0.7, 0.64, 0.89, 0.78],
  [0.41, 0.77, 0.69, 0.95],
  [0.21, 0.85, 0.41, 0.97],
];

const BIOROIDS: Pt[] = [
  [0.044, 0.405],
  [0.161, 0.382],
  [0.206, 0.378],
  [0.3, 0.374],
  [0.422, 0.37],
  [0.567, 0.352],
  [0.722, 0.315],
  [0.767, 0.303],
  [0.817, 0.288],
  [0.861, 0.276],
];

export async function humanoidResources(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const eyes = BIOROIDS.map(([u, v]) => {
    const s = glowSprite(fx, sparkTexture(), 0x9be8ff);
    s.position.set(...at(u, v - 0.012));
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.7, 2.1);
    const pulse = 0.15 + span(t, 0.1, 1.3) * 0.85;
    BIOROIDS.forEach(([u, v], i) => {
      const d = 0.1 + u * 1.2;
      const k = span(t, d, d + 0.3);
      const depth = 1.3 - u * 0.6;
      if (k > 0 && k < 1) {
        const y = v - 0.04 + 0.12 * ease.inOut(k);
        bolt(g, at(u - 0.03 * depth, y), at(u + 0.03 * depth, y), 2, 0x9be8ff, 0.9 * (1 - k * 0.5));
      }
      const on = span(t, d + 0.2, d + 0.35) * fade;
      eyes[i].alpha = on * (0.75 + 0.25 * Math.sin(t * 6 + i));
      eyes[i].scale.set((unit / 120) * 0.3 * depth);
    });
    if (pulse < 1) {
      const p = at(pulse, 0.27 - pulse * 0.1);
      g.circle(...p, unit * 0.015).fill({ color: 0xffd0a0, alpha: 0.8 * fade });
    }
    return t < 2.1;
  });
  await done();
}
