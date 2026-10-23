import { Graphics } from "pixi.js";
import { GodrayFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, Smoke, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";

const noteTexture = () =>
  painted("ra-note", 36, 20, (g) => {
    g.fillStyle = "rgba(255,255,255,0.28)";
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(1.5, 1.5, 33, 17, 3);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(18, 10, 4.5, 0, Math.PI * 2);
    g.stroke();
  });

const dotTexture = () =>
  painted("ra-dot", 12, 12, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(6, 6, 5, 0, Math.PI * 2);
    g.fill();
  });

function ellipse(g: Graphics, c: Pt, rx: number, ry: number, a0: number, a1: number, n = 36) {
  g.moveTo(c[0] + Math.cos(a0) * rx, c[1] + Math.sin(a0) * ry);
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    g.lineTo(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry);
  }
  return g;
}

export async function embeddedReportingScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const temple = at(0.7, 0.26);
  const grinder = at(0.33, 0.445);
  const sign = at(0.12, 0.2);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const sparks = new Emitter(fx);
  const neon = glowSprite(fx, glowTexture(), 0x4fd8e8);
  neon.position.set(...sign);
  const forge = glowSprite(fx, glowTexture(), 0xff8a3a);
  forge.position.set(...grinder);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.2 + i * 0.3, 1 + i * 0.3);
      if (k <= 0 || k >= 1) continue;
      const r = unit * (0.04 + 0.16 * ease.out(k));
      ellipse(g, temple, r, r * 0.9, -0.9, 0.6, 16).stroke({ width: 1.3, color: 0xffe6a0, alpha: 0.7 * (1 - k) * fade });
    }
    const flick = t < 0.5 ? (Math.floor(t * 14) % 3 ? 0.15 : 1) : 1;
    neon.alpha = 0.35 * flick * fade;
    neon.scale.set((unit / 128) * 0.22, (unit / 128) * 0.12);
    const grind = span(t, 0.1, 0.25) * (1 - span(t, 1.3, 1.6));
    forge.alpha = 0.35 * grind * (0.7 + 0.3 * Math.sin(t * 40));
    forge.scale.set((unit / 128) * 0.14);
    if (grind > 0)
      for (let n = 0; n < 3; n++) {
        const a = rnd(-2.6, -1.4);
        const v = unit * rnd(0.5, 1.1);
        sparks.add(sparkTexture(), grinder[0], grinder[1], { vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: unit * 2.2, life: rnd(0.3, 0.5), tint: Math.random() < 0.3 ? 0xffe0a0 : 0xff9a3a, scale: (unit / 180) * rnd(0.12, 0.22) });
      }
    sparks.step(dt);
    return t < 1.9 || sparks.list.length > 0;
  });
  await done();
}

export async function greenmailScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const stash = at(0.43, 0.44);
  const cup = at(0.48, 0.16);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const notes = Array.from({ length: 9 }, (_, i) => ({ s: glowSprite(fx, noteTexture(), i % 3 ? 0x5aff8a : 0xb8ffc8), d: i * 0.1, ph: rnd(0, 6), r: rnd(0.05, 0.12), lift: rnd(0.12, 0.24) }));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (const n of notes) {
      const k = span(t, n.d, n.d + 1);
      if (k <= 0 || k >= 1) {
        n.s.alpha = 0;
        continue;
      }
      const a = n.ph + k * 5;
      n.s.position.set(stash[0] + Math.cos(a) * unit * n.r, stash[1] - unit * n.lift * ease.out(k) + Math.sin(a) * unit * n.r * 0.3);
      n.s.rotation = Math.sin(a) * 0.6;
      n.s.scale.set((unit / 180) * 0.75, (unit / 180) * 0.75 * Math.abs(Math.cos(a)) + 0.05);
      n.s.alpha = 0.6 * Math.sin(Math.PI * k) * fade;
    }
    if (t > 0.3 && t < 1.2 && Math.floor(t * 18) % 4 === 0) lightning(g, cup[0], cup[1], cup[0] + rnd(-0.03, 0.03) * rect.width, cup[1] - unit * rnd(0.08, 0.13), unit * 0.04, 0x9ae0ff, unit * 0.003);
    return t < 1.9;
  });
  await done();
}

