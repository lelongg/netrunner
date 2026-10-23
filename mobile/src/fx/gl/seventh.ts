import { Graphics } from "pixi.js";
import { GlowFilter, GodrayFilter, RGBSplitFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, GOLD, type Ready, Smoke, WHITE, burst, coinTexture, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp, pose, rnd } from "./more";
import { bezier, jolt, runnerAt, streakTexture, triTexture } from "./sixth";

const featherTexture = () =>
  painted("s7-feather", 16, 40, (g) => {
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath();
    g.moveTo(8, 1);
    g.quadraticCurveTo(15, 18, 8, 39);
    g.quadraticCurveTo(1, 18, 8, 1);
    g.fill();
  });

const cardTexture = () =>
  painted("s7-card", 30, 42, (g) => {
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(2, 2, 26, 38, 4);
    g.fill();
    g.stroke();
  });

const confettiTexture = () =>
  painted("s7-confetti", 10, 6, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 10, 6);
  });

function arcFrom(g: Graphics, c: Pt, r: number, a0: number, a1: number) {
  return g.moveTo(c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r).arc(c[0], c[1], r, a0, a1);
}

export async function shred(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const amp = at(0.38, 0.36);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const shards = new Emitter(fx);
  const beats = [0.1, 0.45, 0.8];
  const hit = [false, false, false];
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    beats.forEach((b, i) => {
      for (let r = 0; r < 3; r++) {
        const k = span(t, b + r * 0.06, b + r * 0.06 + 0.5);
        if (k <= 0 || k >= 1) continue;
        const R = unit * (0.08 + 0.45 * ease.out(k));
        arcFrom(g, amp, R, -2.4, 0.4).stroke({ width: 2 * (1 - k) + 0.8, color: (i + r) % 2 ? 0x4fe0ff : 0xff4fb0, alpha: 0.8 * (1 - k) });
      }
      if (!hit[i] && t > b) {
        hit[i] = true;
        for (let n = 0; n < 8; n++) {
          const a = rnd(-2.6, 0.6);
          shards.add(streakTexture(), ...amp, { vx: Math.cos(a) * unit * rnd(1, 1.8), vy: Math.sin(a) * unit * rnd(1, 1.8), drag: 2, life: 0.4, tint: n % 2 ? 0x4fe0ff : 0xff4fb0, scale: (unit / 180) * rnd(0.4, 0.7) });
        }
      }
    });
    for (const p of shards.list) p.s.rotation = Math.atan2(p.vy, p.vx);
    const thump = Math.max(...beats.map((b) => Math.max(0, 1 - Math.abs(t - b - 0.03) * 10)));
    split.red = { x: unit * 0.01 * thump, y: 0 };
    split.blue = { x: -unit * 0.01 * thump, y: 0 };
    shards.step(dt);
    return t < 1.4 || shards.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function maglectricPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const core = at(0.52, 0.4);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const heart = glowSprite(fx, glowTexture(), 0x4fc8ff);
  heart.position.set(...core);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    const pulse = 0.5 + 0.5 * Math.sin(t * 9);
    heart.alpha = (0.4 + 0.4 * pulse) * span(t, 0, 0.3) * fade;
    heart.scale.set((unit / 128) * 0.15);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.9 + i / 3) % 1;
      const [rx, ry] = [unit * (0.06 + 0.25 * k), unit * (0.02 + 0.08 * k)];
      g.ellipse(core[0], core[1], sideways ? ry : rx, sideways ? rx : ry).stroke({ width: 1.4, color: 0x7ad8ff, alpha: 0.7 * (1 - k) * fade * span(t, 0, 0.3) });
    }
    return t < 1.7;
  });
  await done();
}

export async function maglectric(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const core = at(0.52, 0.4);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const sparks = new Emitter(world);
  let pop = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const src = root.toGlobal({ x: core[0], y: core[1] });
    if (t < 0.3 && Math.floor(t * 30) % 2 === 0)
      for (let i = 0; i < 2; i++) {
        const a = rnd(0, Math.PI * 2);
        lightning(g, src.x, src.y, src.x + Math.cos(a) * unit * 0.3, src.y + Math.sin(a) * unit * 0.3, unit * 0.1, 0x4fc8ff, unit * 0.006);
      }
    const k = span(t, 0.3, 1);
    if (k > 0 && k < 1) {
      g.circle(src.x, src.y, unit * 2.4 * ease.out(k)).stroke({ width: unit * 0.04 * (1 - k) + 1, color: 0x4fc8ff, alpha: 0.6 * (1 - k) });
      g.circle(src.x, src.y, unit * 2.2 * ease.out(k)).stroke({ width: 1.2, color: WHITE, alpha: 0.7 * (1 - k) });
    }
    if (!pop && t > 0.3) {
      pop = true;
      burst(sparks, src.x, src.y, 30, 0x4fc8ff, unit * 2, { life: 0.6, scale: 0.35 });
      navigator.vibrate?.(30);
    }
    sparks.step(dt);
    return t < 1 || sparks.list.length > 0;
  });
  g.destroy();
  await done();
}

