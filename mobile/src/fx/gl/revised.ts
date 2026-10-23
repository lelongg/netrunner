import { type Container, Graphics, Sprite } from "pixi.js";
import { GlitchFilter, GlowFilter, GodrayFilter, RGBSplitFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, layer, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, Smoke, WHITE, burst, painted, scene } from "./kit";
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
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sat = at(0.69, 0.165);
  const consoleAt = at(0.45, 0.34);
  const beacon = glowSprite(fx, sparkTexture(), 0xbfe8ff);
  beacon.position.set(...sat);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
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
    return t < 1.9;
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
  const palm = at(0.26, 0.31);
  const eyes = at(0.63, 0.205);
  const bowl = at(0.48, 0.36);
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  const steam = new Smoke(soft);
  const glint = glowSprite(fx, sparkTexture(), 0xbfefff);
  glint.position.set(...eyes);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.2, 1.5);
    const h = Math.sin(Math.PI * span(t, 0, 0.7));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 2;
      const r = unit * 0.035;
      g.moveTo(palm[0] + Math.cos(a) * r, palm[1] + Math.sin(a) * r).lineTo(palm[0] + Math.cos(a + Math.PI / 3) * r, palm[1] + Math.sin(a + Math.PI / 3) * r);
    }
    g.stroke({ width: 1.6, color: 0x6fe0ff, alpha: 0.9 * h });
    const k = ease.inOut(span(t, 0.35, 1.05));
    if (k > 0 && k < 1) {
      const ctrl = at(0.44, 0.13);
      for (let i = 0; i < 8; i++) {
        const s = k - i * 0.035;
        if (s <= 0) continue;
        const p = bezier(palm, ctrl, eyes, s);
        g.circle(p[0], p[1], unit * 0.011 * (1 - i / 10)).fill({ color: 0x8fe8ff, alpha: 0.9 * (1 - i / 10) });
      }
    }
    const gl = Math.sin(Math.PI * span(t, 1.0, 1.35));
    glint.alpha = 0.55 * gl;
    glint.rotation = t;
    glint.scale.set((unit / 120) * 0.14 * gl);
    if (t < 1.1 && Math.random() < 0.35) steam.puff(bowl[0] + rnd(-1, 1) * unit * 0.07, bowl[1] - unit * 0.03, { vy: -unit * rnd(0.12, 0.22), vx: rnd(-1, 1) * unit * 0.02, size: unit * 0.09, life: 1.1, grow: 2, tint: 0xd9d2c6, alpha: 0.22 * fade });
    steam.step(dt);
    return t < 1.5 || steam.list.length > 0;
  });
  await done();
}

export async function amazeAmusements(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const apex = at(0.385, 0.08);
  const base = at(0.47, 0.44);
  const ribbon: Pt[] = [at(0.04, 0.33), at(0.1, 0.25), at(0.18, 0.19), at(0.27, 0.15), at(0.34, 0.12)];
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  const star = glowSprite(fx, sparkTexture(), 0xffe9a0);
  star.position.set(...apex);
  const along = (path: Pt[], s: number): Pt => {
    const f = Math.min(path.length - 1.0001, Math.max(0, s * (path.length - 1)));
    const i = Math.floor(f);
    return lerp(path[i], path[i + 1], f - i);
  };
  const spiral = (s: number): Pt => {
    const c = lerp(base, apex, s);
    const rx = rect.width * (0.02 + 0.22 * (1 - s));
    const a = s * Math.PI * 7;
    return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * rx * 0.22];
  };
  await run(app, (t) => {
    g.clear();
    const k = ease.inOut(span(t, 0, 0.6));
    if (k > 0 && k < 1)
      for (let i = 0; i < 10; i++) {
        const s = k - i * 0.03;
        if (s <= 0) continue;
        const p = along(ribbon, s);
        g.circle(p[0], p[1], unit * 0.012 * (1 - i / 10)).fill({ color: 0xdff0ff, alpha: 0.9 * (1 - i / 10) });
      }
    const up = ease.inOut(span(t, 0.35, 1.25));
    if (up > 0 && up < 1) {
      const tail = Math.max(0, up - 0.18);
      for (let i = 0; i < 24; i++) {
        const s0 = tail + ((up - tail) * i) / 24;
        const s1 = tail + ((up - tail) * (i + 1)) / 24;
        const front = Math.sin(s1 * Math.PI * 7) > 0;
        g.moveTo(...spiral(s0))
          .lineTo(...spiral(s1))
          .stroke({ width: 3 * ((i + 1) / 24) + 0.8, color: front ? 0xdff4ff : 0x4a78a8, alpha: (front ? 0.95 : 0.5) * ((i + 1) / 24), cap: "round" });
      }
      const h = spiral(up);
      g.circle(h[0], h[1], unit * 0.014).fill({ color: 0xf4fbff, alpha: 0.95 });
    }
    const s = Math.sin(Math.PI * span(t, 1.15, 1.55));
    star.alpha = 0.8 * s;
    star.rotation = t * 2;
    star.scale.set((unit / 120) * 0.3 * s);
    return t < 1.55;
  });
  await done();
}

