import { type Container, type Filter, Graphics, Sprite, type Texture } from "pixi.js";
import { GlitchFilter, GlowFilter, GodrayFilter, RGBSplitFilter, ShockwaveFilter, TwistFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, Fire, Smoke, CREDIT, CYAN, GOLD, GREEN, RED, type Ready, VIOLET, WHITE, burst, flyHome, homing, painted, pt, scene, shimmer } from "./kit";

export type Pt = [number, number];
const ORANGE = 0xff8a2a;
const PINK = 0xff4f9a;
const TOXIC = 0xff4a6a;
const EMBER = 0xff9a5a;
const FLESH = 0xffd6e4;

export const glyphTexture = () =>
  painted("glyph", 48, 48, (g) => {
    g.fillStyle = "#fff";
    g.font = "40px anr-icon";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(CREDIT, 24, 25);
  });

const heartTexture = () =>
  painted("heart", 48, 44, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(24, 40);
    g.bezierCurveTo(4, 26, 2, 12, 12, 6);
    g.bezierCurveTo(19, 2, 24, 8, 24, 12);
    g.bezierCurveTo(24, 8, 29, 2, 36, 6);
    g.bezierCurveTo(46, 12, 44, 26, 24, 40);
    g.fill();
  });

const chatTexture = () =>
  painted("chat", 56, 36, (g) => {
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath();
    g.roundRect(2, 2, 52, 24, 8);
    g.moveTo(12, 25);
    g.lineTo(8, 34);
    g.lineTo(20, 25);
    g.fill();
    g.fillStyle = "rgba(40,40,60,0.55)";
    g.fillRect(9, 10, 26, 3);
    g.fillRect(9, 16, 36, 3);
  });

export const cubeTexture = () =>
  painted("cube", 32, 32, (g) => {
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(6, 6, 20, 20);
    g.strokeStyle = "#fff";
    g.lineWidth = 2.5;
    g.strokeRect(6, 6, 20, 20);
  });

export const shardTexture = () =>
  painted("shard", 40, 40, (g) => {
    g.fillStyle = "#0a0a0d";
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(4, 30);
    g.lineTo(22, 4);
    g.lineTo(36, 26);
    g.lineTo(18, 36);
    g.closePath();
    g.fill();
    g.stroke();
  });

export const leafTexture = () =>
  painted("leaf", 40, 22, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(2, 11);
    g.quadraticCurveTo(20, -4, 38, 11);
    g.quadraticCurveTo(20, 26, 2, 11);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(4, 11);
    g.lineTo(36, 11);
    g.stroke();
  });

export const lerp = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function tether(g: Graphics, a: Pt, b: Pt, k: number, color: number, width: number, alpha = 1, wobble = 0, t = 0): Pt {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / d;
  const ny = (b[0] - a[0]) / d;
  const c: Pt = [(a[0] + b[0]) / 2 + nx * d * 0.18, (a[1] + b[1]) / 2 + ny * d * 0.18];
  const at = (s: number): Pt => {
    const u = 1 - s;
    const w = wobble * Math.sin(s * 14 - t * 9) * Math.sin(Math.PI * s);
    return [u * u * a[0] + 2 * u * s * c[0] + s * s * b[0] + nx * w, u * u * a[1] + 2 * u * s * c[1] + s * s * b[1] + ny * w];
  };
  const n = 28;
  const end = Math.max(0, Math.min(1, k));
  for (const [w, al] of [
    [width * 3.5, 0.25],
    [width, 1],
  ] as const) {
    g.moveTo(...at(0));
    for (let i = 1; i <= n; i++) g.lineTo(...at((i / n) * end));
    g.stroke({ width: w, color: al === 1 ? WHITE : color, alpha: al * alpha, cap: "round", join: "round" });
  }
  return at(end);
}

function addFilter(target: Sprite, f: Filter) {
  target.filters = [...((target.filters as Filter[] | undefined) ?? []), f];
}

export function glowSprite(parent: Container, tex: Texture, tint: number) {
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  s.blendMode = "add";
  s.tint = tint;
  s.alpha = 0;
  parent.addChild(s);
  return s;
}

export function quad(g: Graphics, at: (u: number, v: number) => Pt, u0: number, v0: number, u1: number, v1: number) {
  return g.poly([...at(u0, v0), ...at(u1, v0), ...at(u1, v1), ...at(u0, v1)]);
}

export function pose(color: number, glint: Pt) {
  return async (rect: DOMRect, code: string, ready?: Ready, board?: Board) => {
    const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
    const mask = new Graphics();
    root.addChild(mask);
    card.mask = mask;
    const glow = new GlowFilter({ color, distance: 10, outerStrength: 0, innerStrength: 0, quality: 0.3 });
    addFilter(card, glow);
    const line = new Graphics();
    line.blendMode = "add";
    const frame = new Graphics();
    frame.blendMode = "add";
    fx.addChild(frame, line);
    const sparks = new Emitter(fx);
    const star = glowSprite(fx, sparkTexture(), WHITE);
    star.position.set(...at(...glint));
    root.addChild(fx);
    await run(app, (t, dt) => {
      const k = ease.inOut(span(t, 0.05, 0.75));
      const v = -0.03 + k * 1.06;
      mask.clear();
      quad(mask, at, -0.02, -0.02, 1.02, Math.max(0, v)).fill(0xffffff);
      line.clear();
      frame.clear();
      const f = 1 - span(t, 0.7, 1.1);
      quad(frame, at, 0, 0, 1, 1).stroke({ width: unit * 0.012, color, alpha: 0.7 * f * span(t, 0, 0.12) });
      for (let i = 1; i < 6; i++) {
        const u = i / 6;
        frame.moveTo(...at(u, Math.max(0, v))).lineTo(...at(u, 1));
      }
      frame.stroke({ width: 1, color, alpha: 0.35 * f });
      if (k > 0 && k < 1) {
        line.moveTo(...at(-0.03, v)).lineTo(...at(1.03, v));
        line.stroke({ width: unit * 0.05, color, alpha: 0.35 });
        line.moveTo(...at(-0.03, v)).lineTo(...at(1.03, v));
        line.stroke({ width: unit * 0.012, color: WHITE, alpha: 0.95 });
        if (Math.random() < 0.8) sparks.add(sparkTexture(), ...at(Math.random(), v), { vx: rnd(-20, 20), vy: rnd(-30, 10), life: 0.4, tint: color, scale: 0.3 * (unit / 180), grow: -0.6 });
      }
      glow.outerStrength = 2.4 * Math.sin(Math.PI * span(t, 0.6, 1.25));
      const g = Math.sin(Math.PI * span(t, 0.75, 1.25));
      star.alpha = g;
      star.rotation = t * 2;
      star.scale.set((0.25 + 0.5 * g) * (unit / 120));
      sparks.step(dt);
      return t < 1.3 || sparks.list.length > 0;
    });
    card.mask = null;
    await done();
  };
}

export async function transferOfWealth(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const src = board?.drained ? pt(board.drained) : at(0.62, 0.24);
  const bar = { u0: 0.17, u1: 0.41, v: 0.315 };
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const trail = new Emitter(fx);
  const glyphs = Array.from({ length: 22 }, (_, i) => ({ at: 0.15 + i * 0.045, arc: rnd(0.05, 0.16), s: glowSprite(fx, glyphTexture(), 0x9ff7d8) }));
  root.addChild(fx);
  let flashed = false;
  await run(app, (t, dt) => {
    const fill = ease.inOut(span(t, 0.25, 1.35));
    const fade = 1 - span(t, 1.7, 2.1);
    g.clear();
    const [x0, y0] = at(bar.u0, bar.v);
    const [x1] = at(bar.u1, bar.v);
    const h = unit * 0.016;
    g.roundRect(Math.min(x0, x1), y0 - h / 2, Math.abs(x1 - x0), h, h / 2).stroke({ width: 1.5, color: CYAN, alpha: 0.8 * fade * span(t, 0, 0.2) });
    g.roundRect(Math.min(x0, x1), y0 - h / 2, Math.abs(x1 - x0) * fill, h, h / 2).fill({ color: 0x9ff7d8, alpha: 0.85 * fade });
    const dst = at(bar.u0 + (bar.u1 - bar.u0) * Math.min(1, fill + 0.05), bar.v);
    for (const gl of glyphs) {
      const k = span(t, gl.at, gl.at + 0.55);
      gl.s.alpha = k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
      if (k <= 0 || k >= 1) continue;
      const e = ease.inOut(k);
      const [x, y] = lerp(src, dst, e);
      const lift = Math.sin(Math.PI * e) * unit * gl.arc * 2;
      gl.s.position.set(x, y - lift);
      gl.s.scale.set(0.28 * (unit / 180));
      if (Math.random() < 0.5) trail.add(sparkTexture(), x, y - lift, { life: 0.25, tint: CYAN, scale: 0.18 * (unit / 180), grow: -0.5 });
    }
    if (fill >= 1 && !flashed) {
      flashed = true;
      burst(trail, x1, y0, 16, 0x9ff7d8, unit * 1.4, { life: 0.5, scale: 0.35 });
    }
    trail.step(dt);
    return t < 2.15 || trail.list.length > 0;
  });
  await done();
}

function fireball(fire: Fire, x: number, y: number, r: number, n: number) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const d = Math.sqrt(Math.random());
    const v = r * (1.2 + 2.2 * d);
    fire.emit(x + Math.cos(a) * r * 0.2 * d, y + Math.sin(a) * r * 0.2 * d, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8, size: r * rnd(0.5, 0.9) * (1.2 - d * 0.5), life: rnd(0.55, 0.95) });
  }
}

