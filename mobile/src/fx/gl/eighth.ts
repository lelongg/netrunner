import { Graphics } from "pixi.js";
import { GlowFilter, GodrayFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, WHITE, billTexture, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";

const panelTexture = () =>
  painted("s8-panel", 40, 28, (g) => {
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(2, 2, 36, 24, 4);
    g.fill();
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.7)";
    g.fillRect(8, 9, 18, 2);
    g.fillRect(8, 15, 24, 2);
  });

function arcFrom(g: Graphics, c: Pt, rx: number, ry: number, a0: number, a1: number, n = 32) {
  g.moveTo(c[0] + Math.cos(a0) * rx, c[1] + Math.sin(a0) * ry);
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    g.lineTo(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry);
  }
  return g;
}

export async function luminalScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const orbs = [at(0.43, 0.17), at(0.58, 0.19)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x7aff9a);
    s.position.set(...p);
    return s;
  });
  const chamber = at(0.5, 0.37);
  const heat = glowSprite(fx, glowTexture(), 0xff8a6a);
  heat.position.set(...chamber);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const f = Math.sin(Math.PI * span(t, 0, 1.8));
    orbs.forEach((o, i) => {
      o.alpha = 0.6 * f * (0.8 + 0.2 * Math.sin(t * 6 + i * 2));
      o.scale.set((unit / 128) * 0.22);
    });
    heat.alpha = 0.45 * f;
    heat.scale.set((unit / 128) * 0.2, (unit / 128) * 0.3);
    if (t < 1.4 && Math.random() < 0.6) motes.add(sparkTexture(), chamber[0] + rnd(-1, 1) * unit * 0.05, chamber[1] + unit * 0.08, { vy: -unit * rnd(0.2, 0.4), life: 0.8, tint: Math.random() < 0.5 ? 0xffe0c0 : 0x9affb0, scale: (unit / 180) * 0.22 });
    motes.step(dt);
    return t < 1.8 || motes.list.length > 0;
  });
  await done();
}

export async function longevityScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const ring = at(0.3, 0.24);
  const sparks = Array.from({ length: 14 }, (_, i) => ({ s: glowSprite(fx, sparkTexture(), [0x9be8ff, 0xffb0e0, 0xfff0a0][i % 3]), ph: (i / 14) * Math.PI * 2 }));
  const renew = glowSprite(fx, glowTexture(), 0xfff4e0);
  renew.position.set(...at(0.83, 0.3));
  root.addChild(fx);
  await run(app, (t) => {
    const f = span(t, 0, 0.3) * (1 - span(t, 1.4, 1.8));
    for (const sp of sparks) {
      const a = sp.ph + t * 2.4;
      sp.s.position.set(ring[0] + Math.cos(a) * rect.width * 0.24, ring[1] + Math.sin(a) * rect.width * 0.17);
      sp.s.alpha = f * (0.5 + 0.5 * Math.sin(a * 2));
      sp.s.rotation = a;
      sp.s.scale.set((unit / 120) * 0.3);
    }
    renew.alpha = 0.45 * Math.sin(Math.PI * span(t, 0.4, 1.7));
    renew.scale.set((unit / 128) * 0.35);
    return t < 1.8;
  });
  await done();
}

export async function offworldOfficeScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const towers = Array.from({ length: 12 }, () => ({ u: rnd(0.3, 0.7), v: rnd(0.33, 0.42), h: rnd(0.04, 0.12), d: rnd(0, 0.6) }));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    for (const tw of towers) {
      const k = ease.back(span(t, tw.d, tw.d + 0.4));
      if (k <= 0) continue;
      const base = at(tw.u, tw.v);
      const top = at(tw.u, tw.v - tw.h * k);
      const w = unit * 0.012;
      g.rect(base[0] - w, top[1], w * 2, base[1] - top[1])
        .fill({ color: 0x6ad8ff, alpha: 0.2 * fade })
        .stroke({ width: 1, color: 0xc0f0ff, alpha: 0.75 * fade });
    }
    return t < 1.8;
  });
  await done();
}

