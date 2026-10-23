import { Graphics } from "pixi.js";
import { GlitchFilter, GlowFilter, RGBSplitFilter } from "pixi-filters";
import { Emitter, ease, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, CYAN, Fire, GOLD, GREEN, RED, type Ready, Smoke, VIOLET, WHITE, burst, flyHome, homing, painted, petalTexture, pt, scene } from "./kit";
import { type Pt, cubeTexture, glowSprite, lerp, pose, prism, quad, rnd, strikeFx, tether } from "./more";

const AURORA = [0x5affc8, 0x5ad8ff, 0xb68bff];

const wingTexture = () =>
  painted("wing", 40, 16, (g) => {
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.beginPath();
    g.ellipse(10, 8, 9, 4, 0, 0, Math.PI * 2);
    g.ellipse(30, 8, 9, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.fillRect(18, 5, 4, 6);
  });

const sliverTexture = () =>
  painted("sliver", 24, 6, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 1, 24, 4);
  });

export async function pennyshaver(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const coin = at(0.3, 0.33);
  const screens: Pt[] = [at(0.58, 0.18), at(0.72, 0.38), at(0.82, 0.3)];
  const slivers = new Emitter(fx);
  const glow = glowSprite(fx, glowTexture(), CYAN);
  glow.position.set(...coin);
  root.addChild(fx);
  const flights = Array.from({ length: 9 }, (_, i) => homing(fx, sliverTexture(), screens[i % 3], coin, 0.15 + i * 0.1, 0x4fc8e8, unit / 360, rnd(-1, 1) * unit * 0.15));
  await run(app, (t, dt) => {
    for (const f of flights) f.s.rotation = Math.atan2(coin[1] - f.y0, coin[0] - f.x0);
    const landed = flyHome(flights, t, slivers, CYAN);
    glow.alpha = (0.15 + 0.03 * landed) * (1 - span(t, 1.6, 2));
    glow.scale.set((unit / 128) * (0.12 + 0.01 * landed));
    slivers.step(dt);
    return t < 2 || slivers.list.length > 0;
  });
  await done();
}

export async function mayflyPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const fly = at(0.6, 0.38);
  const cracks = new Graphics();
  cracks.blendMode = "add";
  fx.addChild(cracks);
  const spark = glowSprite(fx, sparkTexture(), WHITE);
  spark.position.set(...fly);
  const rays = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + rnd(-0.2, 0.2);
    const pts: Pt[] = [fly];
    let p = fly;
    for (let s = 0; s < 5; s++) {
      const b = a + rnd(-0.35, 0.35);
      p = [p[0] + Math.cos(b) * unit * 0.08, p[1] + Math.sin(b) * unit * 0.08];
      pts.push(p);
    }
    return pts;
  });
  root.addChild(fx);
  await run(app, (t) => {
    const k = ease.out(span(t, 0.1, 0.6));
    const fade = 1 - span(t, 1.3, 1.7);
    cracks.clear();
    for (const r of rays) {
      const n = Math.max(1, Math.round((r.length - 1) * k));
      cracks.moveTo(...r[0]);
      for (let i = 1; i <= n; i++) cracks.lineTo(...r[i]);
      cracks.stroke({ width: 1.4, color: 0xdff6ff, alpha: 0.9 * fade });
    }
    const f = Math.sin(Math.PI * span(t, 0, 0.5));
    spark.alpha = f;
    spark.rotation = t * 2;
    spark.scale.set((unit / 120) * 0.6 * f);
    return t < 1.7;
  });
  await done();
}

export async function mayfly(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at } = sc;
  const fly = at(0.6, 0.38);
  const spark = glowSprite(fx, sparkTexture(), WHITE);
  spark.position.set(...fly);
  root.addChild(fx);
  const impact = strikeFx(sc, "bolts", 0xdff6ff, fly);
  await run(
    app,
    (t) => {
      const f = Math.sin(Math.PI * span(t, 0, 0.6));
      spark.alpha = f;
      spark.scale.set((unit / 120) * 0.5 * f);
      return t < 0.6;
    },
    sc.strike ? 1.3 : 1,
  );
  await impact;
  await done();
}