export async function anoeticVoid(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const orbs: Pt[] = [at(0.45, 0.145), at(0.715, 0.15)];
  const figure = at(0.463, 0.47);
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  const embers = new Emitter(soft);
  const pulses = orbs.map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xff7a3a);
    s.position.set(...p);
    return s;
  });
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.6);
    pulses.forEach((s, i) => {
      const beat = Math.max(0, Math.sin(Math.PI * span(t, 0.1 + i * 0.15, 0.7 + i * 0.15)), Math.sin(Math.PI * span(t, 0.75 + i * 0.15, 1.3 + i * 0.15)));
      s.alpha = 0.45 * beat;
      s.scale.set((unit / 128) * 0.14);
      for (let r = 0; r < 2; r++) {
        const k = span(t, 0.15 + i * 0.15 + r * 0.6, 0.75 + i * 0.15 + r * 0.6);
        if (k > 0 && k < 1) g.circle(orbs[i][0], orbs[i][1], unit * (0.06 + 0.12 * ease.out(k))).stroke({ width: 1.8, color: 0xffd0a0, alpha: 0.85 * (1 - k) });
      }
    });
    const lit = Math.sin(Math.PI * span(t, 0.2, 1.5));
    g.moveTo(figure[0], figure[1])
      .lineTo(figure[0], figure[1] - unit * 0.12)
      .stroke({ width: unit * 0.02, color: 0xffd2a0, alpha: 0.25 * lit });
    g.ellipse(figure[0], figure[1] + unit * 0.01, unit * 0.04, unit * 0.008).fill({ color: 0xffc080, alpha: 0.45 * lit });
    if (t < 1.2 && Math.random() < 0.5) embers.add(sparkTexture(), ...at(rnd(0.4, 0.75), rnd(0.43, 0.49)), { vx: rnd(-1, 1) * unit * 0.04, vy: -unit * rnd(0.15, 0.35), life: rnd(0.6, 0.9), tint: Math.random() < 0.4 ? 0xffc080 : 0xff6a2a, scale: (unit / 180) * rnd(0.12, 0.2), alpha: 0.8 * fade });
    embers.step(dt);
    return t < 1.6 || embers.list.length > 0;
  });
  await done();
}

