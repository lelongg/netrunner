import { BlurFilter, Container, DisplacementFilter, type Filter, Graphics, Sprite, Texture } from "pixi.js";
import { GlitchFilter, GlowFilter, GodrayFilter, MotionBlurFilter, RGBSplitFilter, ShockwaveFilter, TwistFilter } from "pixi-filters";
import { Emitter, cardSprite, focusFilter, ease, glowTexture, layer, lightning, run, span, sparkTexture, stage } from "./stage";

const GOLD = 0xf6c945;
const CYAN = 0x22d3ee;
const GREEN = 0x3ddc84;
const RED = 0xff3b30;
const VIOLET = 0xc792ff;
const WHITE = 0xffffff;
const CREDIT = "\ue600";
let glyphFont: Promise<unknown> | null = null;

export type Ready = () => void;

export interface Board {
  credits?: DOMRect | null;
  hand?: DOMRect | null;
  others: DOMRect[];
}

const made = new Map<string, Texture>();

function painted(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const hit = made.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!);
  const t = Texture.from(c);
  made.set(key, t);
  return t;
}

const billTexture = () =>
  painted("bill", 96, 48, (g) => {
    const r = g.createLinearGradient(0, 0, 96, 48);
    r.addColorStop(0, "#b8f5c9");
    r.addColorStop(1, "#3c9a5c");
    g.fillStyle = r;
    g.fillRect(0, 0, 96, 48);
    g.strokeStyle = "rgba(20,70,40,0.8)";
    g.lineWidth = 3;
    g.strokeRect(5, 5, 86, 38);
    g.beginPath();
    g.arc(48, 24, 12, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(20,70,40,0.9)";
    g.font = "18px anr-icon";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(CREDIT, 48, 25);
  });

const bubbleTexture = () =>
  painted("bubble", 64, 64, (g) => {
    const r = g.createRadialGradient(26, 24, 2, 32, 32, 30);
    r.addColorStop(0, "rgba(255,255,255,0.9)");
    r.addColorStop(0.3, "rgba(160,255,190,0.15)");
    r.addColorStop(0.85, "rgba(120,255,160,0.35)");
    r.addColorStop(1, "rgba(120,255,160,0)");
    g.fillStyle = r;
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
  });

async function scene(rect: DOMRect, code: string, ready?: Ready) {
  glyphFont ??= document.fonts.load("40px anr-icon").catch(() => null);
  await glyphFont;
  const app = await stage();
  const root = new Container();
  app.stage.addChild(root);
  const card = await cardSprite(root, code, rect);
  const bx = card.scale.x;
  const by = card.scale.y;
  const fx = layer(root);
  ready?.();
  return {
    app,
    root,
    card,
    fx,
    zoom: (f: number) => card.scale.set(bx * f, by * f),
    done: () => root.destroy({ children: true }),
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    unit: Math.min(rect.width, rect.height),
  };
}

function burst(e: Emitter, x: number, y: number, n: number, color: number, speed: number, o: { life?: number; scale?: number; gravity?: number; tex?: Texture } = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    e.add(o.tex ?? sparkTexture(), x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (o.life ?? 0.6) * (0.6 + Math.random() * 0.6), drag: 2.5, gravity: o.gravity ?? 0, tint: Math.random() < 0.25 ? WHITE : color, scale: (o.scale ?? 0.45) * (0.6 + Math.random() * 0.8) });
  }
}

function ringAt(g: Graphics, x: number, y: number, r: number, k: number, color: number, width = 5) {
  if (k <= 0 || k >= 1) return;
  g.circle(x, y, r * ease.out(k)).stroke({ width: width * (1 - k) + 1, color, alpha: 1 - k });
}

interface Homing {
  s: Sprite;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  at: number;
  dur: number;
  arc: number;
}

function homing(parent: Container, tex: Texture, from: [number, number], to: [number, number], at: number, tint: number, scale: number, arc: number): Homing {
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  s.tint = tint;
  s.blendMode = "add";
  s.scale.set(scale);
  s.alpha = 0;
  parent.addChild(s);
  return { s, x0: from[0], y0: from[1], x1: to[0], y1: to[1], at, dur: 0.55 + Math.random() * 0.2, arc };
}

function flyHome(list: Homing[], t: number, trail?: Emitter, color = GOLD) {
  let landed = 0;
  for (const h of list) {
    const k = span(t, h.at, h.at + h.dur);
    if (k <= 0) continue;
    const e = ease.inOut(k);
    const x = h.x0 + (h.x1 - h.x0) * e + Math.sin(e * Math.PI) * h.arc;
    const y = h.y0 + (h.y1 - h.y0) * e - Math.sin(e * Math.PI) * Math.abs(h.arc) * 0.6;
    h.s.position.set(x, y);
    h.s.alpha = k >= 1 ? 0 : 1;
    if (k < 1 && trail && Math.random() < 0.6) trail.add(sparkTexture(), x, y, { life: 0.3, tint: color, scale: h.s.scale.x * 0.6, grow: -1 });
    if (k >= 1) landed++;
  }
  return landed;
}

function landing(e: Emitter, at: DOMRect | null | undefined, color: number) {
  if (!at) return;
  burst(e, at.left + at.width / 2, at.top + at.height / 2, 14, color, 160, { life: 0.45, scale: 0.4 });
}

const pt = (r: DOMRect): [number, number] => [r.left + r.width / 2, r.top + r.height / 2];

const noiseTexture = () =>
  painted("noise", 256, 256, (g) => {
    const img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const x = (i / 4) % 256;
      const y = Math.floor(i / 4 / 256);
      const v = 128 + 60 * Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) + 40 * Math.sin(y * 0.11 + x * 0.02);
      img.data[i] = v;
      img.data[i + 1] = 255 - v;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });

function shimmer(root: Container, target: Container, rect: DOMRect, strength: number) {
  const noise = new Sprite(noiseTexture());
  noise.width = rect.width * 1.5;
  noise.height = rect.height * 1.5;
  noise.position.set(rect.left - rect.width * 0.25, rect.top);
  noise.alpha = 0;
  root.addChild(noise);
  const filter = new DisplacementFilter({ sprite: noise, scale: { x: 0, y: 0 } });
  target.filters = [...((target.filters as Filter[] | undefined) ?? []), filter];
  return (t: number, k: number) => {
    noise.y = rect.top - ((t * rect.height * 0.35) % (rect.height * 0.5));
    filter.scale.x = strength * k * 0.4;
    filter.scale.y = strength * k;
  };
}