export async function idiosyncresis(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.53, 0.2);
  const glitch = new GlitchFilter({ slices: 10, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [glitch];
  const bits = new Emitter(fx);
  const iris = glowSprite(fx, glowTexture(), WHITE);
  iris.position.set(...eye);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = Math.sin(Math.PI * span(t, 0, 1.6));
    glitch.offset = Math.random() < 0.15 * on ? unit * 0.04 : 0;
    glitch.seed = Math.random();
    iris.alpha = 0.7 * on;
    iris.scale.set((unit / 128) * 0.08);
    if (on > 0.2)
      for (let n = 0; n < 2; n++) {
        const d = rnd(0, 1);
        bits.add(sliverTexture(), eye[0] + unit * 0.05, eye[1] + rnd(-1, 1) * unit * 0.03, { vx: unit * rnd(0.5, 0.9), vy: -unit * rnd(0, 0.15), life: 0.6, tint: d < 0.5 ? 0xb6ff5a : 0xffd84a, scale: (unit / 180) * rnd(0.2, 0.4), alpha: 0.9 });
      }
    for (const b of bits.list) b.s.rotation = Math.atan2(b.vy, b.vx);
    bits.step(dt);
    return t < 1.7 || bits.list.length > 0;
  });
  await done();
}

export async function stowawayPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const urchins: [Pt, number][] = [
    [at(0.6, 0.25), 1],
    [at(0.2, 0.18), 0.5],
    [at(0.27, 0.41), 0.45],
  ];
  const spines = new Graphics();
  spines.blendMode = "add";
  fx.addChild(spines);
  const vine = new Graphics();
  vine.blendMode = "add";
  fx.addChild(vine);
  const host = board?.host ? pt(board.host) : null;
  root.addChild(fx);
  await run(app, (t) => {
    spines.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    urchins.forEach(([c, s], i) => {
      const p = 0.5 + 0.5 * Math.sin(t * 6 + i * 2);
      for (let n = 0; n < 12; n++) {
        const a = (n / 12) * Math.PI * 2 + t * 0.5;
        const r0 = unit * 0.05 * s;
        const r1 = unit * (0.12 + 0.04 * p) * s;
        spines.moveTo(c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0).lineTo(c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1);
      }
      spines.stroke({ width: 1.5, color: 0xffb347, alpha: 0.75 * fade * span(t, 0, 0.3) });
    });
    vine.clear();
    if (host) tether(vine, urchins[0][0], host, ease.inOut(span(t, 0.3, 1)), 0xffb347, unit * 0.008, fade, unit * 0.03, t);
    return t < 1.9;
  });
  await done();
}

export async function malapertDataVault(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sweep = new Graphics();
  sweep.blendMode = "add";
  fx.addChild(sweep);
  const tip = glowSprite(fx, sparkTexture(), WHITE);
  tip.position.set(...at(0.45, 0.26));
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    sweep.clear();
    const k = ease.inOut(span(t, 0.1, 1.2));
    if (k > 0 && k < 1) {
      const u = -0.05 + 1.1 * k;
      quad(sweep, at, u - 0.06, 0.08, u + 0.06, 0.48).fill({ color: 0x9bffe0, alpha: 0.12 });
      quad(sweep, at, u - 0.005, 0.08, u + 0.005, 0.48).fill({ color: WHITE, alpha: 0.5 });
      if (Math.random() < 0.7) motes.add(cubeTexture(), ...at(u, rnd(0.2, 0.46)), { vy: -unit * 0.05, life: 0.5, tint: Math.random() < 0.5 ? 0x9bffe0 : 0xffb0d8, scale: (unit / 180) * 0.2, alpha: 0.6 });
    }
    const g = Math.sin(Math.PI * span(t, 1, 1.6));
    tip.alpha = g;
    tip.rotation = t;
    tip.scale.set((unit / 120) * 0.4 * g);
    motes.step(dt);
    return t < 1.7 || motes.list.length > 0;
  });
  await done();
}