export async function ottoCampaign(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const visor = at(0.3, 0.17);
  const hand = at(0.62, 0.13);
  const lens = glowSprite(fx, sparkTexture(), 0x7af0ff);
  lens.position.set(...visor);
  const confetti = new Emitter(fx);
  const colors = [0xffd84a, 0xff6ab0, 0x6ad0ff, 0x8aff8a];
  let pop = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    const f = Math.sin(Math.PI * span(t, 0, 0.6));
    lens.alpha = f;
    lens.scale.set((unit / 120) * 0.5 * f);
    if (!pop && t > 0.35) {
      pop = true;
      for (let i = 0; i < 30; i++) {
        const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1);
        confetti.add(confettiTexture(), ...hand, { vx: Math.cos(a) * unit * rnd(0.4, 1), vy: Math.sin(a) * unit * rnd(0.5, 1.1), gravity: unit * 1.4, drag: 1.2, spin: rnd(-10, 10), life: 1.1, tint: colors[i % 4], scale: (unit / 180) * rnd(0.5, 0.8), blend: "normal" });
      }
    }
    confetti.step(dt);
    return t < 0.7 || confetti.list.length > 0;
  });
  await done();
}

export async function nanomanagement(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hub = at(0.63, 0.35);
  const touch = at(0.47, 0.4);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const panes = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2 + rnd(-0.2, 0.2), r: unit * rnd(0.12, 0.2), d: i * 0.08 }));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.2, 1.6);
    const tap = span(t, 0.05, 0.5);
    if (tap > 0 && tap < 1) arcFrom(g, touch, unit * 0.12 * ease.out(tap), 0, Math.PI * 2).stroke({ width: 1.5, color: 0x7ae8ff, alpha: 1 - tap });
    for (const p of panes) {
      const k = ease.back(span(t, 0.3 + p.d, 0.6 + p.d));
      if (k <= 0) continue;
      const x = hub[0] + Math.cos(p.a + t * 0.4) * p.r * k;
      const y = hub[1] + Math.sin(p.a + t * 0.4) * p.r * 0.6 * k;
      const w = unit * 0.07 * k;
      const h = unit * 0.045 * k;
      g.rect(x - w / 2, y - h / 2, w, h)
        .fill({ color: 0x4fc8ff, alpha: 0.15 * fade })
        .stroke({ width: 1, color: 0xb0f0ff, alpha: 0.85 * fade });
      g.moveTo(...hub)
        .lineTo(x, y)
        .stroke({ width: 1, color: 0x4fc8ff, alpha: 0.35 * fade });
    }
    return t < 1.6;
  });
  await done();
}

export async function ipEnforcement(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const badge = at(0.37, 0.335);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const flash = glowSprite(fx, glowTexture(), 0xffe08a);
  flash.position.set(...badge);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.2, 1.6);
    const k = span(t, 0, 0.35);
    const s = 1 + 1.5 * (1 - k) * (1 - k);
    const R = unit * 0.075 * s;
    g.circle(badge[0], badge[1], R).stroke({ width: 2, color: 0xffd27a, alpha: 0.9 * k * fade });
    g.circle(badge[0], badge[1], R * 0.75).stroke({ width: 1, color: 0xffd27a, alpha: 0.7 * k * fade });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t;
      g.moveTo(badge[0] + Math.cos(a) * R * 0.8, badge[1] + Math.sin(a) * R * 0.8).lineTo(badge[0] + Math.cos(a) * R * 0.95, badge[1] + Math.sin(a) * R * 0.95);
    }
    g.stroke({ width: 1, color: 0xffd27a, alpha: 0.7 * k * fade });
    const r = span(t, 0.35, 0.9);
    if (r > 0 && r < 1) g.circle(badge[0], badge[1], unit * (0.075 + 0.45 * ease.out(r))).stroke({ width: 2 * (1 - r) + 0.8, color: 0xffd27a, alpha: 1 - r });
    const f = Math.max(0, 1 - Math.abs(t - 0.38) * 6);
    flash.alpha = 0.6 * f;
    flash.scale.set((unit / 128) * 0.35);
    return t < 1.6;
  });
  await done();
}

export async function touchUps(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const cols = 9;
  const rows = 4;
  const pick = { c: 4, r: 1 };
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    const sweep = span(t, 0, 0.8) * (cols + 2);
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const lit = Math.max(0, 1 - Math.abs(sweep - c - r * 0.3));
        const chosen = c === pick.c && r === pick.r && t > 0.85;
        if (!lit && !chosen) continue;
        const u0 = 0.06 + (c * 0.88) / cols;
        const v0 = 0.07 + (r * 0.36) / rows;
        const p0 = at(u0 + 0.008, v0 + 0.008);
        const p1 = at(u0 + 0.88 / cols - 0.008, v0 + 0.36 / rows - 0.008);
        const x = Math.min(p0[0], p1[0]);
        const y = Math.min(p0[1], p1[1]);
        g.rect(x, y, Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1])).stroke({ width: chosen ? 2 : 1, color: chosen ? 0xffd27a : 0x7ae8ff, alpha: (chosen ? 0.95 * (0.7 + 0.3 * Math.sin(t * 12)) : 0.7 * lit) * fade });
      }
    return t < 1.7;
  });
  await done();
}