export async function measuredResponse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const blast = at(0.84, 0.25);
  const tail = at(0.23, 0.28);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.03, wavelength: unit * 0.25, speed: unit * 1.8, brightness: 1.1, radius: unit * 0.6, time: 0 });
  card.filters = [wave];
  const heat = shimmer(root, card, rect, unit * 0.02);
  const smoke = new Smoke(fx);
  const fire = new Fire(fx, undefined, unit * 0.9);
  const debris = new Emitter(fx);
  const flash = glowSprite(fx, glowTexture(), 0xfff6e0);
  flash.position.set(...blast);
  const ring = new Graphics();
  ring.blendMode = "add";
  fx.addChild(ring);
  const engine = glowSprite(fx, glowTexture(), 0x7fd8ff);
  engine.position.set(...tail);
  root.addChild(fx);
  const salvo = board?.grip ? Array.from({ length: 6 }, (_, i) => homing(fx, glowTexture(), blast, pt(board.grip!), 0.45 + i * 0.05, ORANGE, (unit / 128) * 0.1, rnd(-1, 1) * unit * 0.6)) : [];
  const pops = [
    { t: 0.32, at: at(0.72, 0.18) },
    { t: 0.48, at: at(0.93, 0.33) },
    { t: 0.62, at: at(0.68, 0.33) },
  ].map((p) => ({ ...p, done: false }));
  let struck = false;
  let boomed = false;
  const base = card.position.clone();
  await run(app, (t, dt) => {
    if (t > 0.1 && !boomed) {
      boomed = true;
      fireball(fire, ...blast, unit * 0.12, 26);
      for (let i = 0; i < 22; i++) {
        const a = rnd(-Math.PI * 0.95, 0.1);
        const v = unit * rnd(1, 2.4);
        debris.add(sparkTexture(), blast[0], blast[1], { vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: unit * 2.6, drag: 0.5, life: rnd(0.7, 1.2), tint: i % 3 ? 0xffc070 : WHITE, scale: 0.28 * (unit / 180) });
      }
      navigator.vibrate?.([40, 30, 80]);
    }
    for (const p of pops)
      if (!p.done && t > p.t) {
        p.done = true;
        fireball(fire, ...p.at, unit * 0.07, 12);
      }
    for (const d of debris.list) if (Math.random() < 0.3) fire.emit(d.s.x, d.s.y, { vx: 0, vy: 0, size: unit * 0.025, life: 0.25 });
    if (t > 0.35 && t < 1.5 && Math.random() < 0.45) smoke.puff(blast[0] + rnd(-1, 1) * unit * 0.18, blast[1] + rnd(-0.6, 0.2) * unit * 0.12, { vx: rnd(-1, 1) * unit * 0.08, vy: -unit * rnd(0.12, 0.25), life: 1.8, size: unit * rnd(0.16, 0.24), grow: 2.2, tint: 0x2a2220, alpha: 0.55 });
    wave.center = filterPoint(card, ...blast);
    wave.time = Math.max(0, t - 0.1);
    flash.alpha = t < 0.1 ? t / 0.1 : Math.max(0, 1 - (t - 0.1) / 0.18);
    flash.scale.set((unit / 128) * (0.25 + 0.5 * ease.out(span(t, 0.05, 0.3))));
    ring.clear();
    const rk = span(t, 0.1, 0.55);
    if (rk > 0 && rk < 1) ring.circle(...blast, unit * (0.05 + 0.5 * ease.out(rk))).stroke({ width: unit * 0.02 * (1 - rk) + 1, color: 0xffe0b0, alpha: 0.7 * (1 - rk) });
    engine.alpha = (0.45 + 0.35 * Math.sin(t * 40)) * (1 - span(t, 1.5, 1.9));
    engine.scale.set((unit / 128) * 0.12);
    const quake = t > 0.1 && t < 0.6 ? (1 - (t - 0.1) / 0.5) * unit * 0.02 : 0;
    card.position.set(base.x + rnd(-1, 1) * quake, base.y + rnd(-1, 1) * quake);
    heat(t, Math.sin(Math.PI * span(t, 0.1, 1.8)));
    if (flyHome(salvo, t, debris, ORANGE) === salvo.length && salvo.length && !struck) {
      struck = true;
      const [gx, gy] = pt(board!.grip!);
      fireball(fire, gx, gy, unit * 0.08, 14);
      navigator.vibrate?.([30, 20, 60]);
    }
    fire.step(dt);
    debris.step(dt);
    smoke.step(dt);
    return t < 1.9 || smoke.list.length > 0 || fire.list.length > 0;
  });
  card.position.copyFrom(base);
  await done();
}

export async function keyPerformanceIndicators(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const trend: Pt[] = [
    [0.68, 0.268],
    [0.73, 0.25],
    [0.78, 0.214],
    [0.83, 0.202],
    [0.9, 0.178],
  ];
  const holo = new Graphics();
  holo.blendMode = "add";
  const line = new Graphics();
  line.blendMode = "add";
  fx.addChild(holo, line);
  const sparks = new Emitter(fx);
  const tip = glowSprite(fx, sparkTexture(), WHITE);
  const hand = glowSprite(fx, glowTexture(), 0xbfefff);
  hand.position.set(...at(0.68, 0.268));
  const targets = (board?.advanced ?? []).map((r) => ({ p: pt(r), hit: false }));
  root.addChild(fx);
  let pinged = false;
  await run(app, (t, dt) => {
    const fade = 1 - span(t, targets.length ? 1.9 : 1.6, targets.length ? 2.3 : 2);
    holo.clear();
    const sweep = span(t, 0.05, 0.9);
    if (sweep > 0 && sweep < 1) {
      const u = -0.1 + sweep * 1.2;
      for (let i = 0; i < 6; i++) {
        const w = 0.012 * (i + 1);
        holo.poly([...at(u - w, 0.06), ...at(u + w, 0.06), ...at(u + w - 0.06, 0.33), ...at(u - w - 0.06, 0.33)]).fill({ color: 0xbff3ff, alpha: 0.05 });
      }
    }
    const k = ease.inOut(span(t, 0.55, 1.3));
    line.clear();
    const n = (trend.length - 1) * k;
    const full = Math.floor(n);
    const pts = trend.slice(0, full + 1).map(([u, v]) => at(u, v));
    if (full < trend.length - 1) pts.push(lerp(at(...trend[full]), at(...trend[full + 1]), n - full));
    if (pts.length > 1 && k > 0) {
      for (const [w, a, c] of [
        [unit * 0.035, 0.3, GOLD],
        [unit * 0.01, 1, WHITE],
      ] as const) {
        line.moveTo(...pts[0]);
        for (const p of pts.slice(1)) line.lineTo(...p);
        line.stroke({ width: w, color: c, alpha: a * fade, join: "round", cap: "round" });
      }
      const head = pts[pts.length - 1];
      tip.position.set(...head);
      tip.alpha = fade;
      tip.rotation = t * 3;
      tip.scale.set((unit / 120) * 0.35);
      if (k < 1 && Math.random() < 0.6) sparks.add(sparkTexture(), head[0], head[1], { vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.35, tint: GOLD, scale: 0.25 * (unit / 180), grow: -0.5 });
      if (k >= 1 && !pinged) {
        pinged = true;
        burst(sparks, head[0], head[1], 14, GOLD, unit * 1.2, { life: 0.5, scale: 0.35 });
      }
    }
    for (const tg of targets) {
      const k2 = ease.inOut(span(t, 1.3, 1.7));
      if (k2 <= 0) continue;
      const head = tether(line, at(0.9, 0.178), tg.p, k2, GOLD, unit * 0.01, 1 - span(t, 1.9, 2.3));
      if (k2 >= 1 && !tg.hit) {
        tg.hit = true;
        burst(sparks, ...head, 18, GOLD, unit * 1.2, { life: 0.5, scale: 0.35 });
      }
    }
    hand.alpha = 0.6 * Math.sin(Math.PI * span(t, 0.4, 1.2));
    hand.scale.set((unit / 128) * 0.12);
    sparks.step(dt);
    return t < (targets.length ? 2.3 : 2) || sparks.list.length > 0;
  });
  await done();
}

export async function seamlessLaunch(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const face = { u0: 0.36, v0: 0.1, u1: 0.68, v1: 0.27 };
  const c = at(0.52, 0.18);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const aura = glowSprite(fx, glowTexture(), VIOLET);
  aura.position.set(...c);
  const motes = new Emitter(fx);
  const eye = glowSprite(fx, sparkTexture(), 0xe8dcff);
  eye.position.set(...at(0.5, 0.17));
  const links = new Graphics();
  links.blendMode = "add";
  fx.addChild(links);
  const targets = (board?.advanced ?? []).map((r) => ({ p: pt(r), hit: false }));
  root.addChild(fx);
  await run(app, (t, dt) => {
    links.clear();
    for (const tg of targets) {
      const k = ease.inOut(span(t, 0.85, 1.3));
      if (k <= 0) continue;
      const head = tether(links, c, tg.p, k, VIOLET, unit * 0.012, 1 - span(t, 1.6, 2.1), unit * 0.02, t);
      if (k >= 1 && !tg.hit) {
        tg.hit = true;
        burst(motes, ...head, 18, VIOLET, unit * 1.2, { life: 0.5, scale: 0.35 });
      }
      const r = span(t, 1.3, 1.9);
      if (r > 0 && r < 1) links.circle(...tg.p, unit * (0.1 + 0.35 * ease.out(r))).stroke({ width: unit * 0.012 * (1 - r) + 1, color: VIOLET, alpha: 1 - r });
    }
    const fade = 1 - span(t, 1.5, 1.9);
    g.clear();
    const boot = ease.inOut(span(t, 0.05, 0.7));
    const sv = face.v0 + (face.v1 - face.v0) * boot;
    const lines = 16;
    for (let i = 0; i <= lines; i++) {
      const v = face.v0 + ((face.v1 - face.v0) * i) / lines;
      if (v > sv) break;
      const jitter = Math.random() < 0.06 ? rnd(-0.02, 0.02) : 0;
      g.moveTo(...at(face.u0 + jitter, v)).lineTo(...at(face.u1 + jitter, v));
    }
    g.stroke({ width: 1, color: 0xe2d2ff, alpha: 0.45 * fade * (1 - 0.5 * span(t, 0.9, 1.5)) });
    if (boot > 0 && boot < 1)
      g.moveTo(...at(face.u0 - 0.04, sv))
        .lineTo(...at(face.u1 + 0.04, sv))
        .stroke({ width: unit * 0.012, color: WHITE, alpha: 0.9 });
    for (let r = 0; r < 2; r++) {
      const k = span(t, 0.75 + r * 0.18, 1.5 + r * 0.18);
      if (k > 0 && k < 1) g.circle(c[0], c[1], unit * (0.08 + 0.45 * ease.out(k))).stroke({ width: unit * 0.012 * (1 - k) + 1, color: VIOLET, alpha: 1 - k });
    }
    aura.alpha = 0.45 * Math.sin(Math.PI * span(t, 0.1, 1.8));
    aura.scale.set((unit / 128) * 0.45);
    if (t > 0.7 && t < 1.4 && Math.random() < 0.5) motes.add(sparkTexture(), ...at(rnd(face.u0, face.u1), face.v1), { vy: -unit * rnd(0.3, 0.6), life: 0.8, tint: VIOLET, scale: 0.2 * (unit / 180), grow: -0.2 });
    const blink = Math.sin(Math.PI * span(t, 0.7, 1.05));
    eye.alpha = blink;
    eye.scale.set((unit / 120) * 0.4 * blink);
    motes.step(dt);
    return t < (targets.length ? 2.1 : 1.9) || motes.list.length > 0;
  });
  await done();
}