export async function vultureFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const holo = at(0.22, 0.4);
  const shadow = new Graphics();
  fx.addChild(shadow);
  const glow = glowSprite(fx, glowTexture(), RED);
  glow.position.set(...holo);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    shadow.clear();
    const k = span(t, 0.1, 1.7);
    const [x, y] = at(-0.15 + 1.3 * k, 0.12 + 0.03 * Math.sin(k * 6));
    shadow.ellipse(x, y, unit * 0.16, unit * 0.035).fill({ color: 0x06141a, alpha: 0.4 * Math.sin(Math.PI * k) });
    shadow.poly([x - unit * 0.02, y - unit * 0.02, x + unit * 0.04, y - unit * 0.09, x + unit * 0.06, y - unit * 0.02]).fill({ color: 0x06141a, alpha: 0.4 * Math.sin(Math.PI * k) });
    glow.alpha = (Math.random() < 0.1 ? 0.2 : 0.55) * (1 - span(t, 1.6, 2));
    glow.scale.set((unit / 128) * 0.18);
    if (t < 1.5 && Math.random() < 0.4) motes.add(glowTexture(), ...at(rnd(0, 1), rnd(0.05, 0.45)), { vy: -unit * rnd(0.05, 0.12), life: 1.2, tint: 0xbff6ff, scale: (unit / 128) * rnd(0.01, 0.02) });
    motes.step(dt);
    return t < 2 || motes.list.length > 0;
  });
  await done();
}

export async function synchrocyclotron(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.5, 0.27);
  const beams = [
    { a: 0, w: 1, s: glowSprite(fx, sparkTexture(), CYAN) },
    { a: Math.PI, w: -1, s: glowSprite(fx, sparkTexture(), 0xff6ad0) },
  ];
  const trail = new Emitter(fx);
  const flash = glowSprite(fx, glowTexture(), WHITE);
  flash.position.set(...c);
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  root.addChild(fx);
  let hit = false;
  await run(app, (t, dt) => {
    const speed = 3 + 25 * ease.inOut(span(t, 0, 1.1));
    const r = unit * 0.32 * (1 - 0.85 * ease.inOut(span(t, 0.6, 1.15)));
    for (const b of beams) {
      b.a += b.w * speed * dt;
      const p: Pt = [c[0] + Math.cos(b.a) * r, c[1] + Math.sin(b.a) * r];
      b.s.position.set(...p);
      b.s.alpha = t < 1.15 ? 1 : 0;
      b.s.scale.set((unit / 120) * 0.3);
      if (t < 1.15) trail.add(sparkTexture(), ...p, { life: 0.25, tint: b.s.tint, scale: 0.2 * (unit / 180), grow: -0.5 });
    }
    if (t > 1.15 && !hit) {
      hit = true;
      burst(trail, ...c, 30, WHITE, unit * 1.6, { life: 0.5, scale: 0.3 });
      navigator.vibrate?.(30);
    }
    flash.alpha = Math.max(0, 1 - Math.abs(t - 1.2) / 0.2) * 0.7;
    flash.scale.set((unit / 128) * 0.4);
    rings.clear();
    const rk = span(t, 1.15, 1.7);
    if (rk > 0 && rk < 1) rings.circle(...c, unit * (0.05 + 0.4 * ease.out(rk))).stroke({ width: 2 * (1 - rk) + 1, color: 0xffd84a, alpha: 1 - rk });
    trail.step(dt);
    return t < 1.75 || trail.list.length > 0;
  });
  await done();
}