const petalTexture = () =>
  painted("petal", 48, 24, (g) => {
    const r = g.createLinearGradient(0, 0, 48, 0);
    r.addColorStop(0, "rgba(160,220,255,0)");
    r.addColorStop(0.5, "rgba(200,240,255,1)");
    r.addColorStop(1, "rgba(160,220,255,0)");
    g.fillStyle = r;
    g.beginPath();
    g.ellipse(24, 12, 22, 7, 0, 0, Math.PI * 2);
    g.fill();
  });

export async function sureGamble(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, zoom, done, unit } = await scene(rect, code, ready);
  const at = (x: number, y: number): [number, number] => [rect.left + rect.width * x, rect.top + rect.height * y];
  const glow = new GlowFilter({ color: 0xffd9a8, distance: 16, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const mask = new Graphics().roundRect(rect.left, rect.top, rect.width, rect.height, 10).fill(0xffffff);
  const sheen = new Graphics();
  sheen.blendMode = "add";
  sheen.mask = mask;
  root.addChild(mask, sheen, fx);
  const lamps = [at(0.08, 0.26), at(0.86, 0.19), at(0.06, 0.41)].map((p) => {
    const s = new Sprite(glowTexture());
    s.anchor.set(0.5);
    s.position.set(p[0], p[1]);
    s.blendMode = "add";
    s.tint = 0xffc27a;
    s.alpha = 0;
    fx.addChild(s);
    return s;
  });
  const glints = new Emitter(fx);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0, 2.1));
    zoom(1 + 0.025 * k);
    glow.outerStrength = 1.4 * k;
    lamps.forEach((l, i) => {
      l.scale.set((unit / 128) * (0.32 + 0.05 * Math.sin(t * 3 + i * 2)));
      l.alpha = 0.45 * k;
    });
    const s = span(t, 0.35, 1.25);
    sheen.clear();
    if (s > 0 && s < 1) {
      const x = rect.left - rect.width * 0.6 + s * rect.width * 2.2;
      sheen.poly([x, rect.top, x + rect.width * 0.22, rect.top, x + rect.width * 0.22 - rect.height * 0.5, rect.bottom, x - rect.height * 0.5, rect.bottom]).fill({ color: 0xffe3b0, alpha: 0.28 });
    }
    if (t > 0.5 && t < 1.6 && Math.random() < 0.35) {
      const [gx, gy] = at(0.2 + Math.random() * 0.24, 0.27 + Math.random() * 0.22);
      glints.add(sparkTexture(), gx, gy, { life: 0.45, tint: 0xfff3dc, scale: (0.25 + Math.random() * 0.2) * (unit / 180), grow: -0.5, spin: 2 });
    }
    glints.step(dt);
    return t < 2.15;
  });
  done();
}

export async function overclock(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, zoom, done, unit } = await scene(rect, code, ready);
  const eye: [number, number] = [rect.left + rect.width * 0.5, rect.top + rect.height * 0.2];
  const glitch = new GlitchFilter({ slices: 10, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [glitch];
  const heat = shimmer(root, card, rect, unit * 0.03);
  const rings = new Graphics();
  rings.blendMode = "add";
  const core = new Sprite(glowTexture());
  core.anchor.set(0.5);
  core.blendMode = "add";
  core.tint = 0xff3b20;
  fx.addChild(core, rings);
  root.addChild(fx);
  await run(app, (t) => {
    const on = span(t, 0, 0.3) * (1 - span(t, 1.6, 2));
    heat(t, on);
    const beat = Math.max(0, Math.sin(t * Math.PI * 2 * (1.4 + t * 1.8)));
    core.position.set(eye[0], eye[1]);
    core.scale.set((unit / 128) * (0.6 + 0.5 * beat) * on);
    core.alpha = 0.7 * on;
    rings.clear();
    for (let i = 0; i < 4; i++) {
      const p = (t * (0.9 + t * 0.6) + i / 4) % 1;
      rings.circle(eye[0], eye[1], unit * (0.12 + p * 0.9)).stroke({ width: 2 + 3 * (1 - p), color: i % 2 ? 0xff7a2f : 0xff2b2b, alpha: (1 - p) * on * 0.8 });
    }
    glitch.offset = beat > 0.92 && t < 1.7 ? unit * 0.08 : 0;
    glitch.red = { x: beat > 0.92 ? -4 : 0, y: 0 };
    glitch.blue = { x: beat > 0.92 ? 4 : 0, y: 0 };
    glitch.seed = Math.random();
    zoom(1 + 0.02 * beat * on);
    return t < 2.05;
  });
  done();
}

export async function ritual(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, done, unit } = await scene(rect, code, ready);
  const at = (x: number, y: number): [number, number] => [rect.left + rect.width * x, rect.top + rect.height * y];
  const rays = new GodrayFilter({ angle: -28, gain: 0.45, lacunarity: 2.6, parallel: true, time: 0, alpha: 0 });
  card.filters = [rays];
  const holo = at(0.29, 0.5);
  const halo = new Sprite(glowTexture());
  halo.anchor.set(0.5);
  halo.blendMode = "add";
  halo.tint = 0x6fe3ff;
  fx.addChild(halo);
  const motes = new Emitter(fx);
  const steam = new Emitter(root);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0, 2.3));
    rays.time = t * 0.6;
    rays.alpha = 0.75 * k;
    halo.position.set(holo[0], holo[1]);
    halo.scale.set((unit / 128) * (0.55 + 0.06 * Math.sin(t * 7)));
    halo.alpha = 0.55 * k * (0.75 + 0.25 * Math.sin(t * 23));
    if (Math.random() < 0.5 && t < 2) motes.add(sparkTexture(), rect.left + Math.random() * rect.width * 0.7, rect.top + Math.random() * rect.height * 0.5, { vx: 6 + Math.random() * 10, vy: -4 + Math.random() * 8, life: 1.2, tint: 0xfff1cf, scale: (0.1 + Math.random() * 0.12) * (unit / 180), alpha: 0.8 });
    if (Math.random() < 0.3 && t < 1.9) {
      const [sx, sy] = at(0.43 + Math.random() * 0.06, 0.53);
      steam.add(glowTexture(), sx, sy, { vx: (Math.random() - 0.5) * 6, vy: -18 - Math.random() * 10, life: 1.4, tint: 0xffffff, scale: (unit / 128) * 0.12, grow: 0.12, alpha: 0.35, blend: "normal" });
    }
    for (const s of steam.list) s.s.x += Math.sin(s.age * 3 + s.s.y * 0.05) * 0.25;
    motes.step(dt);
    steam.step(dt);
    return t < 2.3;
  });
  done();
}