export async function hanseiReview(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const tubes: [number, number, number][] = [
    [0.59, 0.13, 0.29],
    [0.77, 0.13, 0.29],
    [0.9, 0.13, 0.29],
  ];
  const glass = new Graphics();
  glass.blendMode = "add";
  fx.addChild(glass);
  const petals = new Emitter(fx);
  const table = glowSprite(fx, glowTexture(), GREEN);
  table.position.set(...at(0.68, 0.3));
  root.addChild(fx);
  await run(app, (t, dt) => {
    const fade = 1 - span(t, 1.7, 2.1);
    glass.clear();
    tubes.forEach(([u, v0, v1], i) => {
      const k = span(t, 0.1 + i * 0.15, 0.7 + i * 0.15);
      if (k > 0 && k < 1) {
        const x = u - 0.07 + 0.14 * k;
        glass.poly([...at(x - 0.015, v0), ...at(x + 0.015, v0), ...at(x - 0.005, v1), ...at(x - 0.035, v1)]).fill({ color: WHITE, alpha: 0.55 * Math.sin(Math.PI * k) });
      }
      if (t > 0.2 + i * 0.15 && t < 1.3 + i * 0.15 && Math.random() < 0.7) {
        const [x, y] = at(u + rnd(-0.035, 0.035), rnd(v0 + 0.06, v1));
        petals.add(glowTexture(), x, y, { vx: rnd(-4, 4), vy: -unit * rnd(0.05, 0.1), life: rnd(0.6, 1), tint: i === 2 ? 0xffb347 : 0xff6a6a, scale: (unit / 128) * rnd(0.025, 0.045) });
      }
    });
    for (const p of petals.list) p.s.x += Math.sin(p.age * 4 + p.s.y * 0.05) * 0.15;
    table.alpha = (0.35 + 0.25 * (Math.random() < 0.15 ? 0 : 1)) * Math.sin(Math.PI * span(t, 0, 1.9));
    table.scale.set((unit / 128) * 0.18);
    petals.step(dt);
    return (t < 2.1 && fade > 0) || petals.list.length > 0;
  });
  await done();
}

export async function wildcatStrike(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const flare = at(0.23, 0.255);
  const fire = new Fire(fx, root, unit * 1.6);
  const wash = glowSprite(fx, glowTexture(), 0xff3a1a);
  const core = glowSprite(fx, glowTexture(), 0xffe6c8);
  wash.position.set(...flare);
  core.position.set(...flare);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.15) * (1 - span(t, 1.7, 2.1));
    const flick = 0.75 + 0.25 * Math.sin(t * 47) * Math.sin(t * 13);
    wash.alpha = on * 0.35 * flick;
    wash.scale.set((unit / 128) * 1.5);
    core.alpha = on * flick;
    core.scale.set((unit / 128) * 0.14);
    card.tint = on > 0 ? (flick > 0.9 ? 0xffd6d0 : 0xffe9e4) : WHITE;
    if (on > 0.2) for (let n = 0; n < 2; n++) fire.emit(flare[0] + rnd(-2, 2), flare[1], { vx: rnd(-1, 1) * unit * 0.12, vy: -unit * rnd(0.2, 0.45), size: unit * rnd(0.05, 0.08), life: rnd(0.4, 0.6) });
    if (on > 0 && Math.random() < 0.5) sparks.add(sparkTexture(), flare[0], flare[1], { vx: rnd(-1, 1) * unit * 0.5, vy: -unit * rnd(0.2, 0.7), gravity: unit * 1.8, life: rnd(0.4, 0.8), tint: Math.random() < 0.5 ? 0xff6a3d : 0xffd0a0, scale: 0.2 * (unit / 180) });
    sparks.step(dt);
    fire.step(dt);
    return t < 2.1 || fire.list.length > 0;
  });
  card.tint = WHITE;
  await done();
}

export async function dailyCasts(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const screens: [number, number, number, number][] = [
    [0.36, 0.083, 0.54, 0.149],
    [0.34, 0.19, 0.77, 0.29],
    [0.16, 0.25, 0.34, 0.37],
    [0.76, 0.33, 0.92, 0.43],
  ];
  const faces: Pt[] = [
    [0.06, 0.14],
    [0.29, 0.12],
    [0.59, 0.125],
    [0.71, 0.14],
    [0.825, 0.13],
    [0.9, 0.21],
    [0.96, 0.28],
    [0.825, 0.29],
    [0.26, 0.2],
    [0.14, 0.2],
    [0.04, 0.26],
  ];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const hearts = new Emitter(fx);
  const chats = new Emitter(fx);
  const live = glowSprite(fx, glowTexture(), RED);
  live.position.set(...at(0.52, 0.1));
  root.addChild(fx);
  await run(app, (t, dt) => {
    const fade = 1 - span(t, 1.7, 2.1);
    g.clear();
    screens.forEach(([u0, v0, u1, v1], i) => {
      const k = span(t, 0.05 + i * 0.1, 0.3 + i * 0.1);
      quad(g, at, u0, v0, u1, v1).fill({ color: CYAN, alpha: 0.18 * k * fade * (Math.random() < 0.08 ? 0.3 : 1) });
    });
    live.alpha = (Math.sin(t * 8) > 0 ? 0.9 : 0.25) * fade * span(t, 0, 0.2);
    live.scale.set((unit / 128) * 0.07);
    if (t < 1.5 && Math.random() < 0.5) {
      const [u, v] = faces[Math.floor(Math.random() * faces.length)];
      hearts.add(heartTexture(), ...at(u + rnd(-0.03, 0.03), v), { vx: rnd(-10, 10), vy: -unit * rnd(0.25, 0.45), life: rnd(0.8, 1.2), tint: Math.random() < 0.7 ? PINK : 0xff8fc4, scale: (unit / 180) * rnd(0.22, 0.34), grow: 0.05 });
    }
    if (t > 0.3 && t < 1.4 && Math.random() < 0.12) chats.add(chatTexture(), ...at(rnd(0.15, 0.85), rnd(0.15, 0.35)), { vy: -unit * 0.08, life: 0.7, tint: WHITE, scale: (unit / 180) * 0.32, alpha: 0.85, blend: "normal" });
    for (const p of hearts.list) p.s.x += Math.sin(p.age * 6 + p.s.y * 0.03) * 0.35;
    hearts.step(dt);
    chats.step(dt);
    return t < 2.1 || hearts.list.length > 0;
  });
  await done();
}

export async function teleworkContract(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const bite = at(0.63, 0.445);
  const beacons: Pt[] = [
    [0.705, 0.315],
    [0.27, 0.36],
  ];
  const lights = beacons.map((b) => {
    const s = glowSprite(fx, glowTexture(), 0xffb020);
    s.position.set(...at(...b));
    return s;
  });
  const cockpit = glowSprite(fx, glowTexture(), CYAN);
  cockpit.position.set(...at(0.71, 0.25));
  const dust = new Smoke(root);
  const rocks = new Emitter(fx);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const base = card.position.clone();
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.2) * (1 - span(t, 1.7, 2.1));
    lights.forEach((l, i) => {
      l.alpha = on * (Math.sin(t * 9 + i * Math.PI) > 0.2 ? 0.95 : 0.15);
      l.scale.set((unit / 128) * 0.18);
    });
    cockpit.alpha = on * 0.5;
    cockpit.scale.set((unit / 128) * 0.14);
    const drilling = t > 0.35 && t < 1.5;
    if (drilling && Math.random() < 0.35) dust.puff(bite[0] + rnd(-1, 1) * unit * 0.06, bite[1], { vx: rnd(-1, 1) * unit * 0.2, vy: -unit * rnd(0.04, 0.12), life: 1.6, size: unit * rnd(0.12, 0.2), grow: 2.2, tint: 0xb8a690, alpha: 0.6 });
    if (drilling && Math.random() < 0.35) rocks.add(sparkTexture(), bite[0], bite[1], { vx: rnd(-1, 1) * unit * 0.6, vy: -unit * rnd(0.4, 0.9), gravity: unit * 0.6, life: 1.2, tint: Math.random() < 0.5 ? 0xffd27a : 0xffffff, scale: 0.32 * (unit / 180) });
    if (drilling && Math.random() < 0.5) sparks.add(sparkTexture(), bite[0] + rnd(-4, 4), bite[1] + rnd(-4, 4), { vx: rnd(-1, 1) * unit * 0.8, vy: -unit * rnd(0.2, 0.8), gravity: unit * 1.5, life: 0.35, tint: 0xfff0b0, scale: 0.35 * (unit / 180) });
    const rumble = drilling ? unit * 0.004 : 0;
    card.position.set(base.x + rnd(-1, 1) * rumble, base.y + rnd(-1, 1) * rumble);
    dust.step(dt);
    rocks.step(dt);
    sparks.step(dt);
    return t < 2.1 || dust.list.length > 0;
  });
  card.position.copyFrom(base);
  await done();
}