export async function cultivate(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const crown = at(0.48, 0.27);
  const leaves = new Emitter(fx);
  const halo = glowSprite(fx, glowTexture(), 0x9dff7a);
  halo.position.set(...crown);
  const snip = glowSprite(fx, sparkTexture(), WHITE);
  snip.position.set(...at(0.36, 0.48));
  root.addChild(fx);
  await run(app, (t, dt) => {
    halo.alpha = 0.35 * Math.sin(Math.PI * span(t, 0.2, 1.9));
    halo.scale.set((unit / 128) * 0.45, (unit / 128) * 0.3);
    if (t > 0.3 && t < 1.6 && Math.random() < 0.6) {
      const a = rnd(0, Math.PI * 2);
      leaves.add(glowTexture(), crown[0] + Math.cos(a) * unit * 0.25, crown[1] + Math.sin(a) * unit * 0.1, { vx: rnd(-6, 6), vy: -unit * rnd(0.04, 0.1), life: 1, tint: Math.random() < 0.7 ? 0x9dff7a : 0xfff6a0, scale: (unit / 128) * rnd(0.015, 0.03) });
    }
    const s = Math.sin(Math.PI * span(t, 0, 0.35));
    snip.alpha = s;
    snip.rotation = t * 3;
    snip.scale.set((unit / 120) * 0.3 * s);
    leaves.step(dt);
    return t < 1.9 || leaves.list.length > 0;
  });
  await done();
}

export async function vrcation(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const visor = at(0.6, 0.25);
  const glow = glowSprite(fx, glowTexture(), 0x9be8ff);
  glow.position.set(...visor);
  const waves = new Graphics();
  waves.blendMode = "add";
  fx.addChild(waves);
  const bubbles = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = Math.sin(Math.PI * span(t, 0, 1.9));
    glow.alpha = 0.7 * on;
    glow.scale.set((unit / 128) * 0.14, (unit / 128) * 0.06);
    waves.clear();
    for (let n = 0; n < 3; n++) {
      const v = 0.46 - n * 0.05;
      const pts: number[] = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        const [x, y] = at(u, v + 0.012 * Math.sin(u * 14 + t * 4 + n));
        pts.push(x, y);
      }
      waves.poly(pts, false).stroke({ width: 1.5, color: 0x6ad8ff, alpha: 0.5 * on * (1 - n * 0.25) });
    }
    card.tint = on > 0.3 ? 0xf0faff : WHITE;
    if (on > 0.3 && Math.random() < 0.3) bubbles.add(glowTexture(), ...at(rnd(0.05, 0.95), 0.45), { vy: -unit * rnd(0.1, 0.25), life: 1, tint: 0xbff6ff, scale: (unit / 128) * rnd(0.015, 0.03) });
    bubbles.step(dt);
    return t < 1.9 || bubbles.list.length > 0;
  });
  card.tint = WHITE;
  await done();
}

export async function nicoCampaign(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const model = glowSprite(fx, glowTexture(), 0xe8d8ff);
  model.position.set(...at(0.27, 0.27));
  const flashes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    model.alpha = 0.3 * Math.sin(Math.PI * span(t, 0, 1.8));
    model.scale.set((unit / 128) * 0.12, (unit / 128) * 0.3);
    if (t < 1.6 && Math.random() < 0.18) {
      const p = at(rnd(0.05, 0.95), rnd(0.42, 0.48));
      flashes.add(glowTexture(), ...p, { life: 0.18, tint: WHITE, scale: (unit / 128) * 0.12, grow: 0.5 });
      flashes.add(sparkTexture(), ...p, { life: 0.22, tint: WHITE, scale: (unit / 180) * 0.6, grow: -1 });
    }
    flashes.step(dt);
    return t < 1.8 || flashes.list.length > 0;
  });
  await done();
}