export async function dzmzInstall(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, fx, done, unit } = await scene(rect, code, ready);
  const c: [number, number] = [rect.left + rect.width * 0.74, rect.top + rect.height * 0.33];
  const R = unit * 0.16;
  const atoms: [number, number, number][] = [[0, 0, 0], [1, 0, 0], [-0.5, 0.86, 0], [-0.5, -0.86, 0], [0, 0, 1], [0, 0, -1], [1.6, 0.8, 0.4], [-1.2, 1.6, -0.3]];
  const bonds = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 7]];
  const mol = new Graphics();
  mol.blendMode = "add";
  fx.addChild(mol);
  const scan = new Graphics();
  scan.blendMode = "add";
  fx.addChild(scan);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = ease.out(span(t, 0.1, 0.6)) * (1 - span(t, 1.7, 2.1));
    const ay = t * 1.6;
    const ax = 0.5 + Math.sin(t) * 0.2;
    const proj = atoms.map(([x, y, z]) => {
      const x1 = x * Math.cos(ay) + z * Math.sin(ay);
      const z1 = -x * Math.sin(ay) + z * Math.cos(ay);
      const y1 = y * Math.cos(ax) - z1 * Math.sin(ax);
      const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
      const p = 1 / (1 - z2 * 0.18);
      return [c[0] + x1 * R * p * k, c[1] + y1 * R * p * k - (1 - k) * unit * 0.1, p] as const;
    });
    mol.clear();
    for (const [a, b] of bonds) mol.moveTo(proj[a][0], proj[a][1]).lineTo(proj[b][0], proj[b][1]);
    mol.stroke({ width: 1.5, color: CYAN, alpha: 0.8 * k });
    proj.forEach(([x, y, p], i) => mol.circle(x, y, R * (i === 0 ? 0.32 : 0.2) * p * k).fill({ color: i === 0 ? 0xbff8ff : CYAN, alpha: 0.75 * k }));
    scan.clear();
    const sy = c[1] - R * 1.6 + ((t * 1.3) % 1) * R * 3.2;
    scan.rect(c[0] - R * 1.6, sy, R * 3.2, 1.5).fill({ color: CYAN, alpha: 0.5 * k });
    if (Math.random() < 0.4 && k > 0.3) motes.add(sparkTexture(), c[0] + (Math.random() - 0.5) * R * 4, c[1] + (Math.random() - 0.5) * R * 4, { vy: -10, life: 0.6, tint: CYAN, scale: 0.18 * (unit / 180), grow: -0.2 });
    motes.step(dt);
    return t < 2.15;
  });
  done();
}

export async function fermenter(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, done, unit } = await scene(rect, code, ready);
  const sphere: [number, number] = [rect.left + rect.width * 0.5, rect.top + rect.height * 0.25];
  const heat = shimmer(root, card, rect, unit * 0.03);
  const glow = new Sprite(glowTexture());
  glow.anchor.set(0.5);
  glow.blendMode = "add";
  glow.tint = 0xff4f7a;
  fx.addChild(glow);
  const embers = new Emitter(fx);
  const bubbles = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0, 2));
    heat(t, k);
    glow.position.set(sphere[0], sphere[1]);
    glow.scale.set((unit / 128) * (0.9 + 0.1 * Math.sin(t * 6)));
    glow.alpha = 0.55 * k;
    if (Math.random() < 0.7 && t < 1.8) embers.add(sparkTexture(), sphere[0] + (Math.random() - 0.5) * unit * 0.5, sphere[1] + unit * 0.15, { vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 60, life: 0.9, tint: Math.random() < 0.5 ? 0xff7a3d : 0xff3f6c, scale: (0.15 + Math.random() * 0.2) * (unit / 180), grow: -0.15 });
    if (Math.random() < 0.35 && t < 1.7) {
      const a = Math.random() * Math.PI * 2;
      bubbles.add(bubbleTexture(), sphere[0] + Math.cos(a) * unit * 0.14, sphere[1] + Math.sin(a) * unit * 0.14, { vx: Math.cos(a) * 10, vy: -20, life: 0.8, tint: 0xd59bff, scale: (unit / 180) * (0.12 + Math.random() * 0.15), blend: "add" });
    }
    for (const e of embers.list) e.s.x += Math.sin(e.age * 9 + e.s.y * 0.1) * 0.3;
    embers.step(dt);
    bubbles.step(dt);
    return t < 2.05 || embers.list.length > 0;
  });
  done();
}

export async function carmen(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, fx, done, unit } = await scene(rect, code, ready);
  const at = (x: number, y: number): [number, number] => [rect.left + rect.width * x, rect.top + rect.height * y];
  const her = at(0.5, 0.3);
  const ribbons = new Graphics();
  ribbons.blendMode = "add";
  fx.addChild(ribbons);
  const petals = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0, 2.1));
    ribbons.clear();
    for (let r = 0; r < 3; r++) {
      const phase = r * 2.1;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 28; i++) {
        const u = i / 28;
        const a = phase + u * Math.PI * 1.6 + t * (1.8 + r * 0.3);
        const rad = unit * (0.12 + u * 0.32);
        pts.push([her[0] + Math.cos(a) * rad, her[1] + u * unit * 0.45 + Math.sin(a) * rad * 0.35]);
      }
      for (const [w, a] of [
        [unit * 0.05, 0.18],
        [unit * 0.012, 0.85],
      ] as const) {
        ribbons.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) ribbons.lineTo(p[0], p[1]);
        ribbons.stroke({ width: w, color: r === 1 ? 0x9fe3ff : 0x3d8bff, alpha: a * k, cap: "round", join: "round" });
      }
    }
    if (Math.random() < 0.45 && t < 1.8) petals.add(petalTexture(), her[0] + (Math.random() - 0.5) * unit * 0.8, her[1] + (Math.random() - 0.2) * unit * 0.6, { vx: 25 + Math.random() * 25, vy: -12 + Math.random() * 20, spin: (Math.random() - 0.5) * 3, life: 1.2, tint: 0xa8dcff, scale: (0.25 + Math.random() * 0.25) * (unit / 180) });
    petals.step(dt);
    return t < 2.15 || petals.list.length > 0;
  });
  done();
}

