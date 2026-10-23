import { Graphics } from "pixi.js";
import { GlitchFilter, GlowFilter, MotionBlurFilter, RGBSplitFilter, ShockwaveFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, CYAN, GOLD, GREEN, RED, type Ready, Smoke, WHITE, burst, painted, petalTexture, pt, scene, shimmer } from "./kit";
import { type Pt, cubeTexture, glowSprite, lerp, pose, prism, rnd, shardTexture, strikeFx } from "./more";

const PINK = 0xff7ac8;
const AMBER = 0xffc35a;

const signTexture = () =>
  painted("sign", 64, 40, (g) => {
    g.strokeStyle = "#fff";
    g.lineWidth = 3;
    g.strokeRect(4, 4, 56, 32);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(10, 11, 30, 4);
    g.fillRect(10, 20, 44, 4);
  });

export async function lieLow(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const pods: Pt[] = [at(0.2, 0.17), at(0.72, 0.17), at(0.25, 0.42), at(0.73, 0.4)];
  const glows = pods.map((p) => {
    const s = glowSprite(fx, glowTexture(), AMBER);
    s.position.set(...p);
    return s;
  });
  const cat = glowSprite(fx, sparkTexture(), WHITE);
  cat.position.set(...at(0.45, 0.27));
  const dust = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.3) * (1 - span(t, 1.8, 2.2));
    glows.forEach((g, i) => {
      const breath = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.3);
      g.alpha = on * (0.25 + 0.35 * breath);
      g.scale.set((unit / 128) * (0.3 + 0.06 * breath));
    });
    const blink = Math.sin(Math.PI * span(t, 0.9, 1.2));
    cat.alpha = blink;
    cat.scale.set((unit / 120) * 0.22 * blink);
    if (on > 0 && Math.random() < 0.5) {
      const [x, y] = pods[Math.floor(Math.random() * 4)];
      dust.add(glowTexture(), x + rnd(-1, 1) * unit * 0.15, y + rnd(-1, 1) * unit * 0.06, { vx: rnd(-4, 4), vy: -unit * rnd(0.03, 0.08), life: 1.4, tint: 0xffe2a0, scale: (unit / 128) * rnd(0.015, 0.03), alpha: 0.9 });
    }
    dust.step(dt);
    return t < 2.2 || dust.list.length > 0;
  });
  await done();
}

export async function openMarket(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const signs: [Pt, number][] = [
    [at(0.13, 0.17), 0xff6ad0],
    [at(0.46, 0.11), 0x9be8ff],
    [at(0.86, 0.2), 0x6affb8],
    [at(0.65, 0.22), 0xffd84a],
    [at(0.92, 0.37), 0x6ad8ff],
  ];
  const lit = signs.map(([p, c]) => {
    const s = glowSprite(fx, signTexture(), c);
    s.position.set(...p);
    return s;
  });
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    lit.forEach((s, i) => {
      const k = span(t, 0.1 + i * 0.15, 0.35 + i * 0.15);
      const flick = k > 0 && k < 1 ? (Math.random() < 0.5 ? 0.2 : 1) : 1;
      s.alpha = k * flick * (1 - span(t, 1.7, 2.1)) * 0.9;
      s.scale.set((unit / 64) * 0.2);
    });
    if (t < 1.6 && Math.random() < 0.4) motes.add(sparkTexture(), ...at(rnd(0.1, 0.9), rnd(0.3, 0.48)), { vy: -unit * 0.05, life: 0.6, tint: signs[Math.floor(rnd(0, 5))][1], scale: 0.18 * (unit / 180), grow: -0.2 });
    motes.step(dt);
    return t < 2.1 || motes.list.length > 0;
  });
  await done();
}