export async function merciaBallard(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const petals = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const k = ease.inOut(span(t, 0.1, 1.1));
    const v = 0.27 + 0.25 * k;
    const fade = 1 - span(t, 1.5, 1.9);
    if (k > 0 && k < 1)
      g.moveTo(...at(0.05, v))
        .lineTo(...at(0.75, v))
        .stroke({ width: 2, color: 0xbfe6ff, alpha: 0.9 });
    for (let i = 0; i < 8; i++) {
      const vv = 0.27 + (0.25 * i) / 8;
      if (vv > v) break;
      g.moveTo(...at(0.08, vv))
        .lineTo(...at(0.72, vv))
        .stroke({ width: 1, color: 0x9be8ff, alpha: 0.25 * fade });
    }
    if (t < 1.5 && Math.random() < 0.2) petals.add(petalTexture(), ...at(rnd(0.75, 0.98), rnd(0.12, 0.3)), { vx: -unit * 0.05, vy: unit * 0.08, spin: rnd(-2, 2), life: 1.2, tint: 0xd890ff, scale: (unit / 180) * 0.3, alpha: 0.8, blend: "normal" });
    petals.step(dt);
    return t < 1.9 || petals.list.length > 0;
  });
  await done();
}

export async function mitraAman(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hud = at(0.68, 0.33);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const drops = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.6, 2);
    const pts: number[] = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const ph = (u * 3 - t * 1.5) % 1;
      const beat = Math.abs(ph - 0.5) < 0.04 ? (ph < 0.5 ? -1 : 1) : 0;
      pts.push(hud[0] - unit * 0.18 + u * unit * 0.36, hud[1] + unit * 0.13 + beat * unit * 0.05);
    }
    g.poly(pts, false).stroke({ width: 1.5, color: 0x9be8ff, alpha: 0.9 * fade * span(t, 0, 0.3) });
    for (let i = 0; i < 3; i++) {
      const k = 0.5 + 0.5 * Math.sin(t * 5 + i * 2);
      g.circle(hud[0] - unit * 0.12 + i * unit * 0.1, hud[1] - unit * 0.08, unit * 0.035).stroke({ width: 1.5, color: 0x9be8ff, alpha: (0.3 + 0.6 * k) * fade });
    }
    if (t < 1.6 && Math.random() < 0.25) drops.add(glowTexture(), ...at(rnd(0.3, 0.5), rnd(0.13, 0.25)), { vy: unit * 0.06, life: 0.8, tint: 0xd8f0ff, scale: (unit / 128) * 0.015 });
    drops.step(dt);
    return t < 2 || drops.list.length > 0;
  });
  await done();
}

export async function hantuPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const ghost = at(0.64, 0.3);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const wisps = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const f = Math.random() < 0.12 ? 4 : 0;
    split.red = { x: -f, y: 0 };
    split.blue = { x: f, y: 0 };
    if (t < 1.5 && Math.random() < 0.4) wisps.puff(ghost[0] + rnd(-1, 1) * unit * 0.1, ghost[1] + rnd(-1, 1) * unit * 0.15, { vx: rnd(-1, 1) * unit * 0.1, vy: -unit * 0.08, life: 1.3, size: unit * 0.1, grow: 2, tint: 0x8a5aff, alpha: 0.45, add: true });
    wisps.step(dt);
    return t < 1.7 || wisps.list.length > 0;
  });
  await done();
}

export async function hantu(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at } = sc;
  const ghost = at(0.64, 0.3);
  const wisps = new Smoke(fx);
  root.addChild(fx);
  const impact = strikeFx(sc, "ribbons", VIOLET, ghost);
  await run(
    app,
    (t, dt) => {
      if (t < 0.5 && Math.random() < 0.6) wisps.puff(ghost[0], ghost[1], { vx: rnd(-1, 1) * unit * 0.2, vy: -unit * 0.1, life: 0.8, size: unit * 0.1, grow: 2, tint: 0x8a5aff, alpha: 0.5, add: true });
      wisps.step(dt);
      return t < 0.6 || wisps.list.length > 0;
    },
    sc.strike ? 1.3 : 1,
  );
  await impact;
  await done();
}