export async function predictivePlanogram(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, fx, done, unit } = await scene(rect, code, ready);
  const at = (x: number, y: number): [number, number] => [rect.left + rect.width * x, rect.top + rect.height * y];
  const prey = at(0.6, 0.16);
  const grid = new Graphics();
  grid.blendMode = "add";
  const reticle = new Graphics();
  fx.addChild(grid, reticle);
  const tags = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = span(t, 0, 0.3) * (1 - span(t, 1.8, 2.2));
    grid.clear();
    const sweep = rect.top + ((t * 0.9) % 1) * rect.height * 0.6;
    grid.rect(rect.left, sweep, rect.width, 2).fill({ color: 0x4fd2ff, alpha: 0.7 * k });
    for (let i = 1; i < 7; i++) {
      const x = rect.left + (rect.width * i) / 7;
      grid.moveTo(x, rect.top + rect.height * 0.05).lineTo(rect.left + rect.width / 2 + (x - rect.left - rect.width / 2) * 0.4, rect.top + rect.height * 0.58);
    }
    grid.stroke({ width: 1, color: 0x4fd2ff, alpha: 0.25 * k });
    const lock = ease.out(span(t, 0.3, 1.1));
    const wob = (1 - lock) * unit * 0.25;
    const rx = prey[0] + Math.sin(t * 7) * wob;
    const ry = prey[1] + Math.cos(t * 5) * wob;
    const r = unit * (0.16 - 0.06 * lock);
    reticle.clear();
    reticle.circle(rx, ry, r).stroke({ width: 1.5, color: RED, alpha: k });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + t * (1 - lock) * 3;
      reticle.moveTo(rx + Math.cos(a) * r * 0.6, ry + Math.sin(a) * r * 0.6).lineTo(rx + Math.cos(a) * r * 1.5, ry + Math.sin(a) * r * 1.5);
    }
    reticle.stroke({ width: 2, color: RED, alpha: k });
    if (lock >= 1 && t < 1.6 && Math.random() < 0.3) tags.add(sparkTexture(), rx + (Math.random() - 0.5) * r * 2, ry + (Math.random() - 0.5) * r * 2, { life: 0.4, tint: RED, scale: 0.3 * (unit / 180), grow: -0.5 });
    tags.step(dt);
    return t < 2.25;
  });
  done();
}

export async function hedgeFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, cx } = await scene(rect, code, ready);
  const dim = new Graphics().roundRect(rect.left, rect.top, rect.width, rect.height, 10).fill({ color: 0x020806, alpha: 0.55 });
  const grid = new Graphics();
  for (let i = 1; i < 6; i++) grid.moveTo(rect.left + 8, rect.top + (rect.height * i) / 6).lineTo(rect.right - 8, rect.top + (rect.height * i) / 6);
  grid.stroke({ color: GREEN, width: 1, alpha: 0.18 });
  root.addChild(dim, grid);
  const pts: [number, number][] = [];
  let y = rect.bottom - rect.height * 0.15;
  for (let i = 0; i <= 12; i++) {
    pts.push([rect.left + rect.width * 0.08 + (rect.width * 0.84 * i) / 12, y]);
    y -= (rect.height * 0.55) / 12 + (Math.random() - 0.35) * rect.height * 0.08 * (i % 3 === 2 ? -1.6 : 1);
  }
  const line = new Graphics();
  fx.addChild(line);
  const head = new Sprite(sparkTexture());
  head.anchor.set(0.5);
  head.blendMode = "add";
  head.tint = GREEN;
  fx.addChild(head);
  const trail = new Emitter(fx);
  root.addChild(fx);
  const top = pts[pts.length - 1];
  const home = board?.credits ? Array.from({ length: 9 }, (_, i) => homing(fx, sparkTexture(), top, pt(board.credits!), 1.2 + i * 0.05, GOLD, 0.6, (Math.random() - 0.5) * 160)) : [];
  let hit = false;
  await run(app, (t, dt) => {
    dim.alpha = span(t, 0, 0.2) * (1 - span(t, 1.8, 2.2));
    grid.alpha = dim.alpha;
    const k = ease.inOut(span(t, 0.15, 1.05));
    const n = k * (pts.length - 1);
    const i = Math.floor(n);
    const f = n - i;
    const hx = i >= pts.length - 1 ? top[0] : pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
    const hy = i >= pts.length - 1 ? top[1] : pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    line.clear();
    const color = t > 1.05 ? GOLD : GREEN;
    for (const [lw, a] of [
      [10, 0.15],
      [5, 0.4],
      [2.2, 1],
    ] as const) {
      line.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j <= i && j < pts.length; j++) line.lineTo(pts[j][0], pts[j][1]);
      line.lineTo(hx, hy);
      line.stroke({ width: lw, color: a === 1 ? WHITE : color, alpha: a * (1 - span(t, 1.8, 2.2)), cap: "round", join: "round" });
    }
    head.position.set(hx, hy);
    head.scale.set(0.8 + 0.2 * Math.sin(t * 30));
    head.alpha = 1 - span(t, 1.2, 1.5);
    if (t < 1.1 && Math.random() < 0.8) trail.add(sparkTexture(), hx, hy, { vx: (Math.random() - 0.5) * 60, vy: 30 + Math.random() * 60, life: 0.6, tint: GREEN, scale: 0.25 + Math.random() * 0.2, grow: -0.3 });
    if (flyHome(home, t, trail) === home.length && home.length && !hit) {
      hit = true;
      landing(trail, board?.credits, GOLD);
    }
    trail.step(dt);
    return t < 2.25 || trail.list.length > 0;
  });
  done();
}