export async function betaBuild(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const glitch = new GlitchFilter({ slices: 10, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  root.addChild(fx);
  const soft = calm(root);
  const lines = new Graphics();
  soft.addChild(lines);
  clip(root, soft, [at(0.03, 0.07), at(0.97, 0.07), at(0.97, 0.5), at(0.03, 0.5)]);
  const visor = glowSprite(fx, glowTexture(), 0x7dff9a);
  visor.position.set(...at(0.38, 0.18));
  const flickers = [0.15, 0.4, 0.55];
  await run(app, (t) => {
    lines.clear();
    const on = span(t, 0, 0.15) * (1 - span(t, 1.1, 1.4));
    const off = (t * 0.08) % 0.025;
    for (let v = 0.07 + off; v < 0.5; v += 0.025) lines.moveTo(...at(0.03, v)).lineTo(...at(0.97, v));
    lines.stroke({ width: 1, color: 0x6a4aa8, alpha: 0.35 * on });
    const band = 0.05 + 0.5 * ease.inOut(span(t, 0.1, 0.9));
    if (band < 0.52) {
      lines.poly([...at(0.03, band - 0.05), ...at(0.97, band - 0.05), ...at(0.97, band), ...at(0.03, band)]).fill({ color: 0x3a1f70, alpha: 0.28 * on });
      lines
        .moveTo(...at(0.03, band))
        .lineTo(...at(0.97, band))
        .stroke({ width: 2, color: 0x5aff8a, alpha: 0.9 * on });
    }
    const flick = flickers.some((f) => t > f && t < f + 0.06);
    card.filters = flick ? [glitch] : [];
    glitch.offset = unit * 0.015;
    glitch.seed = Math.random();
    const v = span(t, 0.9, 1.05) * (1 - span(t, 1.25, 1.4));
    visor.alpha = 0.8 * v;
    visor.scale.set((unit / 128) * 0.09);
    return t < 1.4;
  });
  card.filters = [];
  soft.mask = null;
  await done();
}

export async function blingPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c: [number, number] = [0.59, 0.365];
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  const cells: { p: Pt; d: number }[] = [];
  const step = 0.028;
  for (let row = -6; row <= 6; row++)
    for (let col = -6; col <= 6; col++) {
      const u = c[0] + (col + (row % 2 ? 0.5 : 0)) * step;
      const v = c[1] + row * step * 0.8;
      const e = ((u - c[0]) / 0.135) ** 2 + ((v - c[1]) / 0.11) ** 2;
      if (e < 1) cells.push({ p: at(u, v), d: (u - (c[0] - 0.135)) / 0.27 });
    }
  const gems = [at(0.52, 0.35), at(0.52, 0.41), at(0.515, 0.44)].map((p, i) => {
    const s = glowSprite(fx, sparkTexture(), [0x8aff8a, 0xd08aff, 0xffe08a][i]);
    s.position.set(...p);
    return s;
  });
  await run(app, (t) => {
    g.clear();
    const wave = span(t, 0.05, 0.9) * 1.4 - 0.2;
    const r = unit * step * 0.42;
    for (const cell of cells) {
      const a = Math.max(0, 1 - Math.abs(cell.d - wave) * 5);
      if (a <= 0) continue;
      const pts: number[] = [];
      for (let i = 0; i < 6; i++) pts.push(cell.p[0] + Math.cos((i * Math.PI) / 3) * r, cell.p[1] + Math.sin((i * Math.PI) / 3) * r);
      g.poly(pts).stroke({ width: 1.5, color: 0xc8f2ff, alpha: 0.95 * a });
    }
    gems.forEach((gm, i) => {
      const f = Math.sin(Math.PI * span(t, 0.8 + i * 0.12, 1.15 + i * 0.12));
      gm.alpha = 0.8 * f;
      gm.scale.set((unit / 120) * 0.15 * f);
    });
    return t < 1.45;
  });
  await done();
}

export async function charmOffensive(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const pair = at(0.64, 0.23);
  root.addChild(fx);
  const soft = calm(root);
  const shade = new Sprite(vignetteTexture());
  shade.anchor.set(0.5);
  shade.position.set(...pair);
  soft.addChild(shade);
  const m = new Graphics();
  quad(m, at, 0, 0, 1, 1).fill(0xffffff);
  root.addChild(m);
  soft.mask = m;
  const smile = glowSprite(fx, sparkTexture(), 0xfff0d0);
  smile.position.set(...at(0.535, 0.215));
  const earring = glowSprite(fx, sparkTexture(), 0xffd8a0);
  earring.position.set(...at(0.735, 0.29));
  await run(app, (t) => {
    const f = Math.sin(Math.PI * span(t, 0, 1.5));
    shade.alpha = 0.75 * f;
    shade.scale.set((Math.max(rect.width, rect.height) * 1.6) / 256);
    const a = Math.sin(Math.PI * span(t, 0.45, 0.8));
    smile.alpha = 0.9 * a;
    smile.rotation = 0.3;
    smile.scale.set((unit / 120) * 0.3 * a);
    const b = Math.sin(Math.PI * span(t, 0.8, 1.15));
    earring.alpha = 0.9 * b;
    earring.scale.set((unit / 120) * 0.24 * b);
    return t < 1.5;
  });
  soft.mask = null;
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

export async function cleaverPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const pane = PANE.map(([u, v]) => at(u, v)) as [Pt, Pt, Pt, Pt];
  root.addChild(fx);
  const soft = calm(root);
  const sheen = new Graphics();
  soft.addChild(sheen);
  clip(root, sheen, pane);
  const edge = new Graphics();
  soft.addChild(edge);
  const embers = new Emitter(soft);
  const arm: [Pt, Pt] = [at(0.05, 0.47), at(0.4, 0.34)];
  await run(app, (t, dt) => {
    sheen.clear();
    edge.clear();
    const s = ease.inOut(span(t, 0.1, 0.9));
    if (s > 0 && s < 1)
      for (const [w, a] of [
        [0.12, 0.18],
        [0.05, 0.3],
      ] as const) {
        const a0 = bilinear(pane, s - w, -0.2);
        const a1 = bilinear(pane, s + w, -0.2);
        const b1 = bilinear(pane, s + w - 0.15, 1.2);
        const b0 = bilinear(pane, s - w - 0.15, 1.2);
        sheen.poly([...a0, ...a1, ...b1, ...b0]).fill({ color: 0xffe6ee, alpha: a });
      }
    const o = Math.sin(Math.PI * span(t, 0, 1.2));
    edge.poly(pane.flat()).stroke({ width: 1, color: 0xffb0c0, alpha: 0.45 * o });
    if (t < 1.1 && Math.random() < 0.45) {
      const p = lerp(arm[0], arm[1], Math.random());
      embers.add(sparkTexture(), p[0] + rnd(-1, 1) * unit * 0.02, p[1] + rnd(-1, 1) * unit * 0.02, { vx: unit * rnd(0.05, 0.25), vy: -unit * rnd(0.1, 0.25), life: 0.5, tint: Math.random() < 0.3 ? 0xffc090 : 0xff5a2a, scale: (unit / 180) * 0.18, alpha: 0.85 });
    }
    embers.step(dt);
    return t < 1.4 || embers.list.length > 0;
  });
  sheen.mask = null;
  await done();
}

export async function cleaver(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, world, fx, done, unit, at } = sc;
  const pane = PANE.map(([u, v]) => at(u, v)) as [Pt, Pt, Pt, Pt];
  const mid = bilinear(pane, 0.5, 0.5);
  root.addChild(fx);
  const glint = glowSprite(fx, sparkTexture(), 0xffd6e0);
  glint.position.set(...bilinear(pane, 0.2, 0.15));
  const soft = calm(world);
  const g = new Graphics();
  soft.addChild(g);
  const shards = new Emitter(soft);
  let hit = false;
  await run(
    app,
    (t, dt) => {
      g.clear();
      const gl = Math.sin(Math.PI * span(t, 0, 0.3));
      glint.alpha = 0.7 * gl;
      glint.scale.set((unit / 120) * 0.2 * gl);
      const self = root.toGlobal({ x: mid[0], y: mid[1] });
      const to: Pt = sc.strike ?? [self.x, self.y];
      const R = unit * (sc.strike ? 0.75 : 0.45);
      const k = ease.out(span(t, 0.25, 0.5));
      const fade = 1 - span(t, 0.5, 0.85);
      if (k > 0 && fade > 0) {
        const a0 = -2.4;
        const a1 = a0 + 2.2 * k;
        const outer: number[] = [];
        const inner: number[] = [];
        for (let i = 0; i <= 20; i++) {
          const a = a0 + ((a1 - a0) * i) / 20;
          const thick = Math.sin((Math.PI * i) / 20) * R * 0.16;
          outer.push(to[0] + Math.cos(a) * R, to[1] + Math.sin(a) * R * 0.75);
          inner.unshift(to[0] + Math.cos(a) * (R - thick), to[1] + Math.sin(a) * (R - thick) * 0.75);
        }
        g.poly([...outer, ...inner]).fill({ color: 0xff3b55, alpha: 0.55 * fade });
        g.poly(outer, false).stroke({ width: 1.4, color: 0xffd0da, alpha: 0.85 * fade });
      }
      if (!hit && t > 0.42) {
        hit = true;
        for (let i = 0; i < 16; i++) shards.add(triTexture(), to[0] + rnd(-1, 1) * R * 0.3, to[1] + rnd(-1, 1) * R * 0.2, { vx: rnd(-1, 1) * unit * 1.6, vy: rnd(-1.2, 0.2) * unit * 1.3, gravity: unit * 3, spin: rnd(-8, 8), life: 0.55, tint: i % 3 ? 0xff6a7c : 0xffc8d2, scale: (unit / 180) * rnd(0.2, 0.4), alpha: 0.85 });
        navigator.vibrate?.(20);
      }
      shards.step(dt);
      return t < 0.9 || shards.list.length > 0;
    },
    sc.strike ? 1.1 : 1,
  );
  g.destroy();
  await done();
}