export async function magistrateRevontulet(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const aurora = new Graphics();
  aurora.blendMode = "add";
  fx.addChild(aurora);
  const crown = glowSprite(fx, sparkTexture(), GOLD);
  crown.position.set(...at(0.5, 0.23));
  root.addChild(fx);
  await run(app, (t) => {
    aurora.clear();
    const on = Math.sin(Math.PI * span(t, 0, 2));
    AURORA.forEach((c, n) => {
      for (let i = 0; i < 24; i++) {
        const u = 0.05 + (0.9 * i) / 24;
        const top = 0.08 + 0.04 * Math.sin(u * 8 + t * 2 + n);
        const h = 0.12 + 0.06 * Math.sin(u * 5 - t * 3 + n * 2);
        const [x0, y0] = at(u + n * 0.01, top);
        const [x1, y1] = at(u + n * 0.01, top + h);
        aurora
          .moveTo(x0, y0)
          .lineTo(x1, y1)
          .stroke({ width: unit * 0.03, color: c, alpha: 0.12 * on });
      }
    });
    const g = Math.sin(Math.PI * span(t, 0.6, 1.2));
    crown.alpha = g;
    crown.rotation = t;
    crown.scale.set((unit / 120) * 0.45 * g);
    return t < 2;
  });
  await done();
}

export async function lethe(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const bowl = at(0.4, 0.62);
  const stream = new Emitter(fx);
  const mist = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    if (t < 1.5)
      for (let n = 0; n < 2; n++) {
        const [x, y] = at(0.4 + rnd(-0.02, 0.02), 0.62);
        const [tx] = at(0.9, 0.62);
        stream.add(glowTexture(), x, y, { vx: (tx - x) * rnd(0.9, 1.3), vy: rnd(-1, 1) * unit * 0.03, life: 0.8, tint: 0xbff6ff, scale: (unit / 128) * rnd(0.03, 0.05) });
      }
    if (t < 1.4 && Math.random() < 0.3) mist.puff(...bowl, { vx: rnd(-1, 1) * unit * 0.1, vy: -unit * 0.05, life: 1.4, size: unit * 0.1, grow: 2.2, tint: 0xbfe6ff, alpha: 0.35, add: true });
    stream.step(dt);
    mist.step(dt);
    return t < 1.8 || stream.list.length > 0;
  });
  await done();
}

export async function letheFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const bowl = at(0.4, 0.62);
  const mist = new Smoke(app.stage);
  root.addChild(fx);
  const target: Pt = board?.runner ? pt(board.runner) : [innerWidth / 2, innerHeight * 0.9];
  let hit = false;
  await run(app, (t, dt) => {
    const src = root.toGlobal({ x: bowl[0], y: bowl[1] });
    if (t < 0.5)
      for (let n = 0; n < 2; n++) {
        const k = rnd(0, 1);
        const [x, y] = lerp([src.x, src.y], target, k * span(t, 0, 0.5));
        mist.puff(x, y, { vx: rnd(-1, 1) * unit * 0.1, vy: rnd(-1, 1) * unit * 0.1, life: 0.9, size: unit * 0.12, grow: 2, tint: 0xbfe6ff, alpha: 0.4, add: true });
      }
    if (!hit && t > 0.5) {
      hit = true;
      if (board?.runner) prism(document.querySelector('[data-anchor="runner-panel"]'), 0.4);
    }
    mist.step(dt);
    return t < 0.7 || mist.list.length > 0;
  });
  await done();
}

export async function scatterField(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const orbs = [0.56, 0.64, 0.73, 0.82].map((v, i) => {
    const s = glowSprite(fx, glowTexture(), 0xfff2d8);
    s.position.set(...at(0.19 + (i % 2) * 0.03, v));
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    orbs.forEach((o, i) => {
      const k = span(t, 0.15 + i * 0.15, 0.35 + i * 0.15) * (1 - span(t, 1.6, 2));
      o.alpha = k * (0.7 + 0.3 * Math.sin(t * 9 + i));
      o.scale.set((unit / 128) * 0.12);
    });
    return t < 2;
  });
  await done();
}