export async function touchstone(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const ring = at(0.56, 0.25);
  const beam = new Graphics();
  beam.blendMode = "add";
  const reel = new Graphics();
  reel.blendMode = "add";
  fx.addChild(beam, reel);
  const motes = new Emitter(fx);
  const slides = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = span(t, 0.1, 0.4) * (1 - span(t, 1.6, 2));
    const flick = 0.85 + 0.15 * Math.sin(t * 30);
    beam.clear();
    for (const [w0, w1, al] of [
      [0.05, 0.13, 0.1],
      [0.03, 0.08, 0.14],
    ] as const)
      beam.poly([...at(0.56 - w0, 0.23), ...at(0.56 + w0, 0.23), ...at(0.58 + w1, 0.02), ...at(0.54 - w1, 0.02)]).fill({ color: 0x9ffff0, alpha: al * on * flick });
    reel.clear();
    for (let i = 0; i < 10; i++) {
      const a = t * 2.4 + (i / 10) * Math.PI * 2;
      const lit = Math.sin(a) > 0.7;
      reel.circle(ring[0] + Math.cos(a) * unit * 0.15, ring[1] + Math.sin(a) * unit * 0.045, unit * 0.012).fill({ color: lit ? WHITE : GREEN, alpha: on * (lit ? 0.9 : 0.4) });
    }
    if (on > 0.3 && Math.random() < 0.1) slides.add(cubeTexture(), ...at(0.56 + rnd(-0.04, 0.04), 0.2), { vy: -unit * rnd(0.25, 0.4), spin: rnd(-1, 1), life: 0.8, tint: 0x9ffff0, scale: (unit / 180) * rnd(0.7, 1), alpha: 0.6 });
    if (on > 0 && Math.random() < 0.6) motes.add(glowTexture(), ...at(0.56 + rnd(-0.06, 0.06), rnd(0.05, 0.22)), { vx: rnd(-4, 4), vy: -unit * 0.05, life: 0.9, tint: WHITE, scale: (unit / 128) * 0.025, alpha: 0.7 });
    motes.step(dt);
    slides.step(dt);
    return t < 2 || motes.list.length > 0;
  });
  await done();
}

export async function humanoidResources(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const heads: Pt[] = [];
  heads.push([0.17, 0.37], [0.29, 0.36], [0.38, 0.345], [0.43, 0.34], [0.56, 0.32], [0.61, 0.32], [0.68, 0.31], [0.77, 0.3], [0.83, 0.28], [0.9, 0.27]);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const eyes = heads.map(([u, v]) => {
    const s = glowSprite(fx, sparkTexture(), 0x9be8ff);
    s.position.set(...at(u, v));
    return s;
  });
  const center = at(0.55, 0.33);
  root.addChild(fx);
  await run(app, (t) => {
    const fade = 1 - span(t, 1.7, 2.1);
    g.clear();
    for (let n = 0; n < 5; n++) {
      const k = span(t, n * 0.17, n * 0.17 + 0.3);
      if (k > 0 && k < 1) g.circle(center[0], center[1], unit * (0.05 + 0.3 * k)).stroke({ width: unit * 0.01 * (1 - k) + 1, color: ORANGE, alpha: (1 - k) * (0.6 + n * 0.1) });
    }
    const sweep = span(t, 0.9, 1.4);
    if (sweep > 0 && sweep < 1)
      g.moveTo(...at(0.1 + sweep * 0.85, 0.22))
        .lineTo(...at(0.1 + sweep * 0.85, 0.44))
        .stroke({ width: unit * 0.01, color: 0x9be8ff, alpha: 0.8 });
    heads.forEach(([u], i) => {
      const on = span(t, 0.9 + (u - 0.15) * 0.6, 1.0 + (u - 0.15) * 0.6);
      eyes[i].alpha = on * fade * (0.75 + 0.25 * Math.sin(t * 6 + i));
      eyes[i].scale.set((unit / 120) * 0.26 * (1.4 - u * 0.7));
    });
    return t < 2.1;
  });
  await done();
}

export async function nihiloAgent(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hand = at(0.24, 0.11);
  const eye = at(0.5, 0.175);
  const glitch = new GlitchFilter({ slices: 8, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [glitch];
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  const shards = new Emitter(root);
  const sparks = new Emitter(fx);
  const glint = glowSprite(fx, sparkTexture(), 0xfff2d6);
  glint.position.set(...eye);
  root.addChild(fx);
  let burstDone = false;
  await run(app, (t, dt) => {
    if (t > 0.25 && !burstDone) {
      burstDone = true;
      for (let i = 0; i < 26; i++) {
        const side = i % 4;
        const [u, v] = side === 0 ? [rnd(0, 0.15), rnd(0.1, 0.5)] : side === 1 ? [rnd(0.85, 1), rnd(0.1, 0.5)] : side === 2 ? [rnd(0.1, 0.9), rnd(0.08, 0.14)] : [rnd(0.1, 0.9), rnd(0.42, 0.5)];
        const [x, y] = at(u, v);
        const a = Math.atan2(y - at(0.45, 0.3)[1], x - at(0.45, 0.3)[0]);
        const v0 = unit * rnd(0.4, 1.1);
        shards.add(shardTexture(), x, y, { vx: Math.cos(a) * v0, vy: Math.sin(a) * v0, drag: 1.4, spin: rnd(-6, 6), life: rnd(0.8, 1.3), tint: WHITE, scale: (unit / 180) * rnd(0.25, 0.5), blend: "normal" });
      }
    }
    glitch.offset = t > 0.2 && t < 0.4 && Math.random() < 0.5 ? unit * 0.05 : 0;
    glitch.red = { x: t < 0.4 ? rnd(-4, 4) : 0, y: 0 };
    rings.clear();
    for (let n = 0; n < 2; n++) {
      const k = span(t, 0.3 + n * 0.2, 1.1 + n * 0.2);
      if (k > 0 && k < 1) rings.circle(hand[0], hand[1], unit * (0.04 + 0.5 * ease.out(k))).stroke({ width: unit * 0.014 * (1 - k) + 1, color: 0xffe2a6, alpha: 1 - k });
    }
    if (t > 0.3 && t < 0.9 && Math.random() < 0.5) sparks.add(sparkTexture(), hand[0], hand[1], { vx: rnd(-1, 1) * unit * 0.4, vy: rnd(-1, 1) * unit * 0.4, life: 0.4, tint: 0xffe2a6, scale: 0.25 * (unit / 180), grow: -0.5 });
    const g = Math.sin(Math.PI * span(t, 0.9, 1.4));
    glint.alpha = g;
    glint.rotation = t;
    glint.scale.set((unit / 120) * 0.3 * g);
    shards.step(dt);
    sparks.step(dt);
    return t < 1.6 || shards.list.length > 0;
  });
  await done();
}

export async function botulusPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const heart = at(0.44, 0.32);
  const wobble = shimmer(root, card, rect, unit * 0.05);
  const spores = new Emitter(fx);
  const core = glowSprite(fx, glowTexture(), FLESH);
  core.position.set(...heart);
  const vine = new Graphics();
  vine.blendMode = "add";
  fx.addChild(vine);
  const host = board?.host ? pt(board.host) : null;
  let infected = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0, 1.7));
    wobble(t, k);
    core.alpha = 0.5 * k * (0.8 + 0.2 * Math.sin(t * 7));
    core.scale.set((unit / 128) * (0.2 + 0.08 * Math.sin(t * 5)));
    if (t < 1.3 && Math.random() < 0.9) {
      const a = rnd(0, Math.PI * 2);
      const d = unit * rnd(0.05, 0.3);
      spores.add(glowTexture(), heart[0] + Math.cos(a) * d, heart[1] + Math.sin(a) * d * 0.7, { vx: Math.cos(a) * unit * 0.15, vy: Math.sin(a) * unit * 0.1 - unit * 0.08, drag: 0.8, life: rnd(0.8, 1.3), tint: Math.random() < 0.6 ? TOXIC : EMBER, scale: (unit / 128) * rnd(0.035, 0.07) });
    }
    vine.clear();
    if (host) {
      const k = ease.inOut(span(t, 0.25, 0.9));
      const head = tether(vine, heart, host, k, TOXIC, unit * 0.01, 1 - span(t, 1.2, 1.6), unit * 0.04, t);
      if (k > 0 && k < 1 && Math.random() < 0.6) spores.add(glowTexture(), ...head, { vx: rnd(-10, 10), vy: rnd(-10, 10), life: 0.6, tint: TOXIC, scale: (unit / 128) * 0.04 });
      if (k >= 1 && !infected) {
        infected = true;
        burst(spores, ...host, 20, TOXIC, unit * 0.9, { life: 0.7, scale: 0.3 });
      }
    }
    spores.step(dt);
    return t < 1.75 || spores.list.length > 0;
  });
  await done();
}

export async function botulus(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const heart = at(0.44, 0.32);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const wobble = shimmer(root, card, rect, unit * 0.04);
  const spores = new Emitter(fx);
  const flash = glowSprite(fx, glowTexture(), FLESH);
  flash.position.set(...heart);
  const vine = new Graphics();
  vine.blendMode = "add";
  fx.addChild(vine);
  const host = board?.host ? pt(board.host) : null;
  let infected = false;
  root.addChild(fx);
  burst(spores, heart[0], heart[1], 30, TOXIC, unit * 1.3, { life: 0.8, scale: 0.3, tex: glowTexture() });
  for (const p of spores.list) p.s.scale.set((unit / 128) * rnd(0.03, 0.06));
  await run(app, (t, dt) => {
    const k = 1 - span(t, 0, 1.1);
    wobble(t * 2, k);
    split.red = { x: -3 * k, y: 0 };
    split.blue = { x: 3 * k, y: k };
    flash.alpha = Math.max(0, 1 - t / 0.4) * 0.6;
    flash.scale.set((unit / 128) * (0.2 + 0.4 * t));
    vine.clear();
    if (host) {
      const k = ease.inOut(span(t, 0.25, 0.9));
      const head = tether(vine, heart, host, k, TOXIC, unit * 0.01, 1 - span(t, 1.2, 1.6), unit * 0.04, t);
      if (k > 0 && k < 1 && Math.random() < 0.6) spores.add(glowTexture(), ...head, { vx: rnd(-10, 10), vy: rnd(-10, 10), life: 0.6, tint: TOXIC, scale: (unit / 128) * 0.04 });
      if (k >= 1 && !infected) {
        infected = true;
        burst(spores, ...host, 20, TOXIC, unit * 0.9, { life: 0.7, scale: 0.3 });
      }
    }
    spores.step(dt);
    return t < 1.1 || spores.list.length > 0;
  });
  await done();
}

function sphereSpots(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    return [Math.cos(a) * r, y, Math.sin(a) * r] as const;
  });
}