export async function smartwareDistributor(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const window: Pt = at(0.37, 0.24);
  const buyer: Pt = at(0.66, 0.24);
  const boxes = new Emitter(fx);
  const stickers = [at(0.06, 0.12), at(0.15, 0.2), at(0.26, 0.3), at(0.08, 0.27)].map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xfff0c0);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t, dt) => {
    stickers.forEach((s, i) => {
      const g = Math.sin(Math.PI * span(t, 0.1 + i * 0.2, 0.4 + i * 0.2));
      s.alpha = 0.6 * g;
      s.rotation = t * 2;
      s.scale.set((unit / 120) * 0.25 * g);
    });
    if (t > 0.3 && t < 1.4 && Math.random() < 0.15) {
      const v = [(buyer[0] - window[0]) * 0.9, (buyer[1] - window[1]) * 0.9 - unit * 0.3];
      boxes.add(cubeTexture(), ...window, { vx: v[0], vy: v[1], gravity: unit * 0.6, spin: rnd(-3, 3), life: 1, tint: [0x4fa8d8, 0x3aaa78, 0xd8a83a][Math.floor(rnd(0, 3))], scale: (unit / 180) * rnd(0.5, 0.8), alpha: 0.85, blend: "normal" });
    }
    boxes.step(dt);
    return t < 1.8 || boxes.list.length > 0;
  });
  await done();
}

export async function unleash(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const palms = at(0.45, 0.4);
  const head = at(0.47, 0.12);
  const glow = new GlowFilter({ color: 0xffe6a0, distance: 14, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const coil = new Graphics();
  coil.blendMode = "add";
  const bolts = new Graphics();
  bolts.blendMode = "add";
  fx.addChild(coil, bolts);
  const core = glowSprite(fx, glowTexture(), 0xfff2c8);
  core.position.set(...palms);
  const eye = glowSprite(fx, sparkTexture(), 0xfff6e0);
  eye.position.set(...head);
  root.addChild(fx);
  let next = 0;
  await run(app, (t) => {
    const k = ease.inOut(span(t, 0.1, 1.1));
    const fade = 1 - span(t, 1.5, 1.9);
    coil.clear();
    const pts: Pt[] = [];
    const n = 50;
    for (let i = 0; i <= n * k; i++) {
      const u = i / n;
      const a = u * Math.PI * 3.2;
      const r = unit * (0.32 - 0.12 * u);
      pts.push([palms[0] + Math.cos(a) * r + (head[0] - palms[0]) * u, palms[1] + Math.sin(a) * r * 0.35 + (head[1] - palms[1]) * u]);
    }
    if (pts.length > 1)
      for (const [w, a, c] of [
        [unit * 0.05, 0.25, 0x4fd8ff],
        [unit * 0.012, 1, 0xfff2c8],
      ] as const) {
        coil.moveTo(...pts[0]);
        for (const p of pts.slice(1)) coil.lineTo(...p);
        coil.stroke({ width: w, color: c, alpha: a * fade, cap: "round", join: "round" });
      }
    core.alpha = (0.4 + 0.6 * Math.sin(Math.PI * span(t, 0, 0.6))) * fade;
    core.scale.set((unit / 128) * 0.3);
    const e = Math.sin(Math.PI * span(t, 1.05, 1.5));
    eye.alpha = e;
    eye.scale.set((unit / 120) * 0.35 * e);
    glow.outerStrength = 2.4 * Math.sin(Math.PI * span(t, 0, 1.9));
    if (t > next) {
      next = t + 0.07;
      bolts.clear();
      if (t < 1.5)
        for (let i = 0; i < 2; i++) {
          const a = rnd(0, Math.PI * 2);
          lightning(bolts, palms[0], palms[1], palms[0] + Math.cos(a) * unit * 0.5, palms[1] + Math.sin(a) * unit * 0.35, unit * 0.12, RED, unit * 0.006);
        }
    }
    return t < 1.9;
  });
  await done();
}

export async function publicTrail(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const runner = at(0.31, 0.39);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const ghosts = new Emitter(fx);
  const screens: Pt[] = [at(0.15, 0.2), at(0.8, 0.22), at(0.75, 0.42), at(0.5, 0.15), at(0.08, 0.43)];
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.6, 2);
    screens.forEach((s, i) => {
      const k = ease.out(span(t, 0.1 + i * 0.1, 0.45 + i * 0.1));
      if (k <= 0) return;
      const h = lerp(s, runner, k);
      g.moveTo(...s)
        .lineTo(...h)
        .stroke({ width: 1.5, color: RED, alpha: 0.8 * fade });
    });
    const lock = span(t, 0.7, 1.1);
    if (lock > 0) {
      const r = unit * (0.25 - 0.13 * ease.out(lock));
      g.circle(...runner, r).stroke({ width: 2, color: 0xff6a5a, alpha: fade });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        g.moveTo(runner[0] + Math.cos(a) * r * 0.6, runner[1] + Math.sin(a) * r * 0.6)
          .lineTo(runner[0] + Math.cos(a) * r * 1.4, runner[1] + Math.sin(a) * r * 1.4)
          .stroke({ width: 2, color: 0xff6a5a, alpha: fade });
      }
    }
    if (t < 1.4 && Math.random() < 0.35) ghosts.add(glowTexture(), runner[0] - unit * rnd(0.05, 0.25), runner[1] + rnd(-1, 1) * unit * 0.04, { vx: -unit * 0.15, life: 0.5, tint: 0xff8a5a, scale: (unit / 128) * 0.05, alpha: 0.7 });
    ghosts.step(dt);
    return t < 2 || ghosts.list.length > 0;
  });
  await done();
}