export async function cookbook(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  const motes = new Emitter(soft);
  const pages = Array.from({ length: 4 }, (_, i) => ({ u: 0.4 + i * 0.07, d: i * 0.18, tilt: rnd(-0.08, 0.08) }));
  await run(app, (t, dt) => {
    g.clear();
    for (const p of pages) {
      const k = span(t, p.d, p.d + 0.9);
      if (k <= 0 || k >= 1) continue;
      const e = ease.out(k);
      const v = 0.3 - 0.12 * e;
      const w = 0.09;
      const h = 0.045;
      const pts = [at(p.u, v), at(p.u + w, v - 0.02 + p.tilt * 0.2), at(p.u + w + 0.02, v + h), at(p.u + 0.02, v + h + 0.02)];
      const a = Math.sin(Math.PI * k);
      g.poly(pts.flat())
        .fill({ color: 0x8a3a10, alpha: 0.25 * a })
        .stroke({ width: 1.5, color: 0xfff0c8, alpha: 0.95 * a });
      if (Math.random() < 0.15) motes.add(sparkTexture(), ...pts[0], { vy: -unit * 0.08, life: 0.45, tint: 0xffd08a, scale: (unit / 180) * 0.15, alpha: 0.8 });
    }
    motes.step(dt);
    return t < 1.5 || motes.list.length > 0;
  });
  await done();
}