export async function longevityScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const core = at(0.47, 0.27);
  const rx = rect.width * 0.25;
  const ry = rect.height * 0.17;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const embers = new Emitter(fx);
  const heart = glowSprite(fx, glowTexture(), 0xff9a3a);
  heart.position.set(...core);
  const face = glowSprite(fx, glowTexture(), 0xdce8ff);
  face.position.set(...at(0.83, 0.31));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const beat = Math.max(0, Math.sin(t * 7)) ** 3;
    heart.alpha = (0.2 + 0.2 * beat) * span(t, 0, 0.3) * fade;
    heart.scale.set((unit / 128) * (0.3 + 0.06 * beat));
    for (let i = 0; i < 4; i++) {
      const a0 = t * 1.8 + (i * Math.PI) / 2;
      const len = 0.9 * ease.out(span(t, 0.1 + i * 0.1, 0.8 + i * 0.1));
      if (len <= 0) continue;
      ellipse(g, core, rx * (0.98 - i * 0.04), ry * (0.98 - i * 0.04), a0, a0 + len, 14).stroke({ width: 1.2, color: i % 2 ? 0x9ad8ff : 0xffd08a, alpha: 0.65 * fade });
    }
    if (t < 1.3 && Math.random() < 0.6) {
      const a = rnd(0, Math.PI * 2);
      const p: Pt = [core[0] + Math.cos(a) * rx * 0.9, core[1] + Math.sin(a) * ry * 0.9];
      embers.add(sparkTexture(), ...p, { vx: (core[0] - p[0]) * 1.2, vy: (core[1] - p[1]) * 1.2, life: 0.7, tint: Math.random() < 0.5 ? 0xffb050 : 0xa8c8ff, scale: (unit / 180) * 0.2 });
    }
    face.alpha = 0.18 * Math.sin(Math.PI * span(t, 0.6, 1.8));
    face.scale.set((unit / 128) * 0.25, (unit / 128) * 0.35);
    embers.step(dt);
    return t < 1.9 || embers.list.length > 0;
  });
  await done();
}

export async function luminalScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const heads: Pt[] = [at(0.42, 0.155), at(0.575, 0.17)];
  const tube = [0.45, 0.26, 0.56, 0.4] as const;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = span(t, 0, 0.3) * (1 - span(t, 1.5, 1.9));
    heads.forEach((h, j) => {
      const r = unit * 0.07;
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + (i * Math.PI) / 4 + j;
        g.ellipse(h[0], h[1], Math.max(0.5, Math.abs(Math.cos(a)) * r), r).stroke({ width: 1, color: 0x8affa8, alpha: 0.35 * fade });
      }
      g.ellipse(h[0], h[1], r, r * 0.25).stroke({ width: 1, color: 0x8affa8, alpha: 0.3 * fade });
    });
    const [u0, v0, u1, v1] = tube;
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.8 + i / 4) % 1;
      const v = v1 - (v1 - v0) * k;
      g.moveTo(...at(u0, v))
        .lineTo(...at(u1, v))
        .stroke({ width: 1.5, color: 0xffb0d8, alpha: 0.5 * Math.sin(Math.PI * k) * fade });
    }
    if (t < 1.4 && Math.random() < 0.35) {
      const h = heads[Math.floor(rnd(0, 2))];
      motes.add(sparkTexture(), ...lerp(at(rnd(u0, u1), v0), h, 0), { vx: (h[0] - at(0.5, v0)[0]) * 1.4, vy: (h[1] - at(0.5, v0)[1]) * 1.4, life: 0.6, tint: 0xb8ffc8, scale: (unit / 180) * 0.16 });
    }
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

export async function offworldOfficeScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const table = at(0.5, 0.31);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const lights = Array.from({ length: 16 }, () => ({ s: glowSprite(fx, sparkTexture(), Math.random() < 0.5 ? 0xbfe4ff : 0xffe8b0), p: at(rnd(0.25, 0.75), rnd(0.12, 0.22)), d: rnd(0, 1.2) }));
  const data = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.1 + i * 0.35, 0.9 + i * 0.35);
      if (k <= 0 || k >= 1) continue;
      g.ellipse(table[0], table[1], rect.width * 0.16 * ease.out(k), rect.height * 0.03 * ease.out(k)).stroke({ width: 2, color: 0x6ad0ff, alpha: 0.9 * (1 - k) * fade });
    }
    if (t < 1.4 && Math.random() < 0.4) data.add(dotTexture(), table[0] + rnd(-1, 1) * rect.width * 0.12, table[1] + rnd(-0.5, 0.5) * rect.height * 0.02, { vy: -unit * rnd(0.08, 0.16), life: 0.7, tint: 0x8fe0ff, scale: (unit / 180) * 0.25, alpha: 0.8 });
    for (const l of lights) {
      const f = Math.sin(Math.PI * span(t, l.d, l.d + 0.5));
      l.s.position.set(...l.p);
      l.s.alpha = 0.7 * f;
      l.s.scale.set((unit / 120) * 0.22 * f);
    }
    data.step(dt);
    return t < 1.9 || data.list.length > 0;
  });
  await done();
}