export async function spinDoctor(rect: DOMRect, code: string, ready?: Ready) {
  const { app, card, fx, zoom, done, cx, cy, unit } = await scene(rect, code, ready);
  const twist = new TwistFilter({ radius: Math.hypot(rect.width, rect.height) * 0.6, angle: 0, offset: { x: cx, y: cy }, padding: unit });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [twist, split];
  const orbit = new Emitter(fx);
  const ring = new Graphics();
  fx.addChild(ring);
  await run(app, (t, dt) => {
    const p = span(t, 0.05, 1.3);
    const k = Math.sin(Math.PI * p);
    twist.angle = 1.6 * k * k * Math.sin(p * Math.PI * 2);
    const tb = card.getBounds();
    twist.offset = { x: tb.width / 2 + unit, y: tb.height / 2 + unit };
    const s = 4 * Math.max(0, 1 - Math.abs(t - 0.65) * 3);
    split.red = { x: -s, y: 0 };
    split.blue = { x: s, y: 0 };
    zoom(1 - 0.08 * k);
    for (let n = 0; n < 3 && t < 1.3; n++) {
      const a = t * 9 + n * ((Math.PI * 2) / 3);
      const rr = Math.max(rect.width, rect.height) * (0.6 - 0.12 * k);
      orbit.add(sparkTexture(), cx + Math.cos(a) * rr * 0.8, cy + Math.sin(a) * rr, { life: 0.45, tint: n === 1 ? VIOLET : CYAN, scale: 0.5 * (unit / 180), grow: -1 });
    }
    orbit.step(dt);
    ring.clear();
    ringAt(ring, cx, cy, Math.max(rect.width, rect.height) * 1.2, span(t, 1.15, 1.8), CYAN, 6);
    return t < 1.85 || orbit.list.length > 0;
  });
  done();
}

export async function pingRez(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const wave = new ShockwaveFilter({ center: { x: cx, y: cy }, amplitude: unit * 0.1, wavelength: unit * 0.45, speed: unit * 2.6, brightness: 1.15, radius: -1, time: 0 });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [wave, split];
  const rings = new Graphics();
  fx.addChild(rings);
  const dots = new Emitter(fx);
  const core = new Sprite(glowTexture());
  core.anchor.set(0.5);
  core.tint = RED;
  core.blendMode = "add";
  fx.addChild(core);
  root.addChild(fx);
  const reach = Math.max(innerWidth, innerHeight) * 0.9;
  const speed = reach / 1.1;
  const pinged = new Set<number>();
  const others = board?.others ?? [];
  await run(app, (t, dt) => {
    wave.time = Math.max(0, t - 0.1);
    wave.center = { x: cx, y: cy };
    const g = t < 0.25 ? (1 - t / 0.25) * 8 : 0;
    split.red = { x: -g, y: 0 };
    split.blue = { x: g, y: g * 0.5 };
    rings.clear();
    for (let n = 0; n < 3; n++) ringAt(rings, cx, cy, reach, span(t, 0.1 + n * 0.25, 1.2 + n * 0.25), RED, 4);
    const front = Math.max(0, t - 0.1) * speed;
    others.forEach((o, i) => {
      if (pinged.has(i)) return;
      const [ox, oy] = pt(o);
      if (Math.hypot(ox - cx, oy - cy) > front) return;
      pinged.add(i);
      dots.add(glowTexture(), ox, oy, { life: 0.5, tint: RED, scale: Math.min(o.width, o.height) / 70, grow: 1 });
      dots.add(sparkTexture(), ox, oy, { life: 0.4, tint: WHITE, scale: 0.5, grow: -1 });
    });
    if (t < 1.2 && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.max(rect.width, rect.height) * (0.6 + Math.random() * 0.6);
      dots.add(sparkTexture(), cx + Math.cos(a) * d, cy + Math.sin(a) * d, { life: 0.5, tint: RED, scale: 0.35 * (unit / 180), grow: -0.6 });
    }
    dots.step(dt);
    core.position.set(cx, cy);
    core.scale.set((1 + 3 * span(t, 0, 0.3)) * (unit / 180));
    core.alpha = (1 - span(t, 0.1, 0.6)) * 0.9;
    card.tint = t < 0.3 ? 0xffd0c8 : WHITE;
    return t < 1.9;
  });
  done();
}

export async function creativeCommission(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, cx, unit } = await scene(rect, code, ready);
  const at = (x: number, y: number): [number, number] => [rect.left + rect.width * x, rect.top + rect.height * y];
  const shells = [
    { at: 0.05, from: at(0.62, 0.42), to: at(0.3, 0.24), colors: [0xff4fd8, CYAN], size: 1 },
    { at: 0.35, from: at(0.8, 1.05), to: at(0.78, -0.06), colors: [0xf6e03a, 0xff6a3d], size: 0.9 },
    { at: 0.6, from: at(0.15, 1.05), to: at(0.12, 0.02), colors: [VIOLET, CYAN], size: 0.85 },
    { at: 0.9, from: at(0.5, 1.05), to: at(0.5, 0.1), colors: [GOLD, WHITE], size: 1.35 },
  ].map((sh) => ({ ...sh, burst: false }));
  const glow = new GlowFilter({ color: 0xff4fd8, distance: 14, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const trails = new Emitter(fx);
  const stars = new Emitter(fx);
  const flashes = new Emitter(fx);
  root.addChild(fx);
  const home = board?.credits ? Array.from({ length: 5 }, (_, i) => homing(fx, sparkTexture(), at(0.5, 0.1), pt(board.credits!), 1.25 + i * 0.06, GOLD, 0.6, (Math.random() - 0.5) * 160)) : [];
  let landed = false;
  await run(app, (t, dt) => {
    for (const sh of shells) {
      const k = span(t, sh.at, sh.at + 0.32);
      if (k > 0 && k < 1) {
        const e = ease.out(k);
        const x = sh.from[0] + (sh.to[0] - sh.from[0]) * e;
        const y = sh.from[1] + (sh.to[1] - sh.from[1]) * e;
        trails.add(sparkTexture(), x, y, { vx: (Math.random() - 0.5) * 30, vy: 40, life: 0.35, tint: 0xffe2b0, scale: 0.35 * (unit / 180), grow: -0.8 });
      }
      if (k >= 1 && !sh.burst) {
        sh.burst = true;
        const [x, y] = sh.to;
        const n = Math.round(40 * sh.size);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
          const v = unit * 2.1 * sh.size * (0.85 + Math.random() * 0.3);
          stars.add(sparkTexture(), x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.2, gravity: unit * 1.1, life: 1 + Math.random() * 0.4, tint: sh.colors[i % sh.colors.length], scale: 0.36 * (unit / 180) * sh.size });
        }
        flashes.add(glowTexture(), x, y, { life: 0.22, tint: sh.colors[0], scale: (unit / 128) * 0.5 * sh.size, grow: 1.5, alpha: 0.6 });
        navigator.vibrate?.(12);
      }
    }
    for (const st of stars.list) {
      if (Math.random() < 0.05) trails.add(sparkTexture(), st.s.x, st.s.y, { vy: 30, life: 0.45, tint: st.s.tint, scale: st.s.scale.x * 0.5, grow: -0.6 });
      if (st.age > 0.6) st.s.alpha *= Math.random() < 0.3 ? 0.4 : 1;
    }
    glow.outerStrength = 2.2 * Math.sin(Math.PI * span(t, 0, 1.6));
    trails.step(dt);
    stars.step(dt);
    flashes.step(dt);
    if (flyHome(home, t, trails) === home.length && home.length && !landed) {
      landed = true;
      landing(trails, board?.credits, GOLD);
    }
    return t < 2.35 || stars.list.length > 0 || trails.list.length > 0;
  });
  done();
}

