import { type Container, Graphics, Sprite } from "pixi.js";
import { GlitchFilter, GlowFilter, GodrayFilter, RGBSplitFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, layer, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, Smoke, WHITE, burst, coinTexture, painted, scene } from "./kit";
import { type Pt, cubeTexture, glowSprite, lerp, quad, rnd } from "./more";
import { bezier, jolt, runnerAt, triTexture } from "./sixth";

const plateTexture = () =>
  painted("rv-plate", 40, 28, (g) => {
    g.fillStyle = "rgba(255,255,255,0.3)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(6, 4);
    g.lineTo(38, 2);
    g.lineTo(34, 26);
    g.lineTo(2, 24);
    g.closePath();
    g.fill();
    g.stroke();
  });

const facetTexture = () =>
  painted("rv-facet", 48, 48, (g) => {
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(4, 10);
    g.lineTo(44, 2);
    g.lineTo(36, 30);
    g.lineTo(14, 46);
    g.closePath();
    g.fill();
    g.stroke();
  });

const bilinear = (q: [Pt, Pt, Pt, Pt], s: number, r: number): Pt => lerp(lerp(q[0], q[1], s), lerp(q[3], q[2], s), r);

export async function carnivorePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const pad: [Pt, Pt, Pt, Pt] = [at(0.15, 0.29), at(0.47, 0.3), at(0.87, 0.44), at(0.33, 0.47)];
  const head = at(0.6, 0.25);
  const glitch = new GlitchFilter({ slices: 8, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const halo = glowSprite(fx, glowTexture(), 0x59ff8a);
  halo.position.set(...head);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const sweep = ease.inOut(span(t, 0.05, 0.8));
    const fade = 1 - span(t, 1.2, 1.6);
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const lit = Math.max(0, 1 - Math.abs(k - sweep) * 6);
      g.moveTo(...bilinear(pad, 0, k)).lineTo(...bilinear(pad, 1, k));
      g.stroke({ width: 1 + lit * 1.6, color: 0x59ff8a, alpha: (0.12 + 0.8 * lit) * fade });
      g.moveTo(...bilinear(pad, k, 0)).lineTo(...bilinear(pad, k, Math.min(1, sweep * 1.2)));
      g.stroke({ width: 1, color: 0x59ff8a, alpha: 0.25 * fade });
    }
    const scan = span(t, 0.5, 1.3);
    if (scan > 0 && scan < 1) {
      const v = 0.13 + scan * 0.25;
      g.moveTo(...at(0.46, v))
        .lineTo(...at(0.74, v))
        .stroke({ width: unit * 0.01, color: 0x59ff8a, alpha: 0.75 });
    }
    const on = Math.sin(Math.PI * span(t, 0.45, 1.5));
    card.filters = on > 0.05 && Math.random() < 0.2 * on ? [glitch] : [];
    glitch.offset = unit * 0.015;
    glitch.seed = Math.random();
    halo.alpha = 0.35 * on;
    halo.scale.set((unit / 128) * 0.45, (unit / 128) * 0.55);
    return t < 1.6;
  });
  card.filters = [];
  await done();
}

export async function clearinghouse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.33, 0.36);
  const lamp = glowSprite(fx, glowTexture(), 0xff4a2a);
  lamp.position.set(...eye);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const smoke = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const boot = t < 0.45 ? (Math.floor(t * 16) % 3 === 0 ? 1 : 0.2) : 1;
    const on = span(t, 0.05, 0.15) * (1 - span(t, 1.4, 1.8)) * boot;
    lamp.alpha = 0.9 * on;
    lamp.scale.set((unit / 128) * 0.14);
    const k = span(t, 0.5, 1.4);
    if (k > 0 && k < 1) {
      const target = at(0.15 + 0.7 * ease.inOut(k), 0.48);
      g.moveTo(...eye)
        .lineTo(...target)
        .stroke({ width: 1.2, color: 0xff5a3a, alpha: 0.7 * on });
      g.circle(...target, unit * 0.012).fill({ color: 0xffb090, alpha: 0.9 * on });
    }
    if (t > 0.3 && t < 1.3 && Math.random() < 0.25) smoke.puff(...at(rnd(0.25, 0.45), 0.44), { vx: rnd(-1, 1) * unit * 0.05, vy: -unit * 0.08, size: unit * 0.14, life: 1.2, tint: 0x5a6066, alpha: 0.4 });
    smoke.step(dt);
    return t < 1.8 || smoke.list.length > 0;
  });
  await done();
}