export async function sangKancilPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const deer = at(0.45, 0.2);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const splash = new Emitter(fx);
  const halo = glowSprite(fx, glowTexture(), GOLD);
  halo.position.set(...deer);
  root.addChild(fx);
  let splashed = false;
  await run(app, (t, dt) => {
    g.clear();
    const k = span(t, 0.1, 0.8);
    const from = at(0.15, 0.42);
    const to = at(0.75, 0.42);
    const peak: Pt = [deer[0], deer[1] - unit * 0.05];
    const q = (s: number): Pt => [(1 - s) ** 2 * from[0] + 2 * (1 - s) * s * peak[0] + s * s * to[0], (1 - s) ** 2 * from[1] + 2 * (1 - s) * s * peak[1] + s * s * to[1]];
    if (k > 0) {
      g.moveTo(...q(Math.max(0, k - 0.35)));
      for (let i = 1; i <= 16; i++) g.lineTo(...q(Math.max(0, k - 0.35) + (Math.min(k, 0.35) * i) / 16));
      g.stroke({ width: unit * 0.02, color: GOLD, alpha: 0.85 * (1 - span(t, 0.9, 1.3)), cap: "round" });
    }
    if (k >= 1 && !splashed) {
      splashed = true;
      for (let i = 0; i < 18; i++) splash.add(glowTexture(), to[0] + rnd(-1, 1) * unit * 0.05, to[1], { vx: rnd(-1, 1) * unit * 0.5, vy: -unit * rnd(0.4, 1), gravity: unit * 2.5, life: 0.7, tint: 0x9be8ff, scale: (unit / 128) * rnd(0.02, 0.04) });
    }
    halo.alpha = 0.5 * Math.sin(Math.PI * span(t, 0, 1.5));
    halo.scale.set((unit / 128) * 0.35);
    splash.step(dt);
    return t < 1.5 || splash.list.length > 0;
  });
  await done();
}

export async function sangKancil(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at } = sc;
  const deer = at(0.45, 0.2);
  const halo = glowSprite(fx, glowTexture(), GOLD);
  halo.position.set(...deer);
  root.addChild(fx);
  const impact = strikeFx(sc, "leap", GOLD, deer);
  await run(
    app,
    (t) => {
      halo.alpha = Math.sin(Math.PI * span(t, 0, 0.6));
      halo.scale.set((unit / 128) * 0.4);
      return t < 0.6;
    },
    sc.strike ? 1.3 : 1,
  );
  await impact;
  await done();
}