export async function orbitalScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const from = at(0.48, 0.24);
  const to = at(0.84, 0.43);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const flare = glowSprite(fx, glowTexture(), 0xff8a2a);
  flare.position.set(...to);
  const embers = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.1 + i * 0.3, 0.4 + i * 0.3);
      if (k <= 0 || k >= 1) continue;
      const head = lerp(from, to, ease.out(k));
      const tail = lerp(from, to, Math.max(0, ease.out(k) - 0.35));
      const off = (i - 1) * unit * 0.015;
      g.moveTo(tail[0], tail[1] + off)
        .lineTo(head[0], head[1] + off)
        .stroke({ width: unit * 0.025, color: 0xff7a2a, alpha: 0.45 });
      g.moveTo(tail[0], tail[1] + off)
        .lineTo(head[0], head[1] + off)
        .stroke({ width: 1.6, color: 0xffe0b0, alpha: 0.95 });
      if (k > 0.9) for (let n = 0; n < 4; n++) embers.add(sparkTexture(), ...to, { vx: rnd(-1, 1) * unit * 0.5, vy: -unit * rnd(0.1, 0.6), gravity: unit, life: 0.5, tint: 0xffa04a, scale: (unit / 180) * 0.25 });
    }
    flare.alpha = 0.6 * Math.max(0, Math.sin(Math.PI * span(t, 0.35, 1.4)));
    flare.scale.set((unit / 128) * 0.25);
    embers.step(dt);
    return t < 1.5 || embers.list.length > 0;
  });
  await done();
}

export async function sendAMessage(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const ghost = at(0.5, 0.17);
  const halo = glowSprite(fx, glowTexture(), 0xe0e8ff);
  halo.position.set(...ghost);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const ends: Pt[] = [at(0.32, 0.45), at(0.7, 0.42), at(0.82, 0.3), at(0.2, 0.3)];
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const on = span(t, 0.05, 0.2) * (1 - span(t, 1.3, 1.7));
    halo.alpha = 0.5 * on;
    halo.scale.set((unit / 128) * 0.35, (unit / 128) * 0.5);
    if (on > 0 && Math.floor(t * 20) % 3 !== 0) {
      const e = ends[Math.floor(rnd(0, ends.length))];
      lightning(g, ghost[0] + rnd(-1, 1) * unit * 0.05, ghost[1] + unit * 0.08, e[0], e[1], unit * 0.15, 0xb08aff, unit * 0.005);
    }
    return t < 1.7;
  });
  await done();
}

export async function superconductingHubScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.45, 0.26);
  const core = glowSprite(fx, glowTexture(), 0xffa040);
  core.position.set(...c);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const orbits = [0.2, 0.75, -0.5].map((tilt, i) => ({ tilt, r: rect.width * (0.26 + i * 0.04), speed: 4 + i }));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const on = span(t, 0, 0.3) * (1 - span(t, 1.4, 1.8));
    core.alpha = 0.45 * on;
    core.scale.set((unit / 128) * 0.45);
    for (const o of orbits) {
      const a = t * o.speed;
      const pts: number[] = [];
      for (let i = 0; i <= 10; i++) {
        const b = a - i * 0.08;
        const x = Math.cos(b) * o.r;
        const y = Math.sin(b) * o.r * 0.3;
        pts.push(c[0] + x * Math.cos(o.tilt) - y * Math.sin(o.tilt), c[1] + x * Math.sin(o.tilt) + y * Math.cos(o.tilt));
      }
      g.poly(pts, false).stroke({ width: 1.8, color: 0xffd08a, alpha: 0.85 * on, cap: "round" });
    }
    return t < 1.8;
  });
  await done();
}