export async function scatterFieldFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const beams = new Graphics();
  beams.blendMode = "add";
  fx.addChild(beams);
  root.addChild(fx);
  await run(app, (t) => {
    beams.clear();
    const fade = 1 - span(t, 0.5, 0.9);
    [0.56, 0.64, 0.73, 0.82].forEach((v, i) => {
      const k = ease.out(span(t, i * 0.05, 0.3 + i * 0.05));
      for (const da of [-0.06, 0, 0.06])
        beams
          .moveTo(...at(0.2, v))
          .lineTo(...at(0.2 + 0.75 * k, v + da * k))
          .stroke({ width: unit * 0.008, color: 0xfff2d8, alpha: 0.8 * fade });
    });
    return t < 0.9;
  });
  await done();
}

export async function lionsmane(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const core = at(0.28, 0.63);
  const fire = new Fire(fx, undefined, unit * 0.3);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = Math.sin(Math.PI * span(t, 0, 1.6));
    if (on > 0.1) {
      const a = t * 5 + rnd(-0.3, 0.3);
      const r = unit * rnd(0.05, 0.25);
      fire.emit(core[0] + Math.cos(a) * r, core[1] + Math.sin(a) * r, { vx: -Math.sin(a) * unit * 0.5, vy: Math.cos(a) * unit * 0.5, size: unit * rnd(0.07, 0.11) * on, life: 0.5 });
    }
    fire.step(dt);
    return t < 1.6 || fire.list.length > 0;
  });
  await done();
}

export async function lionsmaneFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const core = at(0.28, 0.63);
  const fire = new Fire(app.stage, undefined, unit * 0.2);
  root.addChild(fx);
  const target: Pt = board?.runner ? pt(board.runner) : [innerWidth / 2, innerHeight * 0.9];
  let hit = false;
  await run(app, (t, dt) => {
    const src = root.toGlobal({ x: core[0], y: core[1] });
    if (t < 0.4) {
      const dx = target[0] - src.x;
      const dy = target[1] - src.y;
      const d = Math.hypot(dx, dy) || 1;
      for (let n = 0; n < 3; n++) {
        const s = rnd(-0.15, 0.15);
        fire.emit(src.x, src.y, { vx: ((dx * Math.cos(s) - dy * Math.sin(s)) / d) * d * 1.8, vy: ((dx * Math.sin(s) + dy * Math.cos(s)) / d) * d * 1.8, size: unit * rnd(0.06, 0.1), life: 0.55 });
      }
    }
    if (!hit && t > 0.45) {
      hit = true;
      if (board?.runner) prism(document.querySelector('[data-anchor="runner-panel"]'), 0.4);
    }
    fire.step(dt);
    return t < 0.6 || fire.list.length > 0;
  });
  await done();
}

export async function empiricist(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const glow = new GlowFilter({ color: 0x9be8ff, distance: 10, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const helix = new Graphics();
  helix.blendMode = "add";
  fx.addChild(helix);
  const vial = glowSprite(fx, glowTexture(), GREEN);
  vial.position.set(...at(0.6, 0.72));
  root.addChild(fx);
  await run(app, (t) => {
    helix.clear();
    const on = Math.sin(Math.PI * span(t, 0, 1.8));
    for (const ph of [0, Math.PI]) {
      const pts: number[] = [];
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        pts.push(...at(0.15 + u * 0.7, 0.57 + 0.03 * Math.sin(u * 12 + ph + t * 3)));
      }
      helix.poly(pts, false).stroke({ width: 1.5, color: 0x9be8ff, alpha: 0.6 * on });
    }
    vial.alpha = 0.6 * on;
    vial.scale.set((unit / 128) * 0.1);
    glow.outerStrength = 1.5 * on;
    return t < 1.8;
  });
  await done();
}

export async function empiricistFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, at } = await scene(rect, code, ready, board);
  const lens = at(0.38, 0.78);
  const scan = new Graphics();
  scan.blendMode = "add";
  app.stage.addChild(scan);
  root.addChild(fx);
  const target = board?.runner ?? null;
  await run(app, (t) => {
    scan.clear();
    if (target) {
      const src = root.toGlobal({ x: lens[0], y: lens[1] });
      const k = span(t, 0, 0.7);
      const y = target.top + target.height * k;
      scan.poly([src.x, src.y, target.left, y, target.right, y]).fill({ color: 0x9be8ff, alpha: 0.12 * (1 - span(t, 0.6, 0.9)) });
      scan
        .moveTo(target.left, y)
        .lineTo(target.right, y)
        .stroke({ width: 2, color: WHITE, alpha: 1 - span(t, 0.6, 0.9) });
    }
    return t < 0.9;
  });
  scan.destroy();
  await done();
}