export async function tailgate(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const slit = new Graphics();
  slit.blendMode = "add";
  fx.addChild(slit);
  const reader = glowSprite(fx, glowTexture(), RED);
  reader.position.set(...at(0.79, 0.23));
  const steam = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const close = ease.inOut(span(t, 0.2, 1.4));
    const w = 0.12 * (1 - close);
    slit.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    slit.poly([...at(0.8 - w, 0.08), ...at(0.8 + w * 0.4, 0.08), ...at(0.8 + w * 0.4, 0.5), ...at(0.8 - w, 0.5)]).fill({ color: 0xbfe6ff, alpha: 0.22 * fade });
    const granted = t > 0.9;
    reader.tint = granted ? GREEN : RED;
    reader.alpha = (0.7 + 0.3 * Math.sin(t * 20)) * fade;
    reader.scale.set((unit / 128) * 0.06);
    if (t < 1.4 && Math.random() < 0.25) steam.puff(...at(rnd(0.5, 0.75), 0.3), { vx: rnd(-4, 4), vy: -unit * 0.08, life: 1.4, size: unit * 0.06, grow: 2.2, alpha: 0.3 });
    steam.step(dt);
    return t < 1.9 || steam.list.length > 0;
  });
  await done();
}

export async function publicAccessPlaza(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const lamp = at(0.42, 0.16);
  const canopy = glowSprite(fx, glowTexture(), 0xbff6ff);
  canopy.position.set(...lamp);
  const rain = new Emitter(fx);
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = span(t, 0.1, 0.5) * (1 - span(t, 1.7, 2.1));
    canopy.alpha = on * 0.8;
    canopy.scale.set((unit / 128) * 0.4, (unit / 128) * 0.16);
    if (on > 0.3 && Math.random() < 0.7) rain.add(sparkTexture(), lamp[0] + rnd(-1, 1) * unit * 0.25, lamp[1] + unit * 0.03, { vy: unit * rnd(0.3, 0.6), life: 0.6, tint: CYAN, scale: 0.15 * (unit / 180), grow: -0.1 });
    rings.clear();
    for (let n = 0; n < 2; n++) {
      const k = span(t, 0.3 + n * 0.4, 1.1 + n * 0.4);
      if (k > 0 && k < 1) rings.ellipse(...at(0.42, 0.45), unit * (0.05 + 0.4 * k), unit * (0.01 + 0.08 * k)).stroke({ width: 1.5, color: CYAN, alpha: 1 - k });
    }
    rain.step(dt);
    return t < 2.1 || rain.list.length > 0;
  });
  await done();
}

export async function chromatophores(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const path: Pt[] = [at(0.02, 0.44), at(0.2, 0.36), at(0.4, 0.31), at(0.6, 0.28), at(0.8, 0.26), at(0.98, 0.22)];
  const dots = Array.from({ length: 34 }, (_, i) => {
    const u = i / 33;
    const f = u * (path.length - 1);
    const j = Math.min(path.length - 2, Math.floor(f));
    const [x, y] = lerp(path[j], path[j + 1], f - j);
    const s = glowSprite(fx, glowTexture(), WHITE);
    s.position.set(x + rnd(-1, 1) * unit * 0.04, y + rnd(-1, 1) * unit * 0.06);
    return { s, u };
  });
  root.addChild(fx);
  await run(app, (t) => {
    const on = span(t, 0, 0.2) * (1 - span(t, 1.7, 2.1));
    for (const d of dots) {
      const hue = (d.u * 2 - t * 1.2) % 1;
      const h = ((hue + 1) % 1) * 6;
      const c = (n: number) => Math.round(255 * Math.max(0, Math.min(1, Math.abs(((h + n) % 6) - 3) - 1)));
      d.s.tint = (c(0) << 16) | (c(4) << 8) | c(2);
      const wave = 0.5 + 0.5 * Math.sin(d.u * 12 - t * 8);
      d.s.alpha = on * (0.3 + 0.6 * wave);
      d.s.scale.set((unit / 128) * (0.03 + 0.03 * wave));
    }
    return t < 2.1;
  });
  await done();
}