const SCREEN: Pt[] = [
  [0.28, 0.245],
  [0.44, 0.255],
  [0.43, 0.345],
  [0.27, 0.335],
];

export async function detentePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const screen = SCREEN.map(([u, v]) => at(u, v)) as [Pt, Pt, Pt, Pt];
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  clip(root, g, screen);
  const chips = [at(0.12, 0.465), at(0.29, 0.49)].map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xffc0b0);
    s.position.set(...p);
    return s;
  });
  await run(app, (t) => {
    g.clear();
    const on = span(t, 0, 0.15) * (1 - span(t, 1.0, 1.3));
    for (let i = 0; i < 2; i++) {
      const v = ((t * 0.9 + i * 0.5) % 1.2) - 0.1;
      g.moveTo(...bilinear(screen, -0.1, v))
        .lineTo(...bilinear(screen, 1.1, v))
        .stroke({ width: unit * 0.012, color: 0xd0f6ff, alpha: 0.8 * on });
    }
    g.poly(screen.flat()).fill({ color: 0x6ad8ff, alpha: 0.18 * on * (Math.random() < 0.1 ? 0.3 : 1) });
    chips.forEach((c, i) => {
      const f = Math.sin(Math.PI * span(t, 0.55 + i * 0.25, 0.9 + i * 0.25));
      c.alpha = 0.9 * f;
      c.rotation = t;
      c.scale.set((unit / 120) * 0.24 * f);
    });
    return t < 1.3;
  });
  g.mask = null;
  await done();
}

export async function detente(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const screen = SCREEN.map(([u, v]) => at(u, v)) as [Pt, Pt, Pt, Pt];
  const face = bilinear(screen, 0.5, 0.5);
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  const chips = [at(0.12, 0.465), at(0.29, 0.49)];
  const glow = glowSprite(fx, glowTexture(), 0x6ad8ff);
  glow.position.set(...face);
  await run(app, (t) => {
    g.clear();
    const p = Math.sin(Math.PI * span(t, 0, 0.5));
    glow.alpha = 0.35 * p;
    glow.scale.set((unit / 128) * 0.14);
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.1 + i * 0.15, 0.7 + i * 0.15);
      if (k <= 0 || k >= 1) continue;
      g.circle(face[0], face[1], unit * (0.06 + 0.22 * ease.out(k))).stroke({ width: 1.2, color: 0x9fe8ff, alpha: 0.6 * (1 - k) });
    }
    chips.forEach((c, i) => {
      const k = span(t, 0.45 + i * 0.12, 0.75 + i * 0.12);
      if (k <= 0 || k >= 1) return;
      const y = c[1] - Math.sin(Math.PI * k) * unit * 0.04;
      g.ellipse(c[0], y, unit * 0.025, unit * 0.008)
        .fill({ color: 0xff5a5a, alpha: 0.6 * Math.sin(Math.PI * k) })
        .stroke({ width: 1, color: 0xffd0c8, alpha: 0.8 * Math.sin(Math.PI * k) });
    });
    return t < 1.1;
  });
  await done();
}

