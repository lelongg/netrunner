import { BlurFilter, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { GlitchFilter, GlowFilter, MotionBlurFilter, RGBSplitFilter, ShockwaveFilter, TwistFilter, ZoomBlurFilter } from "pixi-filters";
import { Emitter, cardSprite, dissolveFilter, ease, glowTexture, layer, lightning, run, span, sparkTexture, stage } from "./stage";

const GOLD = 0xf6c945;
const CYAN = 0x22d3ee;
const GREEN = 0x3ddc84;
const RED = 0xff3b30;
const VIOLET = 0xc792ff;
const WHITE = 0xffffff;

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

const coinTexture = () =>
  painted("coin", 64, 64, (g) => {
    const r = g.createRadialGradient(24, 22, 4, 32, 32, 30);
    r.addColorStop(0, "#fff6c4");
    r.addColorStop(0.5, "#f6c945");
    r.addColorStop(1, "#9a6a00");
    g.fillStyle = r;
    g.beginPath();
    g.arc(32, 32, 29, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(90,60,0,0.8)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(32, 32, 21, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(90,60,0,0.85)";
    g.font = "bold 26px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("¢", 32, 34);
  });

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
    g.font = "bold 16px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("¢", 48, 25);
  });

const backTexture = (side: "corp" | "runner") =>
  painted(`back-${side}`, 63, 88, (g) => {
    g.fillStyle = side === "corp" ? "#122340" : "#3a1214";
    g.fillRect(0, 0, 63, 88);
    g.strokeStyle = side === "corp" ? "#4a7bd6" : "#e0533f";
    g.lineWidth = 3;
    g.strokeRect(2, 2, 59, 84);
    g.globalAlpha = 0.35;
    for (let i = -88; i < 63; i += 10) {
      g.beginPath();
      g.moveTo(i, 88);
      g.lineTo(i + 88, 0);
      g.stroke();
    }
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

function glowLabel(text: string, color: number, size: number) {
  const t = new Text({ text, style: { fontFamily: "Big Shoulders Display, sans-serif", fontWeight: "900", fontSize: size, fill: 0xffffff, stroke: { color, width: Math.max(2, size * 0.06) } } });
  t.anchor.set(0.5);
  t.filters = [new GlowFilter({ color, distance: 14, outerStrength: 2.4, quality: 0.3 })];
  return t;
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

export async function sureGamble(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, zoom, done, cx } = await scene(rect, code, ready);
  const glow = new GlowFilter({ color: GOLD, distance: 18, outerStrength: 0, innerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const w = rect.width * 0.84;
  const h = rect.height * 0.24;
  const px = cx - w / 2;
  const py = rect.top + rect.height * 0.56;
  const panel = new Graphics().roundRect(px, py, w, h, 10).fill({ color: 0x07080a, alpha: 0.88 }).stroke({ color: GOLD, width: 2, alpha: 0.9 });
  root.addChild(panel);
  const symbols = ["7", "¢", "◆", "★", "¢", "◆", "7"];
  const cell = h - 12;
  const reels = [0, 1, 2].map((i) => {
    const rw = (w - 24) / 3;
    const x = px + 6 + i * (rw + 6);
    const mask = new Graphics().rect(x, py + 6, rw, cell).fill(0xffffff);
    const strip = new Container();
    const blur = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 9 });
    strip.filters = [blur];
    for (let k = 0; k < 28; k++) {
      const s = symbols[k % symbols.length];
      const t = new Text({ text: s, style: { fontFamily: "Big Shoulders Display, sans-serif", fontWeight: "900", fontSize: cell * 0.78, fill: s === "7" ? 0xff4d3d : s === "¢" ? GOLD : 0xf2efe6 } });
      t.anchor.set(0.5);
      t.position.set(x + rw / 2, py + 6 + cell / 2 + k * cell);
      strip.addChild(t);
    }
    strip.mask = mask;
    root.addChild(mask, strip);
    const stopAt = 0.7 + i * 0.22;
    const final = -(28 - 1 - ((28 - 1) % symbols.length)) * cell;
    return { strip, blur, stopAt, final, x: x + rw / 2, landed: false };
  });
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const coins = new Emitter(root);
  const flare = new Sprite(glowTexture());
  flare.anchor.set(0.5);
  flare.tint = GOLD;
  flare.blendMode = "add";
  flare.alpha = 0;
  fx.addChild(flare);
  const home = board?.credits ? Array.from({ length: 9 }, (_, i) => homing(fx, sparkTexture(), [cx, py + h / 2], pt(board.credits!), 1.35 + i * 0.05, GOLD, 0.6, (Math.random() - 0.5) * 180)) : [];
  let burstAt = 0;
  let hit = false;
  await run(app, (t, dt) => {
    zoom(1 + 0.05 * ease.back(span(t, 0, 0.3)) - 0.05 * span(t, 1.9, 2.3));
    glow.outerStrength = 3 * span(t, 0, 0.3) * (1 - span(t, 1.9, 2.3)) + (burstAt ? 2 * Math.max(0, 1 - (t - burstAt) * 2) : 0);
    for (const r of reels) {
      const k = span(t, 0.1, r.stopAt);
      r.strip.y = r.final * ease.out(k);
      r.blur.velocity = { x: 0, y: Math.min(40, Math.abs(r.final * (1 - k) * 3) * 0.02) };
      if (k >= 1 && !r.landed) {
        r.landed = true;
        burst(sparks, r.x, py + h / 2, 12, GOLD, 220, { life: 0.45, scale: 0.5 });
      }
    }
    if (t > 1.2 && !burstAt) {
      burstAt = t;
      for (let n = 0; n < 40; n++) coins.add(coinTexture(), cx + (Math.random() - 0.5) * w * 0.5, py + h / 2, { vx: (Math.random() - 0.5) * 520, vy: -460 - Math.random() * 500, gravity: 1500, life: 1 + Math.random() * 0.3, scale: 0.35 + Math.random() * 0.25, blend: "normal" });
      burst(sparks, cx, py + h / 2, 36, GOLD, 420, { life: 0.9, scale: 0.6 });
      navigator.vibrate?.([20, 20, 20, 60]);
    }
    const f = burstAt ? t - burstAt : -1;
    flare.position.set(cx, py + h / 2);
    flare.scale.set(f > 0 ? 2 + f * 10 : 0);
    flare.alpha = f > 0 ? Math.max(0, 0.9 - f * 1.6) : 0;
    for (const c of coins.list) c.s.scale.x = Math.cos(c.age * 14) * c.s.scale.y;
    if (flyHome(home, t, sparks) === home.length && home.length && !hit) {
      hit = true;
      landing(sparks, board?.credits, GOLD);
    }
    sparks.step(dt);
    coins.step(dt);
    panel.alpha = 1 - span(t, 1.9, 2.3);
    for (const r of reels) r.strip.alpha = panel.alpha;
    return t < 2.4 || coins.list.length > 0 || sparks.list.length > 0;
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
  const label = glowLabel("+9", GREEN, rect.width * 0.36);
  label.alpha = 0;
  root.addChild(fx, label);
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
    const lk = span(t, 1.05, 1.4);
    label.position.set(cx, rect.top + rect.height * 0.32 - 30 * ease.out(span(t, 1.05, 2.2)));
    label.alpha = lk * (1 - span(t, 1.8, 2.2));
    label.scale.set(0.6 + 0.4 * ease.back(lk));
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
    twist.offset = { x: cx, y: cy };
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

export async function overclock(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, zoom, done, cx, cy } = await scene(rect, code, ready);
  const glitch = new GlitchFilter({ slices: 8, offset: 0, fillMode: 2 });
  const zb = new ZoomBlurFilter({ strength: 0, center: { x: cx, y: cy }, innerRadius: rect.width * 0.4 });
  card.filters = [glitch];
  const streaks = new Container();
  streaks.filters = [zb, new BlurFilter({ strength: 1 })];
  root.addChildAt(streaks, 0);
  const bolts = new Graphics();
  fx.addChild(bolts);
  const sparks = new Emitter(fx);
  const lines: { s: Sprite; a: number; d: number; v: number }[] = [];
  let next = 0;
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.25) * (1 - span(t, 1.6, 1.9));
    glitch.offset = t % 0.35 < 0.07 && t < 1.6 ? 18 : 0;
    glitch.seed = Math.random();
    zb.strength = 0.25 * on;
    zb.center = { x: cx, y: cy };
    if (t < 1.6 && Math.random() < 0.9) {
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0, 0.5);
      s.height = 2;
      s.width = 40 + Math.random() * 80;
      s.tint = Math.random() < 0.3 ? WHITE : CYAN;
      s.blendMode = "add";
      const a = Math.random() * Math.PI * 2;
      s.rotation = a;
      streaks.addChild(s);
      lines.push({ s, a, d: rect.width * 0.4, v: 900 + Math.random() * 700 });
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      l.d += l.v * dt;
      l.s.position.set(cx + Math.cos(l.a) * l.d, cy + Math.sin(l.a) * l.d);
      l.s.alpha = Math.max(0, 1 - l.d / (rect.width * 3));
      if (l.s.alpha <= 0) {
        l.s.destroy();
        lines.splice(i, 1);
      }
    }
    if (t > next && t < 1.7) {
      next = t + 0.05 + Math.random() * 0.06;
      bolts.clear();
      for (let b = 0; b < 3; b++) {
        const side = Math.floor(Math.random() * 4);
        const u = Math.random();
        const [x0, y0] = side === 0 ? [rect.left + u * rect.width, rect.top] : side === 1 ? [rect.right, rect.top + u * rect.height] : side === 2 ? [rect.left + u * rect.width, rect.bottom] : [rect.left, rect.top + u * rect.height];
        const a = Math.atan2(y0 - cy, x0 - cx) + (Math.random() - 0.5) * 0.8;
        const len = 40 + Math.random() * 90;
        lightning(bolts, x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, 26, CYAN, 1.6);
        sparks.add(sparkTexture(), x0, y0, { life: 0.3, tint: CYAN, scale: 0.6, grow: -1.5 });
      }
    }
    if (t >= 1.7) bolts.clear();
    sparks.step(dt);
    zoom(1 + 0.04 * Math.sin(t * 40) * on + 0.06 * ease.back(span(t, 0, 0.25)) * (1 - span(t, 1.7, 2)));
    return t < 2 || lines.length > 0;
  });
  done();
}

export async function dzmzInstall(rect: DOMRect, code: string, ready?: Ready) {
  const { app, root, card, fx, done, cx, unit } = await scene(rect, code, ready);
  const dissolve = dissolveFilter([0.13, 0.83, 0.93]);
  card.filters = [dissolve];
  const beam = new Sprite(glowTexture());
  beam.anchor.set(0.5);
  beam.tint = CYAN;
  beam.blendMode = "add";
  beam.width = rect.width * 1.5;
  beam.height = Math.max(12, unit * 0.12);
  fx.addChild(beam);
  const sparks = new Emitter(fx);
  const sheen = new Graphics();
  sheen.blendMode = "add";
  const mask = new Graphics().roundRect(rect.left, rect.top, rect.width, rect.height, 6).fill(0xffffff);
  sheen.mask = mask;
  root.addChild(mask, sheen);
  const frame = new Graphics().roundRect(rect.left - 3, rect.top - 3, rect.width + 6, rect.height + 6, 8).stroke({ color: CYAN, width: 2 });
  fx.addChild(frame);
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0.05, 1));
    dissolve.resources.dissolve.uniforms.uProgress = k;
    const by = rect.bottom - rect.height * k;
    beam.position.set(cx, by);
    beam.alpha = k > 0 && k < 1 ? 1 : 0;
    if (k > 0 && k < 1) for (let n = 0; n < 2; n++) sparks.add(sparkTexture(), rect.left + Math.random() * rect.width, by, { vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 120, life: 0.6, tint: CYAN, scale: (0.25 + Math.random() * 0.25) * (unit / 180), drag: 1 });
    sparks.step(dt);
    frame.alpha = (Math.random() < 0.15 ? 0.4 : 1) * span(t, 0, 0.15) * (1 - span(t, 1.1, 1.4));
    const s = span(t, 1, 1.7);
    sheen.clear();
    if (s > 0 && s < 1) {
      const x = rect.left - rect.width + s * rect.width * 3;
      sheen.poly([x, rect.top, x + rect.width * 0.35, rect.top, x + rect.width * 0.35 - rect.height * 0.4, rect.bottom, x - rect.height * 0.4, rect.bottom]).fill({ color: 0xbff8ff, alpha: 0.35 });
    }
    return t < 1.75 || sparks.list.length > 0;
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
  const { app, root, fx, done, cx, unit } = await scene(rect, code, ready);
  const colors = [0xff3b30, 0xf6e03a, CYAN, VIOLET];
  const strokes = colors.map((c, i) => {
    const g = new Graphics();
    root.addChild(g);
    const y0 = rect.top + rect.height * (0.2 + i * 0.17);
    const pts = Array.from({ length: 9 }, (_, k) => [rect.left - 10 + ((rect.width + 20) * k) / 8, y0 + Math.sin(k * 1.3 + i) * rect.height * 0.05] as [number, number]);
    return { g, c, pts, at: 0.05 + i * 0.12 };
  });
  const splats = new Emitter(root);
  const sparks = new Emitter(fx);
  const label = glowLabel("+5", GOLD, rect.width * 0.34);
  label.alpha = 0;
  root.addChild(fx, label);
  const home = board?.credits ? Array.from({ length: 5 }, (_, i) => homing(fx, sparkTexture(), [cx, rect.top + rect.height * 0.4], pt(board.credits!), 0.95 + i * 0.06, GOLD, 0.6, (Math.random() - 0.5) * 160)) : [];
  let hit = false;
  let landed = false;
  await run(app, (t, dt) => {
    for (const s of strokes) {
      const k = ease.out(span(t, s.at, s.at + 0.45));
      s.g.clear();
      if (k <= 0) continue;
      const n = k * (s.pts.length - 1);
      s.g.moveTo(s.pts[0][0], s.pts[0][1]);
      for (let j = 1; j <= Math.floor(n); j++) s.g.lineTo(s.pts[j][0], s.pts[j][1]);
      const j = Math.min(s.pts.length - 2, Math.floor(n));
      const f = n - Math.floor(n);
      if (n < s.pts.length - 1) s.g.lineTo(s.pts[j][0] + (s.pts[j + 1][0] - s.pts[j][0]) * f, s.pts[j][1] + (s.pts[j + 1][1] - s.pts[j][1]) * f);
      s.g.stroke({ width: unit * 0.09, color: s.c, alpha: 0.82 * (1 - span(t, 1.6, 2)), cap: "round", join: "round" });
      if (k > 0 && k < 1 && Math.random() < 0.6) {
        const p = s.pts[Math.min(s.pts.length - 1, Math.ceil(n))];
        splats.add(glowTexture(), p[0], p[1], { vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, drag: 5, life: 1.2, tint: s.c, scale: 0.12 + Math.random() * 0.12, blend: "normal" });
      }
    }
    if (t > 0.75 && !hit) {
      hit = true;
      burst(sparks, cx, rect.top + rect.height * 0.4, 40, GOLD, 360, { life: 0.9 });
    }
    if (flyHome(home, t, sparks) === home.length && home.length && !landed) {
      landed = true;
      landing(sparks, board?.credits, GOLD);
    }
    splats.step(dt);
    sparks.step(dt);
    const lk = span(t, 0.75, 1.05);
    label.position.set(cx, rect.top + rect.height * 0.42 - 26 * ease.out(span(t, 0.75, 2)));
    label.alpha = lk * (1 - span(t, 1.6, 2));
    label.scale.set(0.6 + 0.4 * ease.back(lk));
    return t < 2.05 || sparks.list.length > 0;
  });
  done();
}