export async function pettyCash(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, cx, unit } = await scene(rect, code, ready);
  const bills = new Emitter(root);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const home = board?.credits ? Array.from({ length: 5 }, (_, i) => homing(fx, sparkTexture(), [cx, rect.top + rect.height * 0.4], pt(board.credits!), 0.85 + i * 0.06, GREEN, 0.6, (Math.random() - 0.5) * 160)) : [];
  let landed = false;
  let spawned = 0;
  await run(app, (t, dt) => {
    while (spawned < 22 && t > spawned * 0.035) {
      spawned++;
      bills.add(billTexture(), cx + (Math.random() - 0.5) * rect.width * 0.4, rect.top + rect.height * 0.55, { vx: (Math.random() - 0.5) * 420, vy: -520 - Math.random() * 300, gravity: 900, drag: 1.2, spin: (Math.random() - 0.5) * 9, life: 1.5, scale: (unit / 180) * (0.45 + Math.random() * 0.2), blend: "normal" });
    }
    for (const b of bills.list) b.s.scale.y = Math.abs(Math.cos(b.age * 9)) * b.s.scale.x * 0.9 + 0.1 * b.s.scale.x;
    if (Math.random() < 0.5 && t < 1.2) sparks.add(sparkTexture(), cx + (Math.random() - 0.5) * rect.width, rect.top + Math.random() * rect.height * 0.6, { life: 0.5, tint: GREEN, scale: 0.4, grow: -0.7 });
    if (flyHome(home, t, sparks, GREEN) === home.length && home.length && !landed) {
      landed = true;
      landing(sparks, board?.credits, GREEN);
    }
    bills.step(dt);
    sparks.step(dt);
    return t < 1.95 || bills.list.length > 0 || sparks.list.length > 0;
  });
  done();
}

export async function jailbreak(rect: DOMRect, code: string, ready?: Ready) {
  const { app, card, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const wave = new ShockwaveFilter({ center: { x: cx, y: cy }, amplitude: unit * 0.08, wavelength: unit * 0.5, speed: unit * 3, brightness: 1.1, radius: -1, time: 0 });
  card.filters = [wave, split];
  const lock = new Graphics();
  fx.addChild(lock);
  const shards = new Emitter(fx);
  const s = unit * 0.5;
  let broke = false;
  await run(app, (t, dt) => {
    lock.clear();
    const lk = span(t, 0, 0.2);
    const open = ease.back(span(t, 0.55, 0.75));
    const shake = t > 0.2 && t < 0.55 ? Math.sin(t * 90) * 4 : 0;
    const a = lk * (1 - span(t, 0.75, 0.95));
    if (a > 0) {
      const x = cx + shake;
      lock.roundRect(x - s * 0.45, cy - s * 0.1, s * 0.9, s * 0.7, 8).fill({ color: 0x0b0c0e, alpha: 0.9 * a }).stroke({ color: RED, width: 3, alpha: a });
      lock.moveTo(x - s * 0.28, cy - s * 0.1).lineTo(x - s * 0.28, cy - s * 0.35 - open * s * 0.25).arc(x, cy - s * 0.35 - open * s * 0.25, s * 0.28, Math.PI, 0).lineTo(x + s * 0.28, cy - s * 0.1 - open * s * 0.25);
      lock.stroke({ width: 5, color: RED, alpha: a });
      lock.circle(x, cy + s * 0.22, s * 0.07).fill({ color: RED, alpha: a });
    }
    if (t > 0.55 && !broke) {
      broke = true;
      burst(shards, cx, cy, 40, RED, unit * 3.2, { life: 0.8, scale: 0.55 * (unit / 180) });
      navigator.vibrate?.([30, 30, 60]);
    }
    wave.time = Math.max(0, t - 0.55);
    const g = t > 0.55 && t < 0.8 ? (1 - (t - 0.55) / 0.25) * 9 : 0;
    split.red = { x: -g, y: 0 };
    split.blue = { x: g, y: 0 };
    shards.step(dt);
    return t < 1.6 || shards.list.length > 0;
  });
  done();
}

export async function pinholeThreading(rect: DOMRect, code: string, ready?: Ready) {
  const { app, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const thread = new Graphics();
  fx.addChild(thread);
  const hole = new Sprite(glowTexture());
  hole.anchor.set(0.5);
  hole.blendMode = "add";
  hole.tint = CYAN;
  fx.addChild(hole);
  const sparks = new Emitter(fx);
  const path = (u: number): [number, number] => [rect.left - unit * 0.6 + (rect.width + unit * 1.2) * u, cy + Math.sin(u * Math.PI * 3) * rect.height * 0.28 * Math.sqrt(Math.max(0, 1 - Math.abs(u - 0.5) * 2))];
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0.15, 1.1));
    thread.clear();
    const n = 40;
    for (const [w, a] of [
      [7, 0.18],
      [3, 0.5],
      [1.3, 1],
    ] as const) {
      const p0 = path(0);
      thread.moveTo(p0[0], p0[1]);
      for (let i = 1; i <= Math.floor(n * k); i++) {
        const p = path(i / n);
        thread.lineTo(p[0], p[1]);
      }
      thread.stroke({ width: w, color: a === 1 ? WHITE : CYAN, alpha: a * (1 - span(t, 1.3, 1.7)) });
    }
    const head = path(k);
    if (k > 0 && k < 1) sparks.add(sparkTexture(), head[0], head[1], { life: 0.35, tint: CYAN, scale: 0.4 * (unit / 180), grow: -1 });
    sparks.step(dt);
    hole.position.set(cx, cy);
    const pk = Math.max(0, 1 - Math.abs(k - 0.5) * 8);
    hole.scale.set((0.3 + pk * 1.4) * (unit / 180));
    hole.alpha = (0.4 + pk * 0.6) * (1 - span(t, 1.2, 1.5));
    return t < 1.75;
  });
  done();
}