const RODS: [number, number, number, number][] = [
  [0.2, 0.6, 0.33, 0.92],
  [0.27, 0.58, 0.4, 0.93],
  [0.37, 0.57, 0.48, 0.93],
  [0.47, 0.55, 0.56, 0.93],
  [0.58, 0.54, 0.66, 0.93],
];

export async function diviner(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  root.addChild(fx);
  const soft = calm(root);
  const g = new Graphics();
  soft.addChild(g);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 0.8, 1.1);
    RODS.forEach(([u0, v0, u1, v1], i) => {
      const k = ease.out(span(t, 0.03 + i * 0.07, 0.4 + i * 0.07));
      if (k <= 0) return;
      const bottom = at(u1, v1);
      const level = lerp(bottom, at(u0, v0), k);
      g.moveTo(...bottom)
        .lineTo(...level)
        .stroke({ width: unit * 0.022, color: 0x3dff7a, alpha: 0.3 * fade, cap: "round" });
      g.moveTo(...bottom)
        .lineTo(...level)
        .stroke({ width: 1.2, color: 0xc8ffd4, alpha: 0.85 * fade, cap: "round" });
    });
    return t < 1.1;
  });
  await done();
}

export async function divinerFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  root.addChild(fx);
  const own = calm(root);
  const g = new Graphics();
  own.addChild(g);
  const far = calm(world);
  const w = new Graphics();
  far.addChild(w);
  const target = runnerAt(board);
  const order = [3, 0, 4, 1, 2];
  const pick = 2;
  let hit = false;
  await run(app, (t) => {
    g.clear();
    w.clear();
    order.forEach((r, i) => {
      const f = Math.sin(Math.PI * span(t, i * 0.07, i * 0.07 + 0.2));
      const keep = r === pick ? span(t, 0.35, 0.45) * (1 - span(t, 0.9, 1.1)) : 0;
      const a = Math.max(f, keep);
      if (a <= 0) return;
      const [u0, v0, u1, v1] = RODS[r];
      g.moveTo(...at(u0, v0))
        .lineTo(...at(u1, v1))
        .stroke({ width: unit * 0.022, color: 0x3dff7a, alpha: 0.3 * a, cap: "round" });
      g.moveTo(...at(u0, v0))
        .lineTo(...at(u1, v1))
        .stroke({ width: 1.2, color: 0xc8ffd4, alpha: 0.85 * a, cap: "round" });
    });
    const k = span(t, 0.45, 0.75);
    if (k > 0) {
      const [u0, v0, u1, v1] = RODS[pick];
      const m = at((u0 + u1) / 2, (v0 + v1) / 2);
      const src = root.toGlobal({ x: m[0], y: m[1] });
      const head = lerp([src.x, src.y], target, ease.inOut(k));
      const tail = lerp([src.x, src.y], target, Math.max(0, ease.inOut(k) - 0.3));
      const a = 1 - span(t, 0.8, 1.05);
      w.moveTo(...tail)
        .lineTo(...head)
        .stroke({ width: 1.6, color: 0x7dffa0, alpha: 0.85 * a, cap: "round" });
    }
    const r = span(t, 0.75, 1.1);
    if (r > 0 && r < 1) w.circle(target[0], target[1], unit * (0.08 + 0.2 * ease.out(r))).stroke({ width: 1.4, color: 0x7dffa0, alpha: 0.7 * (1 - r) });
    if (!hit && t > 0.75) {
      hit = true;
      jolt(board, 0.3);
    }
    return t < 1.1;
  });
  w.destroy();
  await done();
}