export async function orbitalScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const starts: Pt[] = [at(0.411, 0.223), at(0.417, 0.235), at(0.417, 0.246)];
  const ends: Pt[] = [at(0.583, 0.272), at(0.667, 0.314), at(0.839, 0.397)];
  const hit = ends[2];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const flare = glowSprite(fx, glowTexture(), 0xff7a2a);
  flare.position.set(...hit);
  const panel = glowSprite(fx, sparkTexture(), 0xdfe8ff);
  panel.position.set(...at(0.57, 0.15));
  const embers = new Emitter(fx);
  const smoke = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const gl = Math.sin(Math.PI * span(t, 0, 0.4));
    panel.alpha = 0.8 * gl;
    panel.scale.set((unit / 120) * 0.3 * gl);
    starts.forEach((s, i) => {
      const k = span(t, 0.25 + i * 0.08, 0.5 + i * 0.08);
      const off = 1 - span(t, 0.9 + i * 0.08, 1.2 + i * 0.08);
      if (k <= 0 || off <= 0) return;
      const tip = lerp(s, ends[i], ease.out(k));
      g.moveTo(...s)
        .lineTo(...tip)
        .stroke({ width: unit * 0.018, color: 0xff6a1a, alpha: 0.35 * off });
      g.moveTo(...s)
        .lineTo(...tip)
        .stroke({ width: 1.2, color: 0xffd08a, alpha: 0.85 * off });
    });
    const burn = span(t, 0.5, 0.7) * fade;
    flare.alpha = 0.45 * burn * (0.8 + 0.2 * Math.sin(t * 30));
    flare.scale.set((unit / 128) * 0.18);
    if (burn > 0 && t < 1.3) {
      if (Math.random() < 0.7) embers.add(sparkTexture(), hit[0], hit[1], { vx: rnd(-1, 1) * unit * 0.4, vy: -unit * rnd(0.1, 0.5), gravity: unit * 0.8, life: 0.5, tint: Math.random() < 0.4 ? 0xffd08a : 0xff6a1a, scale: (unit / 180) * 0.18 });
      if (Math.random() < 0.25) smoke.puff(hit[0], hit[1], { vx: unit * 0.05, vy: -unit * 0.12, size: unit * 0.08, life: 1, grow: 2.2, tint: 0x6a5048, alpha: 0.35 });
    }
    if (burn > 0) ellipse(g, hit, unit * 0.12 * burn, unit * 0.035 * burn, 0, Math.PI * 2, 24).stroke({ width: 1, color: 0xff8a3a, alpha: 0.5 * fade });
    embers.step(dt);
    smoke.step(dt);
    return t < 1.9 || embers.list.length > 0 || smoke.list.length > 0;
  });
  await done();
}

export async function projectIngatanScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const quads: [Pt, Pt, Pt, Pt][] = [
    [at(0.45, 0.235), at(0.578, 0.181), at(0.624, 0.248), at(0.492, 0.318)],
    [at(0.689, 0.199), at(0.778, 0.158), at(0.802, 0.211), at(0.708, 0.246)],
    [at(0.05, 0.373), at(0.178, 0.335), at(0.222, 0.397), at(0.094, 0.433)],
    [at(0.32, 0.405), at(0.439, 0.349), at(0.464, 0.417), at(0.344, 0.476)],
  ];
  const panels: Pt[] = quads.map((q) => lerp(lerp(q[0], q[1], 0.5), lerp(q[3], q[2], 0.5), 0.5));
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    panels.forEach((c, i) => {
      const k = span(t, 0.1 + i * 0.2, 0.7 + i * 0.2);
      if (k <= 0) return;
      const q = quads[i];
      g.poly(q.flat()).stroke({ width: 1.2, color: 0xc8ff6a, alpha: 0.75 * Math.min(1, k * 3) * fade });
      if (k < 1) {
        const x = ease.inOut(k);
        g.moveTo(...lerp(q[0], q[1], x))
          .lineTo(...lerp(q[3], q[2], x))
          .stroke({ width: 1.6, color: 0xeaffc0, alpha: 0.8 * fade });
      }
      if (i > 0) {
        const p = panels[i - 1];
        const e = span(t, 0.3 + i * 0.2, 0.7 + i * 0.2);
        if (e > 0) {
          g.moveTo(...p)
            .lineTo(...lerp(p, c, e))
            .stroke({ width: 1, color: 0xc8ff6a, alpha: 0.3 * fade });
          if (e < 1) motes.add(sparkTexture(), ...lerp(p, c, e), { life: 0.3, tint: 0xd8ff8a, scale: (unit / 180) * 0.2, grow: -0.5 });
        }
      }
    });
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