export async function aboveTheLaw(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sat = at(0.69, 0.165);
  const gone = board?.gone?.[0];
  const prey: Pt | null = gone ? [gone.left + gone.width / 2, gone.top + gone.height / 2] : null;
  const shot = new Graphics();
  shot.blendMode = "add";
  world.addChild(shot);
  const debris = new Emitter(world);
  let hit = false;
  const consoleAt = at(0.45, 0.34);
  const beacon = glowSprite(fx, sparkTexture(), 0xbfe8ff);
  beacon.position.set(...sat);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const blink = Math.floor(t * 6) % 2 ? 1 : 0.4;
    beacon.alpha = blink * fade;
    beacon.rotation = t;
    beacon.scale.set((unit / 120) * 0.45);
    const k = ease.out(span(t, 0.3, 0.7));
    if (k > 0) {
      const tip = lerp(sat, consoleAt, k);
      g.poly([sat[0] - unit * 0.004, sat[1], sat[0] + unit * 0.004, sat[1], tip[0] + unit * 0.06, tip[1], tip[0] - unit * 0.06, tip[1]]).fill({ color: 0x8fd8ff, alpha: 0.18 * fade });
      g.moveTo(...sat)
        .lineTo(...tip)
        .stroke({ width: 1.2, color: 0xdff4ff, alpha: 0.8 * fade });
    }
    const lock = span(t, 0.7, 1.1);
    if (lock > 0) {
      const R = unit * (0.16 - 0.08 * ease.out(lock));
      g.circle(...consoleAt, R).stroke({ width: 1.5, color: 0x8fd8ff, alpha: 0.9 * fade });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + (1 - ease.out(lock)) * 1.5;
        g.moveTo(consoleAt[0] + Math.cos(a) * R * 0.5, consoleAt[1] + Math.sin(a) * R * 0.5).lineTo(consoleAt[0] + Math.cos(a) * R * 1.4, consoleAt[1] + Math.sin(a) * R * 1.4);
      }
      g.stroke({ width: 1.5, color: 0x8fd8ff, alpha: 0.9 * fade });
      for (let i = 0; i < 5; i++) {
        const v = 0.315 + i * 0.012;
        const w = 0.04 + 0.06 * Math.abs(Math.sin(t * 5 + i));
        g.moveTo(...at(0.37, v))
          .lineTo(...at(0.37 + w, v))
          .stroke({ width: 1, color: 0x9ef0ff, alpha: 0.6 * fade * lock });
      }
    }
    shot.clear();
    if (prey) {
      const from = root.toGlobal({ x: sat[0], y: sat[1] });
      const s = span(t, 1.15, 1.32);
      if (s > 0 && s < 1) {
        const tip = lerp([from.x, from.y], prey, ease.out(s));
        shot.moveTo(from.x, from.y).lineTo(...tip).stroke({ width: unit * 0.03, color: 0x8fd8ff, alpha: 0.35 });
        shot.moveTo(from.x, from.y).lineTo(...tip).stroke({ width: unit * 0.008, color: WHITE, alpha: 0.95 });
      }
      if (s >= 1 && !hit) {
        hit = true;
        for (let i = 0; i < 26; i++) {
          const a = rnd(0, Math.PI * 2);
          const v = unit * rnd(0.6, 1.6);
          debris.add(sparkTexture(), ...prey, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.5, gravity: unit * 1.2, life: rnd(0.35, 0.7), tint: i % 3 ? 0x8fd8ff : 0xff8a6a, scale: (unit / 180) * rnd(0.18, 0.32) });
        }
      }
      const boom = 1 - span(t, 1.32, 1.8);
      if (hit && boom > 0) shot.circle(...prey, unit * (0.06 + 0.22 * (1 - boom))).stroke({ width: 2, color: 0x8fd8ff, alpha: 0.9 * boom });
      debris.step(dt);
    }
    return t < (prey ? 2 : 1.9) || debris.list.length > 0;
  });
  await done();
}