export async function mutualFavor(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const bx = card.scale.x;
  const by = card.scale.y;
  const focus: [number, number] = [rect.left + rect.width * 0.56, rect.top + rect.height * 0.42];
  const frame = new Graphics().roundRect(rect.left, rect.top, rect.width, rect.height, 10).fill(0xffffff);
  const shot = new Container();
  root.addChildAt(shot, 0);
  const blur = new BlurFilter({ strength: 0, quality: 3 });
  card.filters = [blur];
  const sharp = new Sprite(card.texture);
  sharp.anchor.set(0.5);
  sharp.filters = [focusFilter([0.56, 0.42], 0.12, 0.3, rect.width / rect.height)];
  shot.addChild(card, sharp);
  shot.mask = frame;
  root.addChild(frame);
  const vignette = new Graphics();
  root.addChild(vignette, fx);
  const streak = new Sprite(glowTexture());
  streak.anchor.set(0.5);
  streak.blendMode = "add";
  streak.tint = 0xffd9a0;
  streak.alpha = 0;
  fx.addChild(streak);
  const star = new Sprite(sparkTexture());
  star.anchor.set(0.5);
  star.blendMode = "add";
  star.alpha = 0;
  fx.addChild(star);
  const glints = new Emitter(fx);
  await run(app, (t, dt) => {
    const zin = ease.inOut(span(t, 0, 0.6));
    const zout = ease.inOut(span(t, 1.25, 1.8));
    const depth = zin * (1 - zout);
    const z = 1 + 0.8 * depth;
    const tx = focus[0] + (cx - focus[0]) * depth;
    const ty = focus[1] + (cy - focus[1]) * depth;
    const px = tx - (focus[0] - cx) * z;
    const py = ty - (focus[1] - cy) * z;
    for (const s of [card, sharp]) {
      s.scale.set(bx * z, by * z);
      s.position.set(px, py);
    }
    blur.strength = 9 * depth;
    sharp.alpha = 1;
    vignette.clear();
    if (depth > 0.01) vignette.roundRect(rect.left, rect.top, rect.width, rect.height, 10).stroke({ width: unit * 0.18, color: 0x000000, alpha: 0.45 * depth, alignment: 0 });
    const f = span(t, 0.6, 1.05);
    streak.position.set(tx - unit * 0.6 + f * unit * 1.2, ty);
    streak.width = unit * 2.2;
    streak.height = unit * 0.07;
    streak.alpha = Math.sin(Math.PI * f) * 0.9;
    const g = span(t, 0.85, 1.25);
    star.position.set(tx + unit * 0.15, ty - unit * 0.06);
    star.scale.set((unit / 64) * 0.55 * Math.sin(Math.PI * g));
    star.rotation = g * 1.5;
    star.alpha = Math.sin(Math.PI * g);
    if (t > 0.75 && t < 1.2 && Math.random() < 0.3) glints.add(sparkTexture(), tx + (Math.random() - 0.5) * unit * 0.4, ty + (Math.random() - 0.5) * unit * 0.25, { life: 0.35, tint: 0xfff0d0, scale: 0.25 * (unit / 180), grow: -0.6 });
    glints.step(dt);
    return t < 1.85;
  });
  done();
}

export async function cleanGetaway(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, zoom, done, cx, cy } = await scene(rect, code, ready);
  const blur = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 11 });
  card.filters = [blur];
  const streaks = new Container();
  root.addChildAt(streaks, 0);
  const lines: { s: Sprite; v: number }[] = [];
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const home = board?.credits ? Array.from({ length: 6 }, (_, i) => homing(fx, sparkTexture(), [cx, cy], pt(board.credits!), 0.8 + i * 0.06, GREEN, 0.6, (Math.random() - 0.5) * 160)) : [];
  let landed = false;
  await run(app, (t, dt) => {
    const dash = Math.sin(Math.PI * span(t, 0.1, 0.6));
    card.x = cx + dash * rect.width * 0.12;
    blur.velocity = { x: dash * 30, y: 0 };
    zoom(1 + 0.03 * dash);
    if (t < 1 && Math.random() < 0.9) {
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0, 0.5);
      s.width = 60 + Math.random() * 140;
      s.height = 1.5 + Math.random() * 2;
      s.tint = Math.random() < 0.25 ? RED : WHITE;
      s.blendMode = "add";
      s.alpha = 0.7;
      s.position.set(rect.right + Math.random() * 60, rect.top + Math.random() * rect.height);
      streaks.addChild(s);
      lines.push({ s, v: -1600 - Math.random() * 900 });
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      l.s.x += l.v * dt;
      if (l.s.x + l.s.width < rect.left - 120) {
        l.s.destroy();
        lines.splice(i, 1);
      }
    }
    if (flyHome(home, t, sparks, GREEN) === home.length && home.length && !landed) {
      landed = true;
      landing(sparks, board?.credits, GREEN);
    }
    sparks.step(dt);
    return t < 1.85 || lines.length > 0 || sparks.list.length > 0;
  });
  card.x = cx;
  done();
}