export async function unityPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.6, 0.32);
  const R = unit * 0.24;
  const spots = sphereSpots(26);
  const cubes = spots.map((p) => {
    const s = glowSprite(fx, cubeTexture(), Math.random() < 0.5 ? 0xbfe9ff : 0xffd3a8);
    const a = rnd(0, Math.PI * 2);
    return { s, p, from: [c[0] + Math.cos(a) * unit * rnd(0.6, 1), c[1] + Math.sin(a) * unit * rnd(0.6, 1)] as Pt, at: rnd(0, 0.5) };
  });
  const ring = new Graphics();
  ring.blendMode = "add";
  fx.addChild(ring);
  const core = glowSprite(fx, glowTexture(), 0xcfefff);
  core.position.set(...c);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  let snapped = false;
  await run(app, (t, dt) => {
    const spin = t * 1.2;
    const fade = 1 - span(t, 1.5, 1.9);
    for (const cb of cubes) {
      const k = ease.inOut(span(t, cb.at, cb.at + 0.7));
      const [x, y, z] = cb.p;
      const xr = x * Math.cos(spin) + z * Math.sin(spin);
      const zr = -x * Math.sin(spin) + z * Math.cos(spin);
      const dst: Pt = [c[0] + xr * R, c[1] + y * R];
      cb.s.position.set(...lerp(cb.from, dst, k));
      cb.s.rotation = (1 - k) * 6 + spin;
      cb.s.alpha = Math.min(1, k * 3) * (0.55 + (0.45 * (zr + 1)) / 2) * fade;
      cb.s.scale.set((unit / 180) * (0.35 + 0.15 * zr));
    }
    const lock = span(t, 1.05, 1.5);
    if (lock > 0 && !snapped) {
      snapped = true;
      burst(sparks, c[0], c[1], 18, 0xffd3a8, unit * 1.2, { life: 0.5, scale: 0.35 });
    }
    ring.clear();
    if (lock > 0) ring.ellipse(c[0], c[1], R * (1.1 + 0.4 * lock), R * (0.35 + 0.15 * lock)).stroke({ width: unit * 0.015, color: ORANGE, alpha: (1 - lock) * 0.9 });
    core.alpha = 0.3 * Math.sin(Math.PI * span(t, 0.9, 1.8));
    core.scale.set((unit / 128) * 0.22);
    sparks.step(dt);
    return t < 1.9 || sparks.list.length > 0;
  });
  await done();
}

export async function unity(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at } = sc;
  const c = at(0.6, 0.32);
  const R = unit * 0.24;
  const spots = sphereSpots(20);
  const cubes = spots.map(() => glowSprite(fx, cubeTexture(), Math.random() < 0.5 ? 0xbfe9ff : 0xffd3a8));
  const ring = new Graphics();
  ring.blendMode = "add";
  fx.addChild(ring);
  const core = glowSprite(fx, glowTexture(), WHITE);
  core.position.set(...c);
  root.addChild(fx);
  const impact = strikeFx(sc, "cubes", ORANGE, at(0.6, 0.32));
  await run(app, (t) => {
    const out = Math.sin(Math.PI * span(t, 0, 0.8));
    spots.forEach(([x, y, z], i) => {
      const d = R * (1 + 1.4 * out);
      cubes[i].position.set(c[0] + (x * Math.cos(t * 3) + z * Math.sin(t * 3)) * d, c[1] + y * d);
      cubes[i].alpha = (1 - span(t, 0.75, 1)) * 0.9;
      cubes[i].rotation = t * 4 + i;
      cubes[i].scale.set((unit / 180) * 0.4);
    });
    const k = span(t, 0.05, 0.6);
    ring.clear();
    if (k > 0 && k < 1) ring.circle(c[0], c[1], R * (1 + 2 * ease.out(k))).stroke({ width: unit * 0.02 * (1 - k) + 1, color: ORANGE, alpha: 1 - k });
    core.alpha = Math.max(0, 1 - t / 0.5);
    core.scale.set((unit / 128) * (0.3 + 0.4 * t));
    return t < 1;
  });
  await impact;
  await done();
}

export async function conduitPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const from = at(0.85, 0.17);
  const to = at(0.05, 0.42);
  const cube = at(0.45, 0.27);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const core = glowSprite(fx, glowTexture(), 0xe6ff6a);
  core.position.set(...cube);
  const sparks = new Emitter(fx);
  const streaks = Array.from({ length: 16 }, () => ({ at: rnd(0, 0.9), off: rnd(-0.12, 0.12), len: rnd(0.15, 0.3) }));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const nx = -(to[1] - from[1]);
    const ny = to[0] - from[0];
    const nl = Math.hypot(nx, ny);
    for (const s of streaks) {
      const k = span(t, s.at, s.at + 0.45);
      if (k <= 0 || k >= 1) continue;
      const o: Pt = [(nx / nl) * s.off * unit, (ny / nl) * s.off * unit];
      const a = lerp(from, to, Math.max(0, k - s.len));
      const b = lerp(from, to, k);
      g.moveTo(a[0] + o[0], a[1] + o[1])
        .lineTo(b[0] + o[0], b[1] + o[1])
        .stroke({ width: unit * 0.008, color: 0xe6ff6a, alpha: Math.sin(Math.PI * k) });
    }
    core.alpha = 0.7 * Math.sin(Math.PI * span(t, 0.2, 1.4));
    core.scale.set((unit / 128) * (0.2 + 0.05 * Math.sin(t * 20)));
    if (t > 0.3 && t < 1.2 && Math.random() < 0.5) sparks.add(sparkTexture(), cube[0], cube[1], { vx: (to[0] - from[0]) * 0.5, vy: (to[1] - from[1]) * 0.5, life: 0.5, tint: 0xe6ff6a, scale: 0.25 * (unit / 180), grow: -0.4 });
    sparks.step(dt);
    return t < 1.5 || sparks.list.length > 0;
  });
  await done();
}

export async function conduit(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const mouth = at(0.85, 0.17);
  const cube = at(0.45, 0.27);
  const exit = at(0.05, 0.42);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const core = glowSprite(fx, glowTexture(), 0xe6ff6a);
  core.position.set(...cube);
  const drops = new Emitter(fx);
  root.addChild(fx);
  const nx = -(exit[1] - mouth[1]);
  const ny = exit[0] - mouth[0];
  const nl = Math.hypot(nx, ny);
  const ring = (k: number, alpha: number) => {
    const [x, y] = lerp(mouth, exit, k);
    const r = unit * (0.07 + 0.16 * k);
    const ux = (exit[0] - mouth[0]) / nl;
    const uy = (exit[1] - mouth[1]) / nl;
    const pts: number[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const p = Math.cos(a) * r * 0.35;
      const q = Math.sin(a) * r;
      pts.push(x + ux * p + (nx / nl) * q, y + uy * p + (ny / nl) * q);
    }
    g.poly(pts).stroke({ width: unit * 0.01, color: 0xe6ff6a, alpha });
  };
  const streaks = Array.from({ length: 22 }, () => ({ at: rnd(0, 0.7), off: rnd(-1, 1), len: rnd(0.1, 0.22) }));
  await run(app, (t, dt) => {
    g.clear();
    for (let n = 0; n < 3; n++) {
      const k = span(t, n * 0.14, n * 0.14 + 0.7);
      if (k > 0 && k < 1) ring(ease.inOut(k), Math.sin(Math.PI * k));
    }
    for (const s of streaks) {
      const k = span(t, s.at, s.at + 0.35);
      if (k <= 0 || k >= 1) continue;
      const w = unit * (0.04 + 0.18 * k) * s.off;
      const a = lerp(mouth, exit, Math.max(0, k - s.len));
      const b = lerp(mouth, exit, k);
      g.moveTo(a[0] + (nx / nl) * w, a[1] + (ny / nl) * w)
        .lineTo(b[0] + (nx / nl) * w, b[1] + (ny / nl) * w)
        .stroke({ width: unit * 0.008, color: 0xe6ff6a, alpha: Math.sin(Math.PI * k) });
    }
    const pass = Math.max(0, 1 - Math.abs(t - 0.45) / 0.25);
    core.alpha = 0.25 + 0.6 * pass;
    core.scale.set((unit / 128) * (0.18 + 0.15 * pass));
    if (t > 0.3 && t < 0.8 && Math.random() < 0.5) drops.add(sparkTexture(), cube[0], cube[1], { vx: (exit[0] - mouth[0]) * 0.8 + rnd(-30, 30), vy: (exit[1] - mouth[1]) * 0.8 + rnd(-30, 30), life: 0.5, tint: GREEN, scale: 0.25 * (unit / 180), grow: -0.4 });
    drops.step(dt);
    return t < 1.1 || drops.list.length > 0;
  });
  await done();
}

export async function gourmandPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.47, 0.32);
  const bolts = new Graphics();
  bolts.blendMode = "add";
  fx.addChild(bolts);
  const knives = [at(0.2, 0.25), at(0.8, 0.26), at(0.83, 0.38)].map((p) => {
    const s = glowSprite(fx, sparkTexture(), WHITE);
    s.position.set(...p);
    return s;
  });
  const eyes = glowSprite(fx, glowTexture(), 0x7dff7a);
  eyes.position.set(...at(0.44, 0.33));
  root.addChild(fx);
  let next = 0;
  await run(app, (t) => {
    if (t > next) {
      next = t + rnd(0.06, 0.14);
      bolts.clear();
      if (t < 1.3) {
        for (let i = 0; i < 2; i++) {
          const a = rnd(0, Math.PI * 2);
          const b = a + rnd(0.6, 1.4);
          const r = unit * rnd(0.32, 0.42);
          lightning(bolts, c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.9, c[0] + Math.cos(b) * r, c[1] + Math.sin(b) * r * 0.9, unit * 0.12, 0x7dff7a, unit * 0.008);
        }
      }
    }
    knives.forEach((k, i) => {
      const g = Math.sin(Math.PI * span(t, 0.3 + i * 0.25, 0.65 + i * 0.25));
      k.alpha = g;
      k.rotation = t * 3;
      k.scale.set((unit / 120) * 0.28 * g);
    });
    eyes.alpha = 0.6 * Math.sin(Math.PI * span(t, 0.4, 1.5));
    eyes.scale.set((unit / 128) * 0.14);
    return t < 1.6;
  });
  await done();
}