export async function anselFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.58, 0.77);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const facets = Array.from({ length: 9 }, (_, i) => {
    const s = glowSprite(world, facetTexture(), i % 3 === 0 ? 0xff9a4a : 0x6ff0e6);
    return { s, d: 0.3 + i * 0.04, off: [rnd(-1, 1) * unit * 0.4, rnd(-1, 1) * unit * 0.4] as Pt, spin: rnd(-6, 6), size: rnd(0.5, 0.9) };
  });
  const sparks = new Emitter(world);
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    for (let i = 0; i < 4; i++) {
      const r = unit * (0.03 + i * 0.03) * (1 + 0.6 * ease.out(span(t, 0, 0.35)));
      const a = t * (i % 2 ? -9 : 7);
      g.moveTo(eye[0] + Math.cos(a) * r, eye[1] + Math.sin(a) * r)
        .arc(eye[0], eye[1], r, a, a + Math.PI * 1.3)
        .stroke({ width: 1.6, color: 0x6ff0e6, alpha: 0.9 * (1 - span(t, 0.4, 0.7)) });
    }
    const src = root.toGlobal({ x: eye[0], y: eye[1] });
    for (const fc of facets) {
      const k = span(t, fc.d, fc.d + 0.45);
      const ctrl: Pt = [(src.x + target[0]) / 2 + fc.off[0], (src.y + target[1]) / 2 + fc.off[1]];
      fc.s.position.set(...bezier([src.x, src.y], ctrl, target, ease.inOut(k)));
      fc.s.rotation = t * fc.spin;
      fc.s.alpha = k > 0 && k < 1 ? 0.9 : 0;
      fc.s.scale.set((unit / 180) * fc.size);
    }
    if (!hit && t > 0.8) {
      hit = true;
      for (let i = 0; i < 20; i++) sparks.add(triTexture(), ...target, { vx: rnd(-1, 1) * unit * 2, vy: rnd(-1.4, 0.2) * unit * 1.6, gravity: unit * 3, spin: rnd(-8, 8), life: 0.6, tint: i % 3 ? 0x6ff0e6 : 0xff9a4a, scale: (unit / 180) * rnd(0.25, 0.45), alpha: 0.85 });
      jolt(board);
    }
    sparks.step(dt);
    return t < 1.2 || sparks.list.length > 0;
  });
  await done();
}