export async function chromatophoresEffect(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const ink = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const w = Math.sin(t * 12) * 5 * (1 - span(t, 0.4, 0.9));
    split.red = sideways ? { x: 0, y: w } : { x: w, y: 0 };
    split.blue = sideways ? { x: 0, y: -w } : { x: -w, y: 0 };
    if (t < 0.5 && Math.random() < 0.6) ink.puff(...at(rnd(0.2, 0.8), rnd(0.25, 0.4)), { vx: rnd(-1, 1) * unit * 0.3, vy: rnd(-1, 1) * unit * 0.2, life: 1, size: unit * 0.12, grow: 2.5, tint: 0x2a1a5a, alpha: 0.5 });
    ink.step(dt);
    return t < 0.9 || ink.list.length > 0;
  });
  await done();
}

export async function whitespace(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const core = at(0.36, 0.76);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.02, wavelength: unit * 0.35, speed: unit * 0.9, brightness: 1, radius: unit * 0.7, time: 0 });
  card.filters = [wave];
  const shards = new Emitter(fx);
  const pulse = glowSprite(fx, glowTexture(), 0xdfeaf5);
  pulse.position.set(...core);
  root.addChild(fx);
  await run(app, (t, dt) => {
    wave.center = filterPoint(card, ...core);
    wave.time = t % 1.1;
    const k = Math.sin(Math.PI * span(t, 0.1, 1.6));
    pulse.alpha = 0.25 * k;
    pulse.scale.set((unit / 128) * (0.3 + 0.08 * Math.sin(t * 5)));
    if (t < 1.3 && Math.random() < 0.5) {
      const a = rnd(0, Math.PI * 2);
      const d = unit * rnd(0.12, 0.2);
      shards.add(cubeTexture(), core[0] + Math.cos(a) * d, core[1] + Math.sin(a) * d, { vx: Math.cos(a) * unit * 0.35, vy: Math.sin(a) * unit * 0.35, spin: rnd(-2, 2), drag: 0.6, life: 1.1, tint: Math.random() < 0.5 ? 0x8f9aa6 : 0x5f6a76, scale: (unit / 180) * rnd(0.3, 0.6), alpha: 0.85, blend: "normal" });
    }
    shards.step(dt);
    return t < 1.7 || shards.list.length > 0;
  });
  await done();
}

export async function whitespaceFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const core = at(0.36, 0.76);
  const shards = new Emitter(fx);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.05, wavelength: unit * 0.4, speed: unit * 1.8, brightness: 1.05, radius: unit * 0.9, time: 0 });
  card.filters = [wave];
  root.addChild(fx);
  const pieces = Array.from({ length: 22 }, () => {
    const a = rnd(0, Math.PI * 2);
    const d = unit * rnd(0.45, 0.8);
    const s = glowSprite(fx, cubeTexture(), Math.random() < 0.5 ? 0x8f9aa6 : 0x5f6a76);
    s.blendMode = "normal";
    return { s, from: [core[0] + Math.cos(a) * d, core[1] + Math.sin(a) * d] as Pt, spin: rnd(-6, 6) };
  });
  let burstDone = false;
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0, 0.45));
    for (const p of pieces) {
      p.s.position.set(...lerp(p.from, core, k));
      p.s.alpha = t < 0.45 ? 0.9 : 0;
      p.s.rotation = p.spin * t;
      p.s.scale.set((unit / 180) * 0.5 * (1 - 0.5 * k));
    }
    if (t > 0.45 && !burstDone) {
      burstDone = true;
      for (let i = 0; i < 22; i++) {
        const a = rnd(0, Math.PI * 2);
        shards.add(cubeTexture(), ...core, { vx: Math.cos(a) * unit * 1.4, vy: Math.sin(a) * unit * 1.4, drag: 1.5, spin: rnd(-6, 6), life: 0.7, tint: 0x8f9aa6, scale: (unit / 180) * 0.45, alpha: 0.9, blend: "normal" });
      }
      navigator.vibrate?.(30);
    }
    wave.center = filterPoint(card, ...core);
    wave.time = Math.max(0, t - 0.45);
    card.tint = t > 0.45 && t < 0.6 ? 0xeef3f8 : WHITE;
    shards.step(dt);
    return t < 1.1 || shards.list.length > 0;
  });
  card.tint = WHITE;
  await done();
}