export async function gourmand(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = board?.access ? pt(board.access) : at(0.46, 0.33);
  const span0 = board?.access ? board.access.width / 2 : unit * 0.36;
  const jaws = new Graphics();
  jaws.blendMode = "add";
  fx.addChild(jaws);
  const crumbs = new Emitter(fx);
  root.addChild(fx);
  const base = card.position.clone();
  let chomped = false;
  await run(app, (t, dt) => {
    const k = ease.back(span(t, 0, 0.3));
    const open = span0 * 0.8 * (1 - k);
    const w = span0;
    jaws.clear();
    const a = 1 - span(t, 0.45, 0.8);
    for (const dir of [-1, 1]) {
      const y = c[1] + dir * (open + unit * 0.02);
      jaws.moveTo(c[0] - w, y);
      for (let i = 0; i <= 8; i++) jaws.lineTo(c[0] - w + (i * 2 * w) / 8, y - dir * (i % 2 ? span0 * 0.14 : 0));
      jaws.stroke({ width: Math.max(2, span0 * 0.03), color: 0x7dff7a, alpha: a });
    }
    if (k >= 0.95 && !chomped) {
      chomped = true;
      burst(crumbs, c[0], c[1], 22, 0x7dff7a, span0 * 4, { life: 0.6, scale: 0.35, gravity: unit * 1.5 });
      navigator.vibrate?.(25);
    }
    const shake = chomped && t < 0.5 ? unit * 0.012 : 0;
    card.position.set(base.x + rnd(-1, 1) * shake, base.y + rnd(-1, 1) * shake);
    crumbs.step(dt);
    return t < 0.9 || crumbs.list.length > 0;
  });
  card.position.copyFrom(base);
  await done();
}

export async function eventHorizon(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hole = at(0.56, 0.76);
  const twist = new TwistFilter({ radius: unit * 0.5, angle: 0, offset: { x: 0, y: 0 }, padding: unit * 0.3 });
  card.filters = [twist];
  const fall = new Emitter(fx);
  const dark = new Sprite(glowTexture());
  dark.anchor.set(0.5);
  dark.tint = 0x000000;
  dark.position.set(...hole);
  fx.addChild(dark);
  root.addChild(fx);
  const orbit = Array.from({ length: 40 }, () => ({ a: rnd(0, Math.PI * 2), r: rnd(0.22, 0.42), w: rnd(1.2, 2.4), s: glowSprite(fx, sparkTexture(), Math.random() < 0.6 ? GOLD : 0xffe7a8) }));
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.3) * (1 - span(t, 1.7, 2.1));
    twist.offset = filterPoint(card, ...hole);
    twist.angle = 1.6 * Math.sin(Math.PI * span(t, 0.1, 2));
    for (const o of orbit) {
      o.a += o.w * dt * (1 + 1.5 * span(t, 0.8, 1.6));
      const r = unit * o.r * (1 - 0.6 * span(t, 1.1, 1.9));
      o.s.position.set(hole[0] + Math.cos(o.a) * r, hole[1] + Math.sin(o.a) * r * 0.42);
      o.s.alpha = on * (Math.sin(o.a) > 0 ? 1 : 0.45);
      o.s.scale.set((unit / 180) * 0.3);
    }
    if (t < 1.6 && Math.random() < 0.6) {
      const a = rnd(0, Math.PI * 2);
      const d = unit * rnd(0.55, 0.8);
      fall.add(sparkTexture(), hole[0] + Math.cos(a) * d, hole[1] + Math.sin(a) * d, { vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d * 1.6, life: 0.55, tint: 0xfff2c4, scale: 0.2 * (unit / 180), grow: -0.3 });
    }
    dark.alpha = 0.8 * on;
    dark.scale.set((unit / 128) * 0.25 * (1 + 0.15 * span(t, 1.2, 1.8)));
    fall.step(dt);
    return t < 2.1;
  });
  await done();
}

export async function eventHorizonFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hole = at(0.56, 0.76);
  const twist = new TwistFilter({ radius: unit * 0.6, angle: 0, offset: { x: 0, y: 0 }, padding: unit * 0.3 });
  card.filters = [twist];
  const fall = new Emitter(fx);
  root.addChild(fx);
  for (let i = 0; i < 36; i++) {
    const a = rnd(0, Math.PI * 2);
    const d = unit * rnd(0.6, 1.1);
    fall.add(sparkTexture(), hole[0] + Math.cos(a) * d, hole[1] + Math.sin(a) * d, { vx: -Math.cos(a) * d * 2.4, vy: -Math.sin(a) * d * 2.4, life: 0.42, tint: i % 3 ? GOLD : WHITE, scale: 0.3 * (unit / 180) });
  }
  const ghosts = new Graphics();
  ghosts.blendMode = "add";
  fx.addChild(ghosts);
  const prey = board?.gone ?? [];
  await run(app, (t, dt) => {
    ghosts.clear();
    for (const r of prey) {
      const k = ease.inOut(span(t, 0.05, 0.75));
      const [x, y] = lerp(pt(r), hole, k);
      const w = r.width * (1 - k * 0.9);
      const h = r.height * (1 - k * 0.9);
      ghosts
        .rect(x - w / 2, y - h / 2, w, h)
        .stroke({ width: 2, color: GOLD, alpha: 1 - span(t, 0.6, 0.8) })
        .fill({ color: 0xffe7a8, alpha: 0.15 * (1 - k) });
      if (k < 0.9 && Math.random() < 0.8) fall.add(sparkTexture(), x + rnd(-0.5, 0.5) * w, y + rnd(-0.5, 0.5) * h, { vx: (hole[0] - x) * 1.5, vy: (hole[1] - y) * 1.5, life: 0.4, tint: GOLD, scale: 0.25 * (unit / 180), grow: -0.4 });
    }
    twist.offset = filterPoint(card, ...hole);
    twist.angle = -2.4 * Math.sin(Math.PI * span(t, 0, 0.9));
    card.tint = t > 0.35 && t < 0.55 ? 0x888888 : WHITE;
    fall.step(dt);
    return t < 1 || fall.list.length > 0;
  });
  card.tint = WHITE;
  await done();
}

export async function pharos(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const lamp = at(0.2, 0.77);
  const rays = new GodrayFilter({ angle: sideways ? 60 : -30, gain: 0.5, lacunarity: 2.4, parallel: true, time: 0, alpha: 0 });
  card.filters = [rays];
  const beam = new Graphics();
  beam.blendMode = "add";
  fx.addChild(beam);
  const core = glowSprite(fx, glowTexture(), 0xfff6d8);
  const star = glowSprite(fx, sparkTexture(), WHITE);
  core.position.set(...lamp);
  star.position.set(...lamp);
  root.addChild(fx);
  await run(app, (t) => {
    const on = span(t, 0.1, 0.4) * (1 - span(t, 1.8, 2.2));
    rays.time = t * 1.5;
    rays.alpha = 0.8 * on;
    core.alpha = on;
    core.scale.set((unit / 128) * (0.3 + 0.05 * Math.sin(t * 25)));
    star.alpha = on;
    star.rotation = t * 0.5;
    star.scale.set((unit / 120) * 0.6);
    beam.clear();
    const sweep = -0.5 + 1.0 * ease.inOut(span(t, 0.3, 1.8));
    const len = unit * 0.85;
    const base = Math.atan2(at(0.6, 0.6)[1] - lamp[1], at(0.6, 0.6)[0] - lamp[0]);
    const a = base + sweep;
    for (const w of [0.05, 0.1, 0.16]) beam.poly([...lamp, lamp[0] + Math.cos(a - w) * len, lamp[1] + Math.sin(a - w) * len, lamp[0] + Math.cos(a + w) * len, lamp[1] + Math.sin(a + w) * len]).fill({ color: 0xfff1c0, alpha: 0.1 * on });
    return t < 2.2;
  });
  await done();
}

export async function pharosFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const lamp = at(0.2, 0.77);
  const rays = new GodrayFilter({ angle: 30, gain: 0.6, lacunarity: 2.4, parallel: false, center: { x: 0, y: 0 }, time: 0, alpha: 0 });
  card.filters = [rays];
  const beam = new Graphics();
  beam.blendMode = "add";
  app.stage.addChild(beam);
  const flare = glowSprite(fx, glowTexture(), 0xfff6d8);
  const star = glowSprite(fx, sparkTexture(), WHITE);
  const streak = glowSprite(fx, glowTexture(), 0xfff1c0);
  for (const s of [flare, star, streak]) s.position.set(...lamp);
  const motes = new Emitter(app.stage);
  const mark = new Graphics();
  mark.blendMode = "add";
  app.stage.addChild(mark);
  root.addChild(fx);
  const target: Pt = board?.runner ? pt(board.runner) : [innerWidth / 2, innerHeight * 0.9];
  let lit = false;
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.2) * (1 - span(t, 1.1, 1.4));
    const src = root.toGlobal({ x: lamp[0], y: lamp[1] });
    rays.center = filterPoint(card, ...lamp);
    rays.time = t * 2;
    rays.alpha = on;
    flare.alpha = on;
    flare.scale.set((unit / 128) * (0.3 + 0.08 * Math.sin(t * 30)));
    star.alpha = on;
    star.rotation = t * 1.5;
    star.scale.set((unit / 120) * 0.7);
    streak.alpha = 0.6 * on;
    streak.scale.set((unit / 128) * 1.6, (unit / 128) * 0.05);
    const aim = Math.atan2(target[1] - src.y, target[0] - src.x);
    const sweep = aim + (1 - ease.out(span(t, 0.1, 0.55))) * 0.9;
    const len = Math.hypot(target[0] - src.x, target[1] - src.y) * 1.15;
    beam.clear();
    for (const [w, al] of [
      [0.16, 0.06],
      [0.1, 0.09],
      [0.05, 0.14],
      [0.02, 0.22],
    ] as const)
      beam.poly([src.x, src.y, src.x + Math.cos(sweep - w) * len, src.y + Math.sin(sweep - w) * len, src.x + Math.cos(sweep + w) * len, src.y + Math.sin(sweep + w) * len]).fill({ color: 0xfff1c0, alpha: al * on });
    if (on > 0.3 && Math.random() < 0.8) {
      const d = Math.random() * len;
      const off = rnd(-0.08, 0.08);
      motes.add(glowTexture(), src.x + Math.cos(sweep + off) * d, src.y + Math.sin(sweep + off) * d, { vx: rnd(-6, 6), vy: rnd(-6, 6), life: 0.6, tint: WHITE, scale: (unit / 128) * 0.025, alpha: 0.8 });
    }
    mark.clear();
    if (!lit && t > 0.55 && board?.runner) {
      lit = true;
      prism(document.querySelector('[data-anchor="runner-panel"]'), 0.5);
      navigator.vibrate?.(30);
    }
    const mk = span(t, 0.55, 1.3);
    if (mk > 0 && mk < 1) {
      const r = unit * (0.35 - 0.15 * ease.out(mk));
      const a = (1 - span(mk, 0.7, 1)) * 0.9;
      mark.circle(...target, r).stroke({ width: 2, color: 0xfff1c0, alpha: a });
      for (let i = 0; i < 4; i++) {
        const q = (i * Math.PI) / 2 + mk * 1.5;
        mark
          .moveTo(target[0] + Math.cos(q) * r * 0.7, target[1] + Math.sin(q) * r * 0.7)
          .lineTo(target[0] + Math.cos(q) * r * 1.3, target[1] + Math.sin(q) * r * 1.3)
          .stroke({ width: 2, color: 0xfff1c0, alpha: a });
      }
    }
    motes.step(dt);
    return t < 1.4 || motes.list.length > 0;
  });
  beam.destroy();
  mark.destroy();
  await done();
}