export async function risingTide(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const water = new Graphics();
  const mask = new Graphics().rect(rect.left, rect.top, rect.width, rect.height).fill(0xffffff);
  water.mask = mask;
  root.addChild(mask, water);
  const wave = new ShockwaveFilter({ center: { x: cx, y: cy }, amplitude: unit * 0.06, wavelength: unit * 0.4, speed: unit * 2.2, brightness: 1.15, radius: -1, time: 0 });
  card.filters = [wave];
  const glints = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const level = rect.bottom - rect.height * ease.out(span(t, 0, 0.8)) * 0.9 * (1 - ease.inOut(span(t, 1, 1.5)));
    water.clear();
    water.moveTo(rect.left, rect.bottom);
    for (let i = 0; i <= 20; i++) water.lineTo(rect.left + (rect.width * i) / 20, level + Math.sin(i * 0.9 + t * 9) * unit * 0.03);
    water.lineTo(rect.right, rect.bottom).closePath().fill({ color: 0x1673c9, alpha: 0.45 });
    if (Math.random() < 0.6 && t < 1.3) glints.add(sparkTexture(), rect.left + Math.random() * rect.width, level + Math.random() * (rect.bottom - level), { life: 0.4, tint: 0x9fe7ff, scale: 0.3 * (unit / 180), grow: -0.5 });
    glints.step(dt);
    wave.time = Math.max(0, t - 0.75);
    return t < 1.6;
  });
  done();
}

export async function echelon(rect: DOMRect, code: string, ready?: Ready) {
  const { app, fx, done, cx, unit } = await scene(rect, code, ready);
  const g = new Graphics();
  fx.addChild(g);
  const sparks = new Emitter(fx);
  await run(app, (t, dt) => {
    g.clear();
    for (let i = 0; i < 6; i++) {
      const k = span(t, i * 0.08, 0.35 + i * 0.08);
      if (k <= 0) continue;
      const a = (1 - span(t, 1, 1.4)) * Math.min(1, k * 2);
      const y = rect.bottom - rect.height * (0.1 + i * 0.14) - k * unit * 0.1;
      const w = rect.width * 0.38;
      g.moveTo(cx - w, y + unit * 0.12).lineTo(cx, y).lineTo(cx + w, y + unit * 0.12);
      g.stroke({ width: unit * 0.05, color: RED, alpha: a * 0.35, cap: "round", join: "round" });
      g.moveTo(cx - w, y + unit * 0.12).lineTo(cx, y).lineTo(cx + w, y + unit * 0.12);
      g.stroke({ width: unit * 0.018, color: 0xffd6d0, alpha: a, cap: "round", join: "round" });
      if (k > 0.95 && k < 1 && Math.random() < 0.5) sparks.add(sparkTexture(), cx, y, { life: 0.4, tint: RED, scale: 0.5 * (unit / 180), grow: -1 });
    }
    sparks.step(dt);
    return t < 1.45;
  });
  done();
}

export async function docklandsPass(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, fx, done, unit } = await scene(rect, code, ready);
  const gate = new Graphics();
  gate.blendMode = "add";
  fx.addChild(gate);
  const flash = new Graphics();
  root.addChild(fx, flash);
  await run(app, (t) => {
    gate.clear();
    const k = ease.inOut(span(t, 0.05, 0.75));
    const y = rect.top + rect.height * k;
    const a = k > 0 && k < 1 ? 1 : 0;
    gate.rect(rect.left - unit * 0.15, y - 1.5, rect.width + unit * 0.3, 3).fill({ color: RED, alpha: a });
    gate.rect(rect.left - unit * 0.15, y - 10, rect.width + unit * 0.3, 20).fill({ color: RED, alpha: 0.12 * a });
    for (let i = 0; i < 14; i++) {
      const bx = rect.left + rect.width * 0.12 + (rect.width * 0.76 * i) / 14;
      const bw = ((rect.width * 0.76) / 14) * (0.3 + ((i * 7) % 5) / 6);
      gate.rect(bx, rect.top + rect.height * 0.8, bw, rect.height * 0.1).fill({ color: GREEN, alpha: span(t, 0.75, 0.9) * (1 - span(t, 1.2, 1.5)) * 0.8 });
    }
    flash.clear();
    const fk = span(t, 0.75, 1.2);
    if (fk > 0 && fk < 1) flash.roundRect(rect.left, rect.top, rect.width, rect.height, 6).stroke({ color: GREEN, width: 3 + 6 * (1 - fk), alpha: 1 - fk });
    return t < 1.55;
  });
  done();
}

export async function flyswatter(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, card, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const glitch = new GlitchFilter({ slices: 6, offset: 0, fillMode: 2 });
  card.filters = [glitch];
  const mesh = new Graphics();
  mesh.blendMode = "add";
  fx.addChild(mesh);
  const bolts = new Graphics();
  fx.addChild(bolts);
  const bugs = new Emitter(fx);
  const targets = (board?.others ?? []).slice(0, 6);
  for (let i = 0; i < 10; i++) bugs.add(sparkTexture(), cx + (Math.random() - 0.5) * rect.width * 1.4, cy + (Math.random() - 0.5) * rect.height * 1.2, { vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.55 + Math.random() * 0.3, tint: GREEN, scale: 0.3 * (unit / 180) });
  let zap = 0;
  let n = 0;
  await run(app, (t, dt) => {
    mesh.clear();
    const k = span(t, 0, 0.3) * (1 - span(t, 1.1, 1.4));
    const step = unit * 0.14;
    for (let x = rect.left; x <= rect.right + 0.1; x += step) mesh.moveTo(x, rect.top).lineTo(x, rect.bottom);
    for (let y = rect.top; y <= rect.bottom + 0.1; y += step) mesh.moveTo(rect.left, y).lineTo(rect.right, y);
    mesh.stroke({ width: 1.2, color: CYAN, alpha: k * (0.5 + 0.5 * Math.sin(t * 50)) });
    if (t > zap && t < 1.1) {
      zap = t + 0.09;
      bolts.clear();
      const tgt = targets[n++ % Math.max(1, targets.length)];
      const end: [number, number] = tgt ? pt(tgt) : [cx + (Math.random() - 0.5) * rect.width * 1.6, cy + (Math.random() - 0.5) * rect.height * 1.6];
      lightning(bolts, cx, cy, end[0], end[1], unit * 0.25, CYAN, 1.6);
      bugs.add(glowTexture(), end[0], end[1], { life: 0.3, tint: CYAN, scale: 0.4, grow: -1 });
    }
    if (t >= 1.1) bolts.clear();
    glitch.offset = t % 0.3 < 0.06 && t < 1 ? 12 : 0;
    glitch.seed = Math.random();
    bugs.step(dt);
    return t < 1.45;
  });
  done();
}