export async function cacophonyPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const beak = at(0.3, 0.2);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const shards = new Emitter(fx);
  const colors = [0xff4fb0, 0x4fe0ff, 0x8aff6a, 0xffd84a];
  const beats = [0.15, 0.55, 0.95];
  const hit = beats.map(() => false);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    beats.forEach((b, i) => {
      const k = span(t, b, b + 0.7);
      if (k > 0 && k < 1) {
        const R = unit * (0.08 + 0.75 * ease.out(k));
        g.moveTo(beak[0] + R, beak[1]);
        for (let s = 1; s <= 40; s++) {
          const a = (s / 40) * Math.PI * 2;
          const r = R * (1 + 0.08 * Math.sin(a * 7 + t * 20));
          g.lineTo(beak[0] + Math.cos(a) * r, beak[1] + Math.sin(a) * r);
        }
        g.stroke({ width: 2 * (1 - k) + 0.6, color: colors[i], alpha: 0.7 * (1 - k) });
      }
      if (!hit[i] && t > b) {
        hit[i] = true;
        for (let n = 0; n < 10; n++) {
          const a = rnd(0, Math.PI * 2);
          shards.add(triTexture(), beak[0] + Math.cos(a) * unit * 0.1, beak[1] + Math.sin(a) * unit * 0.1, { vx: Math.cos(a) * unit * rnd(0.5, 1.1), vy: Math.sin(a) * unit * rnd(0.5, 1.1), drag: 1.5, spin: rnd(-6, 6), life: 0.8, tint: colors[n % 4], scale: (unit / 180) * rnd(0.25, 0.45), alpha: 0.9 });
        }
      }
    });
    const thump = Math.max(...beats.map((b) => Math.max(0, 1 - Math.abs(t - b - 0.03) * 10)));
    split.red = { x: unit * 0.008 * thump, y: 0 };
    split.blue = { x: -unit * 0.008 * thump, y: 0 };
    shards.step(dt);
    return t < 1.7 || shards.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function cacophony(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, world, done, unit, at } = await scene(rect, code, ready, board);
  const beak = at(0.3, 0.2);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const shards = new Emitter(world);
  const colors = [0xff4fb0, 0x4fe0ff, 0x8aff6a, 0xffd84a];
  let burstDone = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    const src = root.toGlobal({ x: beak[0], y: beak[1] });
    const on = 1 - span(t, 0.3, 0.6);
    split.red = { x: unit * 0.01 * on * Math.sin(t * 40), y: 0 };
    split.blue = { x: -unit * 0.01 * on * Math.sin(t * 33), y: 0 };
    if (!burstDone && t > 0.1) {
      burstDone = true;
      for (let n = 0; n < 40; n++) {
        const a = rnd(0, Math.PI * 2);
        const v = unit * rnd(1.2, 2.6);
        shards.add(triTexture(), src.x, src.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 1.8, spin: rnd(-8, 8), life: rnd(0.7, 1.1), tint: colors[n % 4], scale: (unit / 180) * rnd(0.3, 0.6), alpha: 0.9 });
      }
    }
    shards.step(dt);
    return t < 0.6 || shards.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function devadattaDrone(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const queen = at(0.52, 0.36);
  const swarm: [Pt, number][] = [
    [at(0.12, 0.16), 0.6],
    [at(0.5, 0.17), 0.7],
    [at(0.83, 0.17), 0.7],
    [at(0.2, 0.33), 0.8],
    [at(0.82, 0.43), 0.8],
    [at(0.27, 0.45), 0.7],
    [at(0.62, 0.45), 0.6],
  ];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const eyes = [at(0.49, 0.36), at(0.56, 0.36)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x9aff5a);
    s.position.set(...p);
    return s;
  });
  const glows = swarm.map(([p]) => {
    const s = glowSprite(fx, glowTexture(), 0xbfe8ff);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const wake = span(t, 0.05, 0.35) * fade;
    for (const e of eyes) {
      e.alpha = 0.8 * wake;
      e.scale.set((unit / 128) * 0.06);
    }
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.2 + i * 0.25, 0.9 + i * 0.25);
      if (k > 0 && k < 1) g.circle(...queen, unit * (0.06 + 0.3 * ease.out(k))).stroke({ width: 1.4, color: 0x9aff5a, alpha: 0.5 * (1 - k) * fade });
    }
    swarm.forEach(([p, s], i) => {
      const d = 0.25 + (Math.hypot(p[0] - queen[0], p[1] - queen[1]) / unit) * 0.9;
      const f = span(t, d, d + 0.15) * fade;
      glows[i].alpha = 0.5 * f * (0.7 + 0.3 * Math.sin(t * 40 + i));
      glows[i].scale.set((unit / 128) * 0.1 * s);
      if (f > 0) {
        const w = unit * 0.05 * s;
        const flap = Math.sin(t * 50 + i) * 0.3;
        for (const side of [-1, 1])
          g.moveTo(...p)
            .quadraticCurveTo(p[0] + side * w, p[1] - w * (1 + flap), p[0] + side * w * 1.4, p[1] - w * 0.2)
            .stroke({ width: 1, color: 0xe0f4ff, alpha: 0.6 * f });
      }
    });
    return t < 1.9;
  });
  await done();
}

const calm = (parent: Container) => layer(parent, false);

const clip = (root: Container, target: Container, pts: Pt[]) => {
  const m = new Graphics();
  m.poly(pts.flat()).fill(0xffffff);
  root.addChild(m);
  target.mask = m;
  return m;
};

const vignetteTexture = () =>
  painted("rv-vignette", 256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 30, 128, 128, 128);
    r.addColorStop(0, "rgba(0,0,0,0)");
    r.addColorStop(0.55, "rgba(0,0,0,0.55)");
    r.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
  });