export async function aggressiveTrendsettingScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const flashes = new Emitter(fx);
  const glow = new GlowFilter({ color: 0x8af0ff, distance: 8, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  root.addChild(fx);
  await run(app, (t, dt) => {
    if (t < 1.3 && Math.random() < 0.18) {
      const p = at(rnd(0.05, 0.95), rnd(0.12, 0.48));
      flashes.add(sparkTexture(), ...p, { life: 0.25, tint: WHITE, scale: (unit / 180) * rnd(0.7, 1.1), grow: -1 });
      flashes.add(glowTexture(), ...p, { life: 0.25, tint: 0xfff0e0, scale: (unit / 128) * 0.12, alpha: 0.6 });
    }
    glow.outerStrength = 1.2 * Math.sin(Math.PI * span(t, 0.2, 1.6));
    flashes.step(dt);
    return t < 1.7 || flashes.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function projectIngatanScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const spots: Pt[] = [at(0.6, 0.2), at(0.5, 0.37), at(0.12, 0.37), at(0.3, 0.3)];
  const panes = spots.map((p, i) => ({ s: glowSprite(fx, panelTexture(), 0x9aff6a), p, ph: i * 1.3 }));
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const on = span(t, 0, 0.3) * (1 - span(t, 1.4, 1.8));
    panes.forEach((pn, i) => {
      const dy = Math.sin(t * 2 + pn.ph) * unit * 0.015;
      pn.s.position.set(pn.p[0], pn.p[1] + dy);
      pn.s.alpha = 0.55 * on * (Math.random() < 0.05 ? 0.3 : 1);
      pn.s.scale.set((unit / 180) * 1.1);
      pn.s.rotation = -0.2 + 0.05 * Math.sin(t + i);
    });
    const k = span(t, 0.3, 1.1);
    for (let i = 0; i < panes.length - 1; i++) {
      const a = panes[i].s.position;
      const b = panes[i + 1].s.position;
      const e = Math.min(1, Math.max(0, k * 3 - i));
      if (e <= 0) continue;
      g.moveTo(a.x, a.y)
        .lineTo(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e)
        .stroke({ width: 1, color: 0x9aff6a, alpha: 0.6 * on });
    }
    return t < 1.8;
  });
  await done();
}

export async function proprionegationScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.4, 0.2);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = span(t, 0, 0.2) * (1 - span(t, 1.4, 1.8));
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.6 + i / 6) % 1;
      const s = unit * 0.5 * (1 - k);
      const rot = 0.6 + k * 1.5;
      const pts: number[] = [];
      for (let j = 0; j < 4; j++) {
        const a = rot + (j * Math.PI) / 2;
        pts.push(c[0] + Math.cos(a) * s, c[1] + Math.sin(a) * s);
      }
      g.poly(pts).stroke({ width: 1.4, color: i % 2 ? 0xff5ab0 : 0x5ae8ff, alpha: 0.7 * fade * Math.sin(Math.PI * k) });
    }
    return t < 1.8;
  });
  await done();
}

export async function sericultureScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    const k = ease.out(span(t, 0, 1.2));
    for (const ph of [0, Math.PI]) {
      const pts: number[] = [];
      const n = Math.max(2, Math.floor(40 * k));
      for (let i = 0; i <= n; i++) {
        const s = i / 40;
        const v = 0.44 - s * 0.36;
        const w = 0.07 * (1 - s * 0.6);
        pts.push(...at(0.52 + w * Math.sin(s * 20 + ph + t * 3), v));
      }
      g.poly(pts, false).stroke({ width: 1.2, color: 0xf0e6b0, alpha: 0.8 * fade });
    }
    return t < 1.8;
  });
  await done();
}