export async function sleipnir(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const c = at(0.45, 0.72);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const trail = new Emitter(fx);
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  root.addChild(fx);
  const hues = [0xff5a5a, 0xffb347, 0xfff36a, 0x7dff9a, 0x6ad8ff, 0xb68bff];
  await run(app, (t, dt) => {
    const gallop = span(t, 0.1, 1.6);
    const k = Math.sin(Math.PI * gallop);
    const d = 6 * k;
    split.red = sideways ? { x: 0, y: -d } : { x: -d, y: 0 };
    split.blue = sideways ? { x: 0, y: d } : { x: d, y: 0 };
    rings.clear();
    for (let i = 0; i < 8; i++) {
      const s = span(t, 0.15 + i * 0.16, 0.55 + i * 0.16);
      if (s <= 0 || s >= 1) continue;
      const [x, y] = at(0.25 + (i % 4) * 0.17, 0.66 + (i % 2) * 0.14);
      rings.circle(x, y, unit * 0.18 * ease.out(s)).stroke({ width: 1.5, color: hues[i % hues.length], alpha: 1 - s });
    }
    if (k > 0.1 && Math.random() < 0.8) {
      const [x, y] = at(rnd(0.2, 0.8), rnd(0.6, 0.9));
      const v = at(0.45 - 0.3, 0.72);
      trail.add(sparkTexture(), x, y, { vx: (v[0] - c[0]) * 2, vy: (v[1] - c[1]) * 2, life: 0.5, tint: hues[Math.floor(Math.random() * hues.length)], scale: 0.3 * (unit / 180), grow: -0.4 });
    }
    trail.step(dt);
    return t < 1.8 || trail.list.length > 0;
  });
  await done();
}

export function prism(el: Element | null, duration: number) {
  if (!(el instanceof HTMLElement) || !el.animate) return;
  const f = (d: number) => `drop-shadow(${-d}px 0 rgba(255,60,90,0.9)) drop-shadow(${d}px 0 rgba(60,200,255,0.9)) drop-shadow(0 ${d * 0.6}px rgba(255,240,90,0.7))`;
  el.animate(
    [
      { filter: f(0), transform: "translateX(0)" },
      { filter: f(6), transform: "translateX(-3px)", offset: 0.15 },
      { filter: f(2), transform: "translateX(2px)", offset: 0.33 },
      { filter: f(7), transform: "translateX(-2px)", offset: 0.5 },
      { filter: f(3), transform: "translateX(1px)", offset: 0.68 },
      { filter: f(0), transform: "translateX(0)" },
    ],
    { duration: duration * 1000, easing: "ease-out" },
  );
}

export async function sleipnirFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const shards = new Emitter(fx);
  root.addChild(fx);
  const hues = [0xff5a5a, 0xffb347, 0xfff36a, 0x7dff9a, 0x6ad8ff, 0xb68bff];
  const beats = [0.12, 0.3, 0.48, 0.66];
  const fired = beats.map(() => false);
  const spot = (i: number): Pt => at(0.25 + 0.17 * i, i % 2 ? 0.66 : 0.86);
  prism(document.querySelector('[data-anchor="runner-panel"]'), 1);
  await run(app, (t, dt) => {
    let kick = 0;
    beats.forEach((b, i) => {
      kick = Math.max(kick, t > b ? Math.max(0, 1 - (t - b) / 0.15) : 0);
      if (t > b && !fired[i]) {
        fired[i] = true;
        const [x, y] = spot(i);
        for (let n = 0; n < 16; n++) {
          const a = rnd(-Math.PI, 0);
          const v = unit * rnd(0.4, 1.2);
          shards.add(sparkTexture(), x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.5, gravity: unit * 1.5, life: rnd(0.35, 0.6), tint: hues[n % hues.length], scale: 0.32 * (unit / 180) });
        }
        shards.add(glowTexture(), x, y, { life: 0.25, tint: hues[(i * 2) % hues.length], scale: (unit / 128) * 0.3, grow: 1.4, alpha: 0.8 });
        navigator.vibrate?.(15);
      }
    });
    const d = 5 * kick;
    split.red = sideways ? { x: 0, y: -d } : { x: -d, y: 0 };
    split.blue = sideways ? { x: 0, y: d } : { x: d, y: 0 };
    shards.step(dt);
    return t < 0.95 || shards.list.length > 0;
  });
  await done();
}

export async function tocsin(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const bell = at(0.66, 0.78);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.025, wavelength: unit * 0.15, speed: unit * 1.2, brightness: 1.1, radius: unit * 0.9, time: 0 });
  card.filters = [wave];
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  const glow = glowSprite(fx, glowTexture(), 0xcfffe8);
  glow.position.set(...bell);
  root.addChild(fx);
  const strikes = [0.2, 0.75, 1.3];
  await run(app, (t) => {
    rings.clear();
    for (const s of strikes) {
      for (let n = 0; n < 3; n++) {
        const k = span(t, s + n * 0.08, s + n * 0.08 + 0.7);
        if (k > 0 && k < 1) rings.circle(bell[0], bell[1], unit * (0.1 + 0.6 * ease.out(k))).stroke({ width: unit * 0.008 * (1 - k) + 1, color: n ? 0x7dffc4 : WHITE, alpha: (1 - k) * 0.8 });
      }
    }
    const hit = strikes.reduce((m, s) => Math.max(m, t > s ? Math.max(0, 1 - (t - s) / 0.35) : 0), 0);
    glow.alpha = 0.3 + 0.6 * hit;
    glow.scale.set((unit / 128) * (0.25 + 0.15 * hit));
    wave.center = filterPoint(card, ...bell);
    wave.time = (t - 0.2) % 0.55;
    return t < 2;
  });
  await done();
}

export async function tocsinFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const bell = at(0.66, 0.78);
  const JADE = 0x7dffc4;
  const arcs = new Graphics();
  arcs.blendMode = "add";
  fx.addChild(arcs);
  const glow = glowSprite(fx, glowTexture(), 0xe8fff4);
  glow.position.set(...bell);
  const dust = new Emitter(fx);
  root.addChild(fx);
  const tolls = [0.05, 0.42, 0.79];
  const rung = tolls.map(() => false);
  const base = card.position.clone();
  const up = sideways ? -Math.PI : -Math.PI / 2;
  await run(app, (t, dt) => {
    arcs.clear();
    let hit = 0;
    tolls.forEach((s, i) => {
      const since = t - s;
      if (since < 0) return;
      hit = Math.max(hit, Math.max(0, 1 - since / 0.3));
      if (!rung[i]) {
        rung[i] = true;
        for (let n = 0; n < 10; n++) dust.add(sparkTexture(), ...at(rnd(0.5, 0.82), rnd(0.52, 0.6)), { vx: rnd(-6, 6), vy: unit * rnd(0.1, 0.3), gravity: unit * 0.6, life: rnd(0.6, 1), tint: 0xe8fff4, scale: 0.18 * (unit / 180) });
        navigator.vibrate?.(35);
      }
      for (let n = 0; n < 3; n++) {
        const k = span(since, n * 0.07, n * 0.07 + 0.55);
        if (k <= 0 || k >= 1) continue;
        const r = unit * (0.12 + 0.75 * ease.out(k));
        for (const side of [up + Math.PI / 2, up - Math.PI / 2]) {
          arcs.arc(bell[0], bell[1], r, side - 0.55, side + 0.55);
          arcs.stroke({ width: unit * (0.018 - n * 0.004) * (1 - k) + 1, color: n ? JADE : WHITE, alpha: (1 - k) * 0.9 });
        }
      }
    });
    const swing = Math.sin(t * 38) * hit * unit * 0.012;
    card.position.set(base.x + (sideways ? 0 : swing), base.y + (sideways ? swing : 0));
    glow.alpha = 0.25 + 0.75 * hit;
    glow.scale.set((unit / 128) * (0.18 + 0.22 * hit));
    dust.step(dt);
    return t < 1.4 || dust.list.length > 0;
  });
  card.position.copyFrom(base);
  await done();
}

export async function semakSamun(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const flies = new Emitter(fx);
  const eyes = [at(0.3, 0.7), at(0.36, 0.7)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xd6ff4a);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t, dt) => {
    const still = span(t, 1.0, 1.25);
    if (t < 1 && Math.random() < 0.9) flies.add(glowTexture(), ...at(rnd(0.1, 0.9), rnd(0.55, 0.95)), { vx: rnd(-8, 8), vy: rnd(-12, 4), life: rnd(0.8, 1.4), tint: 0xe4ff7a, scale: (unit / 128) * rnd(0.05, 0.08) });
    for (const p of flies.list) {
      p.vx *= 1 - still;
      p.vy *= 1 - still;
      p.s.alpha *= 1 - 0.1 * still;
    }
    card.tint = still > 0 ? 0xb8c4b0 : WHITE;
    const open = Math.sin(Math.PI * span(t, 1.3, 2.0));
    for (const e of eyes) {
      e.alpha = open;
      e.scale.set((unit / 128) * 0.1 * (0.3 + open), (unit / 128) * 0.05 * open);
    }
    flies.step(dt);
    return t < 2.05;
  });
  card.tint = WHITE;
  await done();
}