export async function syailendraFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const tower = at(0.24, 0.62);
  const glitch = new GlitchFilter({ slices: 8, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [glitch];
  const g = new Graphics();
  g.blendMode = "add";
  app.stage.addChild(g);
  root.addChild(fx);
  const target: Pt = board?.runner ? pt(board.runner) : [innerWidth / 2, innerHeight * 0.9];
  let hit = false;
  await run(app, (t) => {
    glitch.offset = t < 0.4 && Math.random() < 0.4 ? unit * 0.04 : 0;
    g.clear();
    const src = root.toGlobal({ x: tower[0], y: tower[1] });
    for (let n = 0; n < 3; n++) {
      const k = span(t, n * 0.12, n * 0.12 + 0.6);
      if (k <= 0 || k >= 1) continue;
      const p = lerp([src.x, src.y], target, k);
      g.circle(...p, unit * (0.1 + 0.15 * k)).stroke({ width: 2 * (1 - k) + 1, color: 0x9be8ff, alpha: 1 - k * 0.6 });
    }
    if (!hit && t > 0.5) {
      hit = true;
      if (board?.runner) prism(document.querySelector('[data-anchor="runner-panel"]'), 0.4);
    }
    return t < 1;
  });
  g.destroy();
  await done();
}

export async function flywheel(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hub = at(0.42, 0.78);
  const blur = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 9 });
  card.filters = [blur];
  const rim = new Graphics();
  rim.blendMode = "add";
  fx.addChild(rim);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const spin = span(t, 0, 0.8) * (1 - span(t, 1.4, 1.9));
    rim.clear();
    for (let i = 0; i < 3; i++) {
      const a0 = t * 16 * spin + (i * Math.PI * 2) / 3;
      const pts: number[] = [];
      for (let s2 = 0; s2 <= 10; s2++) {
        const a = a0 + s2 * 0.12;
        pts.push(hub[0] + Math.cos(a) * unit * 0.33, hub[1] + Math.sin(a) * unit * 0.15);
      }
      rim.poly(pts, false).stroke({ width: unit * 0.02, color: i % 2 ? 0x9dff5a : 0xff7ac8, alpha: 0.8 * spin });
    }
    for (let i = 0; i < 4; i++) {
      const a = t * 16 * spin + (i * Math.PI) / 2;
      const p: Pt = [hub[0] + Math.cos(a) * unit * 0.33, hub[1] + Math.sin(a) * unit * 0.15];
      rim.circle(...p, unit * 0.022).fill({ color: WHITE, alpha: spin });
      if (Math.random() < 0.5 * spin) sparks.add(sparkTexture(), ...p, { vx: -Math.sin(a) * unit * 1.2, vy: Math.cos(a) * unit * 0.6, gravity: unit, life: 0.35, tint: Math.random() < 0.5 ? 0xff7ac8 : 0x9dff5a, scale: 0.2 * (unit / 180) });
    }
    blur.velocity = { x: 3 * spin, y: 0 };
    sparks.step(dt);
    return t < 1.9 || sparks.list.length > 0;
  });
  await done();
}

export async function flywheelFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hub = at(0.42, 0.78);
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  burst(sparks, ...hub, 30, 0xff7ac8, unit * 2, { life: 0.5, scale: 0.35 });
  await run(app, (t, dt) => {
    rings.clear();
    for (let n = 0; n < 3; n++) {
      const k = span(t, n * 0.08, n * 0.08 + 0.5);
      if (k > 0 && k < 1) rings.ellipse(...hub, unit * (0.2 + 0.6 * ease.out(k)), unit * (0.09 + 0.27 * ease.out(k))).stroke({ width: 2 * (1 - k) + 1, color: n % 2 ? 0x9dff5a : 0xff7ac8, alpha: 1 - k });
    }
    sparks.step(dt);
    return t < 0.8 || sparks.list.length > 0;
  });
  await done();
}

export const whitespacePose = pose(WHITE, [0.36, 0.76]);
export const syailendraPose = pose(0x9be8ff, [0.24, 0.62]);
export const flywheelPose = pose(0xff7ac8, [0.42, 0.78]);
export const kessleroidPose = pose(RED, [0.55, 0.74]);