export async function knickknack(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hand = at(0.27, 0.31);
  const trader = at(0.6, 0.29);
  root.addChild(fx);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const flare = glowSprite(fx, glowTexture(), 0xffd36a);
  flare.position.set(...trader);
  flare.alpha = 0;
  const coins = [0, 1, 2].map(() => {
    const c = new Sprite(coinTexture());
    c.anchor.set(0.5);
    c.scale.set((unit * 0.075) / 64);
    c.alpha = 0;
    fx.addChild(c);
    return c;
  });
  const sparks = new Emitter(fx);
  const card = (c: Pt, w: number, h: number, a: number, color: number, alpha: number) => {
    const pts = [
      [-w, -h],
      [w, -h],
      [w, h],
      [-w, h],
    ].flatMap(([x, y]) => [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]);
    g.poly(pts).fill({ color, alpha: 0.25 * alpha });
    g.poly(pts).stroke({ width: 1.5, color, alpha: 0.9 * alpha });
  };
  await run(app, (t, dt) => {
    g.clear();
    const go = ease.inOut(span(t, 0.1, 0.6));
    const gone = 1 - span(t, 0.6, 0.72);
    if (go > 0 && gone > 0) {
      const p = bezier(hand, at(0.44, 0.15), trader, go);
      card(p, unit * 0.035, unit * 0.025, go * 2.5, 0x6fe0ff, gone);
      if (Math.random() < 0.5) sparks.add(sparkTexture(), ...p, { life: 0.3, tint: 0x6fe0ff, scale: (unit / 180) * 0.18, grow: -0.4, alpha: 0.6 });
    }
    const deal = Math.sin(Math.PI * span(t, 0.58, 0.95));
    flare.alpha = 0.7 * deal;
    flare.scale.set((unit / 128) * (0.15 + 0.15 * deal));
    if (deal > 0) g.circle(...trader, unit * (0.04 + 0.1 * span(t, 0.58, 0.95))).stroke({ width: 2, color: 0xffd36a, alpha: 0.8 * deal });
    coins.forEach((c, i) => {
      const k = ease.inOut(span(t, 0.75 + i * 0.1, 1.3 + i * 0.1));
      c.alpha = k > 0 && k < 1 ? 1 : 0;
      c.position.set(...bezier(trader, at(0.44, 0.1 - i * 0.03), hand, k));
      c.rotation = k * 5;
    });
    const draw = ease.inOut(span(t, 1.15, 1.65));
    if (draw > 0 && draw < 1) card(bezier(trader, at(0.42, 0.04), hand, draw), unit * 0.03, unit * 0.042, -0.3 + draw * 0.3, WHITE, Math.sin(Math.PI * draw));
    sparks.step(dt);
    return t < 1.7 || sparks.list.length > 0;
  });
  await done();
}

export async function clearinghouseFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.325, 0.35);
  root.addChild(fx);
  const flash = glowSprite(fx, glowTexture(), 0xff6a2a);
  flash.position.set(...eye);
  const soft = calm(world);
  const g = new Graphics();
  soft.addChild(g);
  const sparks = new Emitter(soft);
  const target = runnerAt(board);
  const shots = Array.from({ length: 5 }, (_, i) => ({ at: 0.15 + i * 0.09, off: [rnd(-1, 1) * unit * 0.12, rnd(-1, 1) * unit * 0.06] as Pt, hit: false }));
  await run(app, (t, dt) => {
    g.clear();
    const src = root.toGlobal({ x: eye[0], y: eye[1] });
    flash.alpha = shots.some((s) => t > s.at && t < s.at + 0.04) ? 0.7 : 0.25 * (1 - span(t, 0.7, 0.9));
    flash.scale.set((unit / 128) * 0.1);
    for (const s of shots) {
      const k = span(t, s.at, s.at + 0.22);
      const end: Pt = [target[0] + s.off[0], target[1] + s.off[1]];
      if (k > 0 && k < 1) {
        const head = lerp([src.x, src.y], end, k);
        const tail = lerp([src.x, src.y], end, Math.max(0, k - 0.2));
        g.moveTo(...tail)
          .lineTo(...head)
          .stroke({ width: 2, color: 0xffb060, alpha: 0.9, cap: "round" });
      }
      if (!s.hit && k >= 1) {
        s.hit = true;
        for (let i = 0; i < 6; i++) sparks.add(sparkTexture(), ...end, { vx: rnd(-1, 1) * unit * 0.8, vy: -unit * rnd(0.2, 0.9), gravity: unit * 3, life: 0.35, tint: Math.random() < 0.5 ? 0xffc080 : 0xff6a2a, scale: (unit / 180) * 0.22 });
        if (s === shots[0]) jolt(board, 0.35);
      }
    }
    sparks.step(dt);
    return t < 0.9 || sparks.list.length > 0;
  });
  await done();
}

const PANE: Pt[] = [
  [0.55, 0.245],
  [0.83, 0.115],
  [0.94, 0.32],
  [0.59, 0.45],
];

const SCREEN: Pt[] = [
  [0.28, 0.245],
  [0.44, 0.255],
  [0.43, 0.345],
  [0.27, 0.335],
];

const RODS: [number, number, number, number][] = [
  [0.2, 0.6, 0.33, 0.92],
  [0.27, 0.58, 0.4, 0.93],
  [0.37, 0.57, 0.48, 0.93],
  [0.47, 0.55, 0.56, 0.93],
  [0.58, 0.54, 0.66, 0.93],
];