export async function semakFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sway = shimmer(root, card, rect, unit * 0.06);
  const eyes = [at(0.3, 0.7), at(0.36, 0.7)].map((p) => {
    const s = glowSprite(fx, glowTexture(), RED);
    s.position.set(...p);
    return s;
  });
  const leaves = new Emitter(fx);
  root.addChild(fx);
  const grip = board?.grip ? pt(board.grip) : null;
  const swarm = grip ? Array.from({ length: 10 }, (_, i) => homing(fx, leafTexture(), at(rnd(0.15, 0.85), rnd(0.6, 0.9)), grip, 0.35 + i * 0.03, 0xb6ff5a, (unit / 180) * 0.4, rnd(-1, 1) * unit * 0.8)) : [];
  let struck = false;
  let shed = false;
  await run(app, (t, dt) => {
    const shiver = Math.sin(Math.PI * span(t, 0, 0.9));
    sway(t * 3, shiver);
    const dusk = span(t, 0, 0.25) * (1 - span(t, 0.7, 1));
    const g = Math.round(255 - 110 * dusk);
    card.tint = (g << 16) | (Math.round(255 - 70 * dusk) << 8) | g;
    const open = Math.sin(Math.PI * span(t, 0.15, 0.85));
    for (const e of eyes) {
      e.alpha = open;
      e.scale.set((unit / 128) * 0.09, (unit / 128) * 0.04 * open);
    }
    if (!shed && t > 0.3) {
      shed = true;
      for (let i = 0; i < 18; i++) {
        const [x, y] = at(rnd(0.1, 0.9), rnd(0.55, 0.95));
        leaves.add(leafTexture(), x, y, { vx: rnd(-1, 1) * unit * 0.6, vy: -unit * rnd(0.2, 0.6), gravity: unit * 0.8, spin: rnd(-6, 6), life: rnd(0.5, 0.8), tint: Math.random() < 0.5 ? 0xb6ff5a : 0x4f9a2a, scale: (unit / 180) * rnd(0.3, 0.5), blend: "normal" });
      }
    }
    for (const h of swarm) h.s.rotation += dt * 8;
    if (flyHome(swarm, t, leaves, 0xb6ff5a) === swarm.length && swarm.length && !struck) {
      struck = true;
      burst(leaves, ...grip!, 22, RED, unit * 1.3, { life: 0.5, scale: 0.4 });
      navigator.vibrate?.([30, 20, 30]);
    }
    leaves.step(dt);
    return t < (grip ? 1.2 : 1) || leaves.list.length > 0;
  });
  card.tint = WHITE;
  await done();
}

export async function pingFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const ball = at(0.41, 0.74);
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  const core = glowSprite(fx, glowTexture(), 0xfff36a);
  core.position.set(...ball);
  root.addChild(fx);
  await run(app, (t) => {
    rings.clear();
    for (let n = 0; n < 3; n++) {
      const k = span(t, n * 0.15, n * 0.15 + 0.6);
      if (k > 0 && k < 1) rings.circle(ball[0], ball[1], unit * (0.05 + 0.9 * ease.out(k))).stroke({ width: 2 * (1 - k) + 1, color: n ? RED : 0xfff36a, alpha: 1 - k });
    }
    core.alpha = Math.max(0, 1 - t / 0.6);
    core.scale.set((unit / 128) * (0.2 + 0.3 * t));
    return t < 0.95;
  });
  await done();
}

export async function flyswatterFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.58, 0.78);
  const mesh = new Graphics();
  mesh.blendMode = "add";
  fx.addChild(mesh);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  let snapped = false;
  await run(app, (t, dt) => {
    const k = ease.back(span(t, 0, 0.35));
    const R = unit * (0.7 - 0.4 * k);
    mesh.clear();
    const a = 1 - span(t, 0.5, 0.9);
    for (let i = -3; i <= 3; i++) {
      mesh.moveTo(c[0] + (i / 3) * R, c[1] - R).lineTo(c[0] + (i / 3) * R, c[1] + R);
      mesh.moveTo(c[0] - R, c[1] + (i / 3) * R).lineTo(c[0] + R, c[1] + (i / 3) * R);
    }
    mesh.stroke({ width: 1.5, color: CYAN, alpha: a });
    if (k >= 0.95 && !snapped) {
      snapped = true;
      burst(sparks, c[0], c[1], 20, 0xbff3ff, unit * 1.2, { life: 0.45, scale: 0.35 });
      card.tint = 0xd0f4ff;
    }
    if (t > 0.5) card.tint = WHITE;
    sparks.step(dt);
    return t < 0.95 || sparks.list.length > 0;
  });
  await done();
}

export const echelonPose = pose(VIOLET, [0.85, 0.38]);
export const carmenPose = pose(CYAN, [0.67, 0.16]);
export const risingTidePose = pose(0x6ad8ff, [0.5, 0.3]);
export const fermenterPose = pose(PINK, [0.48, 0.3]);
export const pingPose = pose(0xfff36a, [0.41, 0.74]);
export const flyswatterPose = pose(CYAN, [0.58, 0.78]);
export const eventHorizonPose = pose(GOLD, [0.56, 0.76]);
export const pharosPose = pose(0xfff1c0, [0.2, 0.77]);
export const sleipnirPose = pose(0xb68bff, [0.45, 0.72]);
export const tocsinPose = pose(0x7dffc4, [0.66, 0.78]);
export const semakPose = pose(0xd6ff4a, [0.33, 0.7]);

type Strike = { app: import("pixi.js").Application; root: import("pixi.js").Container; world: import("pixi.js").Container; strike: Pt | null; unit: number; at: (u: number, v: number) => Pt };

export function strikeFx(sc: Strike, style: "ribbons" | "bolts" | "splash" | "cubes" | "saw" | "apple", color: number, from: Pt): Promise<void> {
  const { app, root, world, strike, unit } = sc;
  if (!strike) return Promise.resolve();
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const bits = new Emitter(world);
  const R = unit * 0.9;
  let landed = false;
  return run(app, (t, dt) => {
    g.clear();
    const src = root.toGlobal({ x: from[0], y: from[1] });
    const k = span(t, 0.05, 0.45);
    const fade = 1 - span(t, 0.7, 1.1);
    if (style === "ribbons") {
      for (let i = 0; i < 3; i++) {
        const a0 = i * 2.1 + t * 3;
        const sweep = Math.PI * 1.4 * ease.out(span(t, 0.05 + i * 0.08, 0.45 + i * 0.08));
        if (sweep <= 0) continue;
        for (const [w, al, c] of [
          [unit * 0.06, 0.25, color],
          [unit * 0.016, 0.9, WHITE],
        ] as const) {
          g.moveTo(strike[0] + Math.cos(a0) * R * 0.7, strike[1] + Math.sin(a0) * R * 0.3);
          for (let s = 1; s <= 16; s++) {
            const a = a0 + (sweep * s) / 16;
            g.lineTo(strike[0] + Math.cos(a) * R * 0.7, strike[1] + Math.sin(a) * R * 0.3 + (s - 8) * unit * 0.01);
          }
          g.stroke({ width: w, color: c, alpha: al * fade, cap: "round", join: "round" });
        }
      }
    } else if (style === "bolts") {
      if (t < 0.7 && Math.floor(t * 20) % 2 === 0) for (let i = 0; i < 2; i++) lightning(g, src.x, src.y, strike[0] + rnd(-0.2, 0.2) * R, strike[1] + rnd(-0.2, 0.2) * R, unit * 0.4, color, unit * 0.012);
    } else if (style === "splash") {
      const w = ease.out(k);
      if (k > 0 && k < 1) {
        g.moveTo(strike[0] - R, strike[1] + R * 0.3);
        g.quadraticCurveTo(strike[0] - R * 0.2, strike[1] - R * (0.9 * w), strike[0] + R * (w * 1.2 - 0.2), strike[1] + R * 0.2);
        g.stroke({ width: unit * 0.05, color, alpha: 0.6 * (1 - k) });
      }
    } else if (style === "saw") {
      const spin = t * 30;
      const k2 = span(t, 0.1, 0.7);
      if (k2 > 0 && k2 < 1) {
        const r = R * 0.45;
        for (let i = 0; i < 3; i++) {
          const a = spin + (i * Math.PI * 2) / 3;
          g.arc(strike[0], strike[1], r, a, a + 1.4).stroke({ width: unit * 0.03, color, alpha: 0.8 * (1 - k2) });
        }
        if (Math.random() < 0.9) {
          const a = rnd(0, Math.PI * 2);
          bits.add(sparkTexture(), strike[0] + Math.cos(a) * r, strike[1] + Math.sin(a) * r, { vx: -Math.sin(a) * unit * 2, vy: Math.cos(a) * unit * 2, gravity: unit * 2, life: 0.4, tint: Math.random() < 0.5 ? 0xffd27a : color, scale: (unit / 180) * 0.3 });
        }
      }
    } else if (style === "apple") {
      const k2 = ease.out(span(t, 0, 0.4));
      if (k2 < 1) {
        const y = strike[1] - R * 1.4 * (1 - k2 * k2);
        const r = R * 0.3;
        g.circle(strike[0], y, r).stroke({ width: 1.5, color, alpha: 0.9 });
        for (let i = 1; i < 4; i++) g.ellipse(strike[0], y, r * (i / 4), r).stroke({ width: 1, color, alpha: 0.7 });
        for (let i = 1; i < 4; i++) g.ellipse(strike[0], y - r + (2 * r * i) / 4, r * Math.sin((Math.PI * i) / 4), r * 0.15).stroke({ width: 1, color, alpha: 0.7 });
      }
      if (t > 0.4 && t < 0.45) for (let i = 0; i < 18; i++) bits.add(shardTexture(), strike[0], strike[1], { vx: rnd(-1, 1) * unit * 2.4, vy: -unit * rnd(0.4, 2), gravity: unit * 4, spin: rnd(-8, 8), life: 0.7, tint: color, scale: (unit / 180) * rnd(0.3, 0.6), blend: "normal" });
    } else if (style === "cubes" && t < 0.35 && Math.random() < 0.9) {
      bits.add(cubeTexture(), src.x, src.y, { vx: (strike[0] - src.x) * 3.2 + rnd(-40, 40), vy: (strike[1] - src.y) * 3.2 + rnd(-40, 40), life: 0.3, spin: 6, tint: Math.random() < 0.5 ? 0xbfe9ff : 0xffd3a8, scale: (unit / 180) * 0.45 });
    }
    if (!landed && t > 0.4) {
      landed = true;
      burst(bits, strike[0], strike[1], 26, color, unit * 2, { life: 0.55, scale: 0.4, gravity: style === "splash" ? unit * 3 : 0 });
      navigator.vibrate?.(20);
    }
    const r = span(t, 0.4, 0.9);
    if (r > 0 && r < 1) g.circle(strike[0], strike[1], R * (0.3 + 0.9 * ease.out(r))).stroke({ width: unit * 0.02 * (1 - r) + 1, color, alpha: 1 - r });
    bits.step(dt);
    return t < 1.1 || bits.list.length > 0;
  }).then(() => g.destroy());
}