export async function vicsek(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.6, 0.62);
  const flock = Array.from({ length: 16 }, () => ({ s: glowSprite(fx, wingTexture(), 0x7fdcff), p: [c[0] + rnd(-1, 1) * unit * 0.3, c[1] + rnd(-1, 1) * unit * 0.2] as Pt, a: rnd(0, Math.PI * 2) }));
  root.addChild(fx);
  await run(app, (t, dt) => {
    const order = span(t, 0.2, 1);
    const mean = Math.atan2(
      flock.reduce((m, f) => m + Math.sin(f.a), 0),
      flock.reduce((m, f) => m + Math.cos(f.a), 0),
    );
    const on = span(t, 0, 0.3) * (1 - span(t, 1.6, 2));
    for (const f of flock) {
      const toward = Math.atan2(c[1] - f.p[1], c[0] - f.p[0]);
      f.a += ((mean - f.a) * order * 0.15 + (toward - f.a) * 0.05 + rnd(-0.3, 0.3) * (1 - order)) * 1;
      f.p = [f.p[0] + Math.cos(f.a) * unit * 0.5 * dt, f.p[1] + Math.sin(f.a) * unit * 0.5 * dt];
      f.s.position.set(...f.p);
      f.s.rotation = f.a + Math.PI / 2;
      f.s.alpha = on;
      f.s.scale.set((unit / 180) * 0.9, (unit / 180) * 0.9 * (0.6 + 0.4 * Math.sin(t * 30)));
    }
    return t < 2;
  });
  await done();
}

export async function vicsekFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const src = at(0.6, 0.62);
  root.addChild(fx);
  const target: Pt = board?.runner ? pt(board.runner) : [innerWidth / 2, innerHeight * 0.9];
  const g = root.toGlobal({ x: src[0], y: src[1] });
  const swarm = Array.from({ length: 12 }, (_, i) => homing(app.stage, wingTexture(), [g.x, g.y], target, i * 0.04, 0xbff0ff, (unit / 180) * 0.6, rnd(-1, 1) * unit));
  const trail = new Emitter(app.stage);
  let hit = false;
  await run(app, (t, dt) => {
    for (const s of swarm) s.s.scale.y = s.s.scale.x * (0.6 + 0.4 * Math.sin(t * 30));
    if (flyHome(swarm, t, trail, 0xbff0ff) === swarm.length && !hit) {
      hit = true;
      if (board?.runner) prism(document.querySelector('[data-anchor="runner-panel"]'), 0.4);
    }
    trail.step(dt);
    return !hit || trail.list.length > 0;
  });
  for (const s of swarm) s.s.destroy();
  await done();
}

export const lethePose = pose(0x9be8ff, [0.4, 0.62]);
export const scatterFieldPose = pose(0xfff2d8, [0.2, 0.64]);
export const lionsmanePose = pose(0xff8a2a, [0.28, 0.63]);
export const empiricistPose = pose(0x9be8ff, [0.6, 0.72]);
export const vicsekPose = pose(0xbff0ff, [0.6, 0.62]);