export async function mycoweb(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const seed: [number, number] = [0.6, 0.72];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const branches: { a: [number, number]; b: [number, number]; d: number }[] = [];
  const grow = (p: [number, number], ang: number, len: number, depth: number, d: number) => {
    if (depth > 3) return;
    const b: [number, number] = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len * 0.75];
    branches.push({ a: p, b, d });
    for (let i = 0; i < 2; i++) grow(b, ang + rnd(-0.7, 0.7), len * 0.7, depth + 1, d + 0.18);
  };
  for (let i = 0; i < 5; i++) grow(seed, (i / 5) * Math.PI * 2 + rnd(-0.3, 0.3), 0.1, 0, 0);
  const spores = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    for (const br of branches) {
      const k = ease.out(span(t, br.d, br.d + 0.3));
      if (k <= 0) continue;
      const u = br.a[0] + (br.b[0] - br.a[0]) * k;
      const v = br.a[1] + (br.b[1] - br.a[1]) * k;
      if (u < 0.05 || u > 0.95 || v < 0.53 || v > 0.97) continue;
      g.moveTo(...at(...br.a))
        .lineTo(...at(u, v))
        .stroke({ width: 1.3, color: 0xe8ff5a, alpha: 0.8 * fade });
      if (k >= 1 && Math.random() < 0.02) spores.add(sparkTexture(), ...at(u, v), { vy: -unit * 0.1, life: 0.6, tint: 0xe8ff5a, scale: (unit / 180) * 0.25 });
    }
    spores.step(dt);
    return t < 1.8 || spores.list.length > 0;
  });
  await done();
}

export async function mycowebFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const seed = at(0.6, 0.72);
  const spores = Array.from({ length: 16 }, (_, i) => ({ s: glowSprite(world, glowTexture(), i % 3 ? 0xe8ff5a : 0xb8ff8a), d: i * 0.03, off: [rnd(-1, 1) * unit * 0.5, rnd(-1, 1) * unit * 0.5] as Pt }));
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t) => {
    const src = root.toGlobal({ x: seed[0], y: seed[1] });
    for (const sp of spores) {
      const k = span(t, sp.d, sp.d + 0.6);
      const ctrl: Pt = [(src.x + target[0]) / 2 + sp.off[0], (src.y + target[1]) / 2 + sp.off[1]];
      sp.s.position.set(...bezier([src.x, src.y], ctrl, [target[0] + sp.off[0] * 0.3, target[1] + sp.off[1] * 0.1], ease.inOut(k)));
      sp.s.alpha = k > 0 && k < 1 ? 0.8 : 0;
      sp.s.scale.set((unit / 128) * 0.05);
    }
    if (!hit && t > 0.65) {
      hit = true;
      jolt(board);
    }
    return t < 1.1;
  });
  await done();
}

export async function lamplighter(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const lamp = at(0.47, 0.66);
  const rays = new GodrayFilter({ angle: 0, gain: 0.5, lacunarity: 2.8, alpha: 0, parallel: false, center: { x: 0, y: 0 } });
  card.filters = [rays];
  const flame = glowSprite(fx, glowTexture(), 0xd8f0ff);
  flame.position.set(...lamp);
  root.addChild(fx);
  await run(app, (t) => {
    const f = Math.sin(Math.PI * span(t, 0, 1.7));
    const p = filterPoint(card, lamp[0], lamp[1]);
    rays.center = { x: p.x, y: p.y };
    rays.alpha = 0.6 * f;
    rays.time = t * 0.8;
    flame.alpha = 0.6 * f * (0.85 + 0.15 * Math.sin(t * 17));
    flame.scale.set((unit / 128) * 0.2);
    return t < 1.7;
  });
  card.filters = [];
  await done();
}

export async function mahkotaLangit(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const dome = at(0.52, 0.3);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    const k = ease.out(span(t, 0.05, 0.8));
    const R = rect.width * 0.3;
    if (k > 0) {
      const a0 = Math.PI;
      const a1 = Math.PI + Math.PI * k;
      arcFrom(g, dome, R, a0, a1).stroke({ width: unit * 0.02, color: 0x7affd8, alpha: 0.35 * fade });
      arcFrom(g, dome, R, a0, a1).stroke({ width: 1.4, color: 0xe0fff6, alpha: 0.85 * fade });
      for (let i = 1; i < 4; i++) {
        const h = (R * i) / 4;
        g.ellipse(dome[0], dome[1] - h, Math.sqrt(R * R - h * h), R * 0.06).stroke({ width: 1, color: 0x7affd8, alpha: 0.3 * fade * span(t, 0.5 + i * 0.1, 0.8 + i * 0.1) });
      }
    }
    return t < 1.7;
  });
  await done();
}

export const mycowebPose = pose(0xe8ff5a, [0.6, 0.72]);
export const nPotPose = pose(0xffe85a, [0.62, 0.58]);
export const lamplighterPose = pose(0xd8f0ff, [0.47, 0.66]);