export async function embeddedReportingScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const rec = at(0.2, 0.24);
  const frame = [0.48, 0.08, 0.92, 0.46] as const;
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    const k = ease.out(span(t, 0, 0.5));
    const [u0, v0, u1, v1] = frame;
    const shrink = 0.06 * (1 - k);
    const L = 0.06;
    const corners: [number, number, number, number][] = [
      [u0 - shrink, v0 - shrink, 1, 1],
      [u1 + shrink, v0 - shrink, -1, 1],
      [u0 - shrink, v1 + shrink, 1, -1],
      [u1 + shrink, v1 + shrink, -1, -1],
    ];
    for (const [u, v, du, dv] of corners) {
      g.moveTo(...at(u + du * L, v))
        .lineTo(...at(u, v))
        .lineTo(...at(u, v + dv * L));
    }
    g.stroke({ width: 1.6, color: WHITE, alpha: 0.85 * fade * k });
    if (Math.floor(t * 3) % 2 === 0) g.circle(...rec, unit * 0.018).fill({ color: 0xff3030, alpha: 0.95 * fade });
    return t < 1.8;
  });
  await done();
}

export async function nextBigThingScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const stage = at(0.5, 0.48);
  const rays = new GodrayFilter({ angle: 0, gain: 0.45, lacunarity: 2.5, alpha: 0, parallel: false, center: { x: 0, y: 0 } });
  card.filters = [rays];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const f = Math.sin(Math.PI * span(t, 0, 1.8));
    const p = filterPoint(card, stage[0], stage[1]);
    rays.center = { x: p.x, y: p.y };
    rays.alpha = 0.5 * f;
    rays.time = t;
    for (const [base, color, ph] of [
      [at(0.2, 0.48), 0xff6ad0, 0],
      [at(0.8, 0.48), 0x6ad0ff, 2],
    ] as const) {
      const a = -Math.PI / 2 + 0.5 * Math.sin(t * 2.5 + ph);
      const L = unit * 0.5;
      const tip: Pt = [base[0] + Math.cos(a) * L, base[1] + Math.sin(a) * L];
      g.poly([...base, tip[0] - Math.sin(a) * unit * 0.08, tip[1] + Math.cos(a) * unit * 0.08, tip[0] + Math.sin(a) * unit * 0.08, tip[1] - Math.cos(a) * unit * 0.08]).fill({ color, alpha: 0.18 * f });
    }
    return t < 1.8;
  });
  card.filters = [];
  await done();
}

export async function greenmailScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const cash = at(0.3, 0.39);
  const bills = new Emitter(fx);
  const glow = glowSprite(fx, glowTexture(), 0x6aff8a);
  glow.position.set(...cash);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const f = Math.sin(Math.PI * span(t, 0, 1.6));
    glow.alpha = 0.45 * f;
    glow.scale.set((unit / 128) * 0.25);
    if (t < 1.1 && Math.random() < 0.3) bills.add(billTexture(), cash[0] + rnd(-1, 1) * unit * 0.06, cash[1], { vx: rnd(-1, 1) * unit * 0.2, vy: -unit * rnd(0.3, 0.55), gravity: unit * 0.35, spin: rnd(-3, 3), life: 1, scale: (unit / 180) * rnd(0.22, 0.3), blend: "normal", alpha: 0.9 });
    bills.step(dt);
    return t < 1.6 || bills.list.length > 0;
  });
  await done();
}

export async function offTheBooksScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hands = at(0.6, 0.4);
  const pages = Array.from({ length: 6 }, (_, i) => ({ s: glowSprite(fx, panelTexture(), 0x7ac8ff), d: i * 0.15 }));
  root.addChild(fx);
  await run(app, (t) => {
    pages.forEach((pg, i) => {
      const k = span(t, pg.d, pg.d + 0.6);
      const e = ease.out(k);
      pg.s.position.set(hands[0] + (i % 2 ? 1 : -1) * unit * 0.05 * e, hands[1] - unit * 0.18 * e);
      pg.s.alpha = k > 0 && k < 1 ? 0.85 * Math.sin(Math.PI * k) : 0;
      pg.s.scale.set((unit / 180) * (0.9 + 0.2 * e), (unit / 180) * (0.9 + 0.2 * e) * Math.abs(Math.cos(k * Math.PI * 1.5)) + 0.01);
    });
    return t < 1.8;
  });
  await done();
}