export async function pettyCash(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, cx, unit } = await scene(rect, code, ready);
  const bills = new Emitter(root);
  const sparks = new Emitter(fx);
  const label = glowLabel("+5", GREEN, rect.width * 0.34);
  label.alpha = 0;
  root.addChild(fx, label);
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
    const lk = span(t, 0.45, 0.75);
    label.position.set(cx, rect.top + rect.height * 0.34 - 26 * ease.out(span(t, 0.45, 1.9)));
    label.alpha = lk * (1 - span(t, 1.5, 1.9));
    label.scale.set(0.6 + 0.4 * ease.back(lk));
    return t < 1.95 || bills.list.length > 0 || sparks.list.length > 0;
  });
  done();
}

export async function predictivePlanogram(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, cx, cy } = await scene(rect, code, ready);
  const grid = new Graphics();
  grid.blendMode = "add";
  fx.addChild(grid);
  const cols = 6;
  const rows = 8;
  const cw = rect.width / cols;
  const ch = rect.height / rows;
  const order = Array.from({ length: cols * rows }, (_, i) => ({ i, d: Math.hypot((i % cols) + 0.5 - cols / 2, Math.floor(i / cols) + 0.5 - rows / 2) + Math.random() * 0.6 }));
  const sparks = new Emitter(fx);
  const label = glowLabel("+3", CYAN, rect.width * 0.32);
  label.alpha = 0;
  root.addChild(fx, label);
  const targets: [number, number][] = [board?.credits ? pt(board.credits) : [cx - 120, cy - 200], board?.hand ? pt(board.hand) : [cx + 120, cy + 200]];
  const home = Array.from({ length: 6 }, (_, i) => homing(fx, glowTexture(), [cx, cy], targets[i % 2], 0.8 + i * 0.06, i % 2 ? CYAN : GOLD, 0.35, (Math.random() - 0.5) * 140));
  await run(app, (t, dt) => {
    grid.clear();
    for (const { i, d } of order) {
      const k = span(t, 0.05 + d * 0.09, 0.35 + d * 0.09);
      const a = Math.sin(k * Math.PI) * (1 - span(t, 1.3, 1.7));
      if (a <= 0.01) continue;
      const x = rect.left + (i % cols) * cw;
      const y = rect.top + Math.floor(i / cols) * ch;
      grid.rect(x + 2, y + 2, cw - 4, ch - 4).fill({ color: CYAN, alpha: a * 0.22 }).stroke({ color: CYAN, width: 1, alpha: a * 0.8 });
    }
    flyHome(home, t, sparks, CYAN);
    sparks.step(dt);
    const lk = span(t, 0.8, 1.1);
    label.position.set(cx, rect.top + rect.height * 0.36 - 24 * ease.out(span(t, 0.8, 1.9)));
    label.alpha = lk * (1 - span(t, 1.5, 1.9));
    label.scale.set(0.6 + 0.4 * ease.back(lk));
    return t < 1.95 || sparks.list.length > 0;
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

export async function ritual(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, cx, cy } = await scene(rect, code, ready);
  const circle = new Graphics();
  circle.blendMode = "add";
  fx.addChild(circle);
  const backs = new Container();
  root.addChild(fx, backs);
  const R = Math.max(rect.width, rect.height) * 0.62;
  const hand = board?.hand ? pt(board.hand) : ([cx, innerHeight + 80] as [number, number]);
  const flying = Array.from({ length: 3 }, (_, i) => {
    const s = new Sprite(backTexture("runner"));
    s.anchor.set(0.5);
    s.scale.set((rect.width / 63) * 0.4);
    s.alpha = 0;
    backs.addChild(s);
    return { s, at: 0.9 + i * 0.14, side: i - 1 };
  });
  await run(app, (t) => {
    circle.clear();
    const k = ease.out(span(t, 0, 0.6));
    const a = 1 - span(t, 1.5, 1.9);
    const rot = t * 0.8;
    circle.circle(cx, cy, R * k).stroke({ width: 2, color: VIOLET, alpha: a });
    circle.circle(cx, cy, R * 0.86 * k).stroke({ width: 1, color: VIOLET, alpha: 0.6 * a });
    for (let i = 0; i < 24; i++) {
      const th = rot + (i / 24) * Math.PI * 2;
      circle.moveTo(cx + Math.cos(th) * R * 0.86 * k, cy + Math.sin(th) * R * 0.86 * k).lineTo(cx + Math.cos(th) * R * k, cy + Math.sin(th) * R * k);
    }
    circle.stroke({ width: 1.5, color: VIOLET, alpha: 0.8 * a });
    const star = Array.from({ length: 5 }, (_, i) => {
      const th = -rot * 0.6 + (i * 4 * Math.PI) / 5 - Math.PI / 2;
      return [cx + Math.cos(th) * R * 0.8 * k, cy + Math.sin(th) * R * 0.8 * k] as [number, number];
    });
    const draw = span(t, 0.2, 0.9);
    if (draw > 0) {
      circle.moveTo(star[0][0], star[0][1]);
      for (let i = 1; i <= Math.ceil(draw * 5); i++) circle.lineTo(star[i % 5][0], star[i % 5][1]);
      circle.stroke({ width: 2.5, color: 0xe7c9ff, alpha: a });
    }
    for (const f of flying) {
      const fk = span(t, f.at, f.at + 0.6);
      const e = ease.inOut(fk);
      f.s.alpha = fk > 0 && fk < 1 ? 1 : 0;
      f.s.position.set(cx + (hand[0] - cx) * e + Math.sin(e * Math.PI) * f.side * 90, cy + (hand[1] - cy) * e - Math.sin(e * Math.PI) * 60);
      f.s.rotation = f.side * 0.4 * (1 - e);
    }
    return t < 1.95;
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

export async function mutualFavor(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, cx, cy } = await scene(rect, code, ready);
  const fan = new Container();
  root.addChild(fan);
  const n = 9;
  const pick = 6;
  const cards = Array.from({ length: n }, () => {
    const s = new Sprite(backTexture("runner"));
    s.anchor.set(0.5, 1);
    s.width = rect.width * 0.34;
    s.height = rect.height * 0.34;
    fan.addChild(s);
    return s;
  });
  const halo = new Sprite(glowTexture());
  halo.anchor.set(0.5);
  halo.blendMode = "add";
  halo.tint = GOLD;
  halo.alpha = 0;
  fx.addChild(halo);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const hand = board?.hand ? pt(board.hand) : ([cx, innerHeight + 80] as [number, number]);
  await run(app, (t, dt) => {
    const k = ease.out(span(t, 0, 0.45)) * (1 - ease.inOut(span(t, 1.1, 1.5)));
    let px = cx;
    let py = cy;
    cards.forEach((c, i) => {
      const spread = (i - (n - 1) / 2) / ((n - 1) / 2);
      c.rotation = spread * 0.75 * k;
      const x = cx + spread * rect.width * 0.18 * k;
      const y = cy + rect.height * 0.42 - (i === pick ? rect.height * 0.2 * span(t, 0.55, 0.85) : 0);
      if (i === pick) {
        const go = ease.inOut(span(t, 1.05, 1.55));
        c.position.set(x + (hand[0] - x) * go, y + (hand[1] - y) * go);
        c.tint = t > 0.55 ? 0xffe9a8 : WHITE;
        c.alpha = 1 - span(t, 1.5, 1.6);
        px = c.x;
        py = c.y - c.height / 2;
      } else {
        c.position.set(x, y);
        c.alpha = span(t, 0, 0.15) * (1 - span(t, 1.2, 1.45));
      }
    });
    const ck = span(t, 0.55, 0.85);
    halo.position.set(px, py);
    halo.scale.set(1.5 * ck);
    halo.alpha = ck * (1 - span(t, 1.3, 1.6));
    if (t > 0.6 && t < 1.55 && Math.random() < 0.6) sparks.add(sparkTexture(), px + (Math.random() - 0.5) * 50, py + (Math.random() - 0.5) * 50, { life: 0.5, tint: GOLD, scale: 0.4, grow: -0.6 });
    sparks.step(dt);
    return t < 1.7;
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
  const label = glowLabel("+6", GREEN, rect.width * 0.34);
  label.alpha = 0;
  root.addChild(fx, label);
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
    const lk = span(t, 0.6, 0.9);
    label.position.set(cx, cy - rect.height * 0.12 - 24 * ease.out(span(t, 0.6, 1.8)));
    label.alpha = lk * (1 - span(t, 1.4, 1.8));
    label.scale.set(0.6 + 0.4 * ease.back(lk));
    return t < 1.85 || lines.length > 0 || sparks.list.length > 0;
  });
  card.x = cx;
  done();
}

export async function fermenter(rect: DOMRect, code: string, ready?: Ready) {
  const { app, card, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const twist = new TwistFilter({ radius: unit * 0.9, angle: 0, offset: { x: cx, y: cy }, padding: unit * 0.3 });
  const glow = new GlowFilter({ color: GREEN, distance: 12, outerStrength: 0, quality: 0.3 });
  card.filters = [twist, glow];
  const bubbles = new Emitter(fx);
  await run(app, (t, dt) => {
    twist.angle = Math.sin(t * 9) * 0.25 * (1 - span(t, 0.9, 1.4));
    twist.offset = { x: cx, y: cy };
    glow.outerStrength = 2.5 * Math.sin(Math.PI * span(t, 0, 1.4));
    for (let n = 0; n < 2 && t < 1.2; n++) {
      const x = rect.left + Math.random() * rect.width;
      bubbles.add(bubbleTexture(), x, rect.bottom - Math.random() * rect.height * 0.2, { vx: (Math.random() - 0.5) * 30, vy: -80 - Math.random() * 120, life: 0.9 + Math.random() * 0.5, scale: (unit / 180) * (0.25 + Math.random() * 0.45), blend: "normal" });
      if (Math.random() < 0.4) bubbles.add(sparkTexture(), x, rect.bottom - Math.random() * rect.height * 0.5, { vy: -60, life: 0.5, tint: GREEN, scale: 0.35 * (unit / 180), grow: -0.5 });
    }
    for (const b of bubbles.list) b.s.x += Math.sin(b.age * 12 + b.s.y) * 0.4;
    bubbles.step(dt);
    return t < 1.5 || bubbles.list.length > 0;
  });
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

export async function carmen(rect: DOMRect, code: string, ready?: Ready) {
  const { app, card, fx, done, cx, cy, unit } = await scene(rect, code, ready);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const slash = new Graphics();
  fx.addChild(slash);
  const sparks = new Emitter(fx);
  const cuts = [
    { at: 0.1, a: [rect.left - unit * 0.2, rect.top + rect.height * 0.15], b: [rect.right + unit * 0.2, rect.bottom - rect.height * 0.2] },
    { at: 0.32, a: [rect.right + unit * 0.2, rect.top + rect.height * 0.2], b: [rect.left - unit * 0.2, rect.bottom - rect.height * 0.15] },
  ];
  const hit = [false, false];
  await run(app, (t, dt) => {
    slash.clear();
    cuts.forEach((c, i) => {
      const k = span(t, c.at, c.at + 0.12);
      const fade = 1 - span(t, c.at + 0.12, c.at + 0.5);
      if (k <= 0 || fade <= 0) return;
      const x = c.a[0] + (c.b[0] - c.a[0]) * k;
      const y = c.a[1] + (c.b[1] - c.a[1]) * k;
      for (const [w, col, a] of [
        [unit * 0.08, RED, 0.3],
        [unit * 0.035, RED, 0.7],
        [unit * 0.012, WHITE, 1],
      ] as const) {
        slash.moveTo(c.a[0], c.a[1]).lineTo(x, y);
        slash.stroke({ width: w * fade, color: col, alpha: a * fade, cap: "round" });
      }
      if (k >= 1 && !hit[i]) {
        hit[i] = true;
        burst(sparks, cx, cy, 24, RED, unit * 2.4, { life: 0.5, scale: 0.5 * (unit / 180) });
        navigator.vibrate?.(25);
      }
    });
    const g = hit[0] && t < 0.6 ? 6 * (1 - span(t, 0.22, 0.6)) : 0;
    split.red = { x: -g, y: g * 0.4 };
    split.blue = { x: g, y: -g * 0.4 };
    card.x = cx + (t > 0.2 && t < 0.55 ? Math.sin(t * 120) * 3 : 0);
    sparks.step(dt);
    return t < 1.1 || sparks.list.length > 0;
  });
  card.x = cx;
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