export async function superconductingHubScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.48, 0.27);
  const R = rect.width * 0.28;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const pulses = Array.from({ length: 5 }, (_, i) => ({ s: glowSprite(fx, dotTexture(), 0xfff0c8), w: 0.3 + i * 0.18, d: i * 0.12 }));
  const streaks = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = span(t, 0, 0.3) * (1 - span(t, 1.5, 1.9));
    for (const p of pulses) {
      const rx = R * p.w;
      const grow = ease.out(span(t, p.d, p.d + 0.5));
      ellipse(g, c, rx * grow, R * 1.05, -Math.PI / 2, Math.PI / 2, 24).stroke({ width: 1.2, color: 0xffc070, alpha: 0.55 * fade });
      ellipse(g, c, rx * grow, R * 1.05, Math.PI / 2, (Math.PI * 3) / 2, 24).stroke({ width: 1, color: 0xffc070, alpha: 0.2 * fade });
      const a = -Math.PI / 2 + ((t * 1.3 + p.d) % 1) * Math.PI;
      p.s.position.set(c[0] + Math.cos(a) * rx * grow, c[1] + Math.sin(a) * R * 1.05);
      p.s.alpha = 0.8 * fade * grow;
      p.s.scale.set((unit / 180) * 0.3);
    }
    if (t < 1.4 && Math.random() < 0.5) streaks.add(sparkTexture(), ...at(rnd(0.1, 0.5), rnd(0.12, 0.45)), { vx: unit * rnd(0.6, 1), life: 0.35, tint: 0xffb060, scale: (unit / 180) * 0.15, alpha: 0.7 });
    streaks.step(dt);
    return t < 1.9 || streaks.list.length > 0;
  });
  await done();
}

export async function nextBigThingScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const logo = at(0.495, 0.37);
  const rays = new GodrayFilter({ angle: 0, gain: 0.45, lacunarity: 2.5, alpha: 0, parallel: false, center: { x: 0, y: 0 } });
  card.filters = [rays];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const bokeh = new Emitter(fx);
  const confetti = new Emitter(fx);
  const colors = [0xff6ad0, 0x6ad0ff, 0xffe08a, 0xc08aff];
  let pop = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const f = Math.sin(Math.PI * span(t, 0, 1.9));
    const p = filterPoint(card, logo[0], logo[1]);
    rays.center = { x: p.x, y: p.y };
    rays.alpha = 0.45 * f;
    rays.time = t;
    for (const [base, color, ph] of [
      [at(0.15, 0.48), 0xff6ad0, 0],
      [at(0.85, 0.48), 0x6ad0ff, 2],
      [at(0.5, 0.5), 0xc08aff, 4],
    ] as const) {
      const a = -Math.PI / 2 + 0.55 * Math.sin(t * 2.4 + ph);
      const L = unit * 0.5;
      const tip: Pt = [base[0] + Math.cos(a) * L, base[1] + Math.sin(a) * L];
      const n: Pt = [-Math.sin(a) * unit * 0.07, Math.cos(a) * unit * 0.07];
      g.poly([...base, tip[0] + n[0], tip[1] + n[1], tip[0] - n[0], tip[1] - n[1]]).fill({ color, alpha: 0.14 * f });
    }
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.9 + i / 2) % 1;
      g.circle(...logo, unit * (0.04 + 0.1 * k)).stroke({ width: 1.2, color: 0xe0f4ff, alpha: 0.6 * (1 - k) * f });
    }
    if (t < 1.5 && Math.random() < 0.5) bokeh.add(glowTexture(), ...at(rnd(0.05, 0.95), rnd(0.1, 0.45)), { vy: -unit * 0.05, life: 0.8, tint: colors[Math.floor(rnd(0, 4))], scale: (unit / 128) * rnd(0.03, 0.06), alpha: 0.55 });
    if (!pop && t > 0.5) {
      pop = true;
      for (let i = 0; i < 28; i++) confetti.add(dotTexture(), ...at(rnd(0.15, 0.85), 0.08), { vx: rnd(-1, 1) * unit * 0.2, vy: unit * rnd(0.05, 0.3), gravity: unit * 0.4, spin: rnd(-6, 6), life: 1.2, tint: colors[i % 4], scale: (unit / 180) * rnd(0.2, 0.35), blend: "normal", alpha: 0.9 });
    }
    bokeh.step(dt);
    confetti.step(dt);
    return t < 1.9 || confetti.list.length > 0;
  });
  card.filters = [];
  await done();
}
