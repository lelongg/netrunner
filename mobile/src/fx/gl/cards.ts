import { BlurFilter, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { GlitchFilter, GlowFilter, MotionBlurFilter, RGBSplitFilter, ShockwaveFilter, TwistFilter, ZoomBlurFilter } from "pixi-filters";
import { Emitter, cardSprite, dissolveFilter, ease, glowTexture, layer, lightning, run, span, sparkTexture, stage } from "./stage";

const GOLD = 0xf6c945;
const CYAN = 0x22d3ee;
const GREEN = 0x3ddc84;
const RED = 0xff3b30;
const VIOLET = 0xc792ff;

const coinTextures: Texture[] = [];

function coinTexture() {
  if (coinTextures[0]) return coinTextures[0];
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
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
  coinTextures[0] = Texture.from(c);
  return coinTextures[0];
}

async function scene(rect: DOMRect, code: string) {
  const app = await stage();
  const root = new Container();
  app.stage.addChild(root);
  const card = await cardSprite(root, code, rect);
  const fx = layer(root);
  const done = () => root.destroy({ children: true });
  return { app, root, card, fx, done, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
}

export async function sureGamble(rect: DOMRect, code: string) {
  const { app, root, card, fx, done, cx } = await scene(rect, code);
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
    const stopAt = 0.9 + i * 0.28;
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
  let burst = false;
  await run(app, (t, dt) => {
    card.scale.set((rect.width / card.texture.width) * (1 + 0.05 * ease.back(span(t, 0, 0.35)) - 0.05 * span(t, 2.4, 2.8)));
    glow.outerStrength = 3 * span(t, 0, 0.4) * (1 - span(t, 2.3, 2.8)) + (burst ? 2 * Math.max(0, 1 - (t - 1.55) * 2) : 0);
    for (const r of reels) {
      const k = span(t, 0.1, r.stopAt);
      const y = r.final * ease.out(k);
      const v = r.final * (1 - k) * 3;
      r.strip.y = y;
      r.blur.velocity = { x: 0, y: Math.min(40, Math.abs(v) * 0.02) };
      if (k >= 1 && !r.landed) {
        r.landed = true;
        for (let n = 0; n < 14; n++) {
          const a = Math.random() * Math.PI * 2;
          sparks.add(sparkTexture(), r.x, py + h / 2, { vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.45, drag: 3, tint: GOLD, scale: 0.4 + Math.random() * 0.3 });
        }
      }
    }
    if (t > 1.55 && !burst) {
      burst = true;
      for (let n = 0; n < 46; n++) coins.add(coinTexture(), cx + (Math.random() - 0.5) * w * 0.5, py + h / 2, { vx: (Math.random() - 0.5) * 520, vy: -480 - Math.random() * 520, gravity: 1500, life: 1.3 + Math.random() * 0.4, scale: 0.35 + Math.random() * 0.25, blend: "normal", spin: (Math.random() - 0.5) * 6 });
      for (let n = 0; n < 40; n++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 120 + Math.random() * 380;
        sparks.add(sparkTexture(), cx, py + h / 2, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6 + Math.random() * 0.5, drag: 2.5, tint: Math.random() < 0.5 ? GOLD : 0xffffff, scale: 0.3 + Math.random() * 0.5 });
      }
      navigator.vibrate?.([20, 20, 20, 60]);
    }
    const f = t - 1.55;
    flare.position.set(cx, py + h / 2);
    flare.scale.set(f > 0 ? 2 + f * 10 : 0);
    flare.alpha = f > 0 ? Math.max(0, 0.9 - f * 1.6) : 0;
    for (const c of coins.list) c.s.scale.x = Math.cos(c.age * 14) * c.s.scale.y;
    sparks.step(dt);
    coins.step(dt);
    panel.alpha = 1 - span(t, 2.3, 2.7);
    for (const r of reels) r.strip.alpha = panel.alpha;
    card.alpha = 1 - span(t, 2.6, 3);
    return t < 3.1;
  });
  done();
}

export async function hedgeFund(rect: DOMRect, code: string) {
  const { app, root, card, fx, done, cx } = await scene(rect, code);
  const dim = new Graphics().roundRect(rect.left, rect.top, rect.width, rect.height, 10).fill({ color: 0x020806, alpha: 0.55 });
  dim.alpha = 0;
  root.addChild(dim);
  const grid = new Graphics();
  for (let i = 1; i < 6; i++) grid.moveTo(rect.left + 8, rect.top + (rect.height * i) / 6).lineTo(rect.right - 8, rect.top + (rect.height * i) / 6);
  grid.stroke({ color: GREEN, width: 1, alpha: 0.18 });
  grid.alpha = 0;
  root.addChild(grid);
  const pts: [number, number][] = [];
  let y = rect.bottom - rect.height * 0.15;
  for (let i = 0; i <= 12; i++) {
    const x = rect.left + rect.width * 0.08 + (rect.width * 0.84 * i) / 12;
    pts.push([x, y]);
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
  const label = new Text({ text: "+9", style: { fontFamily: "Big Shoulders Display, sans-serif", fontWeight: "900", fontSize: rect.width * 0.36, fill: 0xeafff2, stroke: { color: GREEN, width: 3 } } });
  label.anchor.set(0.5);
  label.alpha = 0;
  label.filters = [new GlowFilter({ color: GREEN, distance: 20, outerStrength: 3, quality: 0.3 })];
  root.addChild(fx, label);
  await run(app, (t, dt) => {
    dim.alpha = span(t, 0, 0.25) * (1 - span(t, 2.3, 2.7));
    grid.alpha = dim.alpha;
    const k = ease.inOut(span(t, 0.2, 1.3));
    const n = k * (pts.length - 1);
    const i = Math.floor(n);
    const f = n - i;
    const hx = i >= pts.length - 1 ? pts[pts.length - 1][0] : pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
    const hy = i >= pts.length - 1 ? pts[pts.length - 1][1] : pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    line.clear();
    const color = t > 1.3 ? GOLD : GREEN;
    for (const [w, a] of [
      [10, 0.15],
      [5, 0.4],
      [2.2, 1],
    ] as const) {
      line.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j <= i && j < pts.length; j++) line.lineTo(pts[j][0], pts[j][1]);
      line.lineTo(hx, hy);
      line.stroke({ width: w, color: a === 1 ? 0xffffff : color, alpha: a * (1 - span(t, 2.2, 2.7)), cap: "round", join: "round" });
    }
    head.position.set(hx, hy);
    head.scale.set(0.8 + 0.2 * Math.sin(t * 30));
    head.alpha = 1 - span(t, 1.5, 1.8);
    if (t < 1.35 && Math.random() < 0.8) trail.add(sparkTexture(), hx, hy, { vx: (Math.random() - 0.5) * 60, vy: 30 + Math.random() * 60, life: 0.6, tint: GREEN, scale: 0.25 + Math.random() * 0.2, grow: -0.3 });
    if (t > 1.3 && t < 1.9 && Math.random() < 0.9) trail.add(glowTexture(), rect.left + Math.random() * rect.width, rect.bottom - Math.random() * rect.height * 0.3, { vy: -140 - Math.random() * 120, life: 1, tint: GOLD, scale: 0.08 + Math.random() * 0.1 });
    trail.step(dt);
    const lk = span(t, 1.3, 1.7);
    label.position.set(cx, rect.top + rect.height * 0.32 - 30 * ease.out(span(t, 1.3, 2.6)));
    label.alpha = lk * (1 - span(t, 2.2, 2.7));
    label.scale.set(0.6 + 0.4 * ease.back(lk));
    card.alpha = 1 - span(t, 2.6, 3);
    return t < 3.1;
  });
  done();
}

export async function spinDoctor(rect: DOMRect, code: string) {
  const { app, root, card, fx, done, cx, cy } = await scene(rect, code);
  const twist = new TwistFilter({ radius: Math.hypot(rect.width, rect.height) * 0.6, angle: 0, offset: { x: cx, y: cy }, padding: rect.width });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [twist, split];
  const orbit = new Emitter(fx);
  const ring = new Graphics();
  fx.addChild(ring);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0.1, 1.5));
    twist.angle = 1.6 * k * k * Math.sin(span(t, 0.1, 1.5) * Math.PI * 2);
    twist.offset = { x: cx, y: cy };
    const s = 4 * Math.max(0, 1 - Math.abs(t - 0.8) * 3);
    split.red = { x: -s, y: 0 };
    split.blue = { x: s, y: 0 };
    card.scale.set((rect.width / card.texture.width) * (1 - 0.08 * k));
    for (let n = 0; n < 3; n++) {
      if (t > 1.5) break;
      const a = t * 9 + n * ((Math.PI * 2) / 3);
      const rr = rect.width * (0.75 - 0.15 * k);
      orbit.add(sparkTexture(), cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.3, { life: 0.45, tint: n === 1 ? VIOLET : CYAN, scale: 0.5, grow: -1 });
    }
    orbit.step(dt);
    const r = span(t, 1.35, 2.1);
    ring.clear();
    if (r > 0 && r < 1)
      ring.circle(cx, cy, rect.width * (0.3 + 1.2 * ease.out(r))).stroke({ width: 6 * (1 - r) + 1, color: CYAN, alpha: 1 - r });
    root.alpha = 1 - span(t, 2.3, 2.7);
    return t < 2.8;
  });
  done();
}

export async function overclock(rect: DOMRect, code: string) {
  const { app, root, card, fx, done, cx, cy } = await scene(rect, code);
  const glitch = new GlitchFilter({ slices: 8, offset: 0, fillMode: 2 });
  const zoom = new ZoomBlurFilter({ strength: 0, center: { x: cx, y: cy }, innerRadius: rect.width * 0.4 });
  card.filters = [glitch];
  const streaks = new Container();
  streaks.filters = [zoom, new BlurFilter({ strength: 1 })];
  root.addChildAt(streaks, 0);
  const bolts = new Graphics();
  fx.addChild(bolts);
  const sparks = new Emitter(fx);
  const lines: { s: Sprite; a: number; d: number; v: number }[] = [];
  let next = 0;
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.3) * (1 - span(t, 2, 2.4));
    glitch.offset = t % 0.35 < 0.07 && t < 2 ? 18 : 0;
    glitch.seed = Math.random();
    zoom.strength = 0.25 * on;
    zoom.center = { x: cx, y: cy };
    if (t < 2 && Math.random() < 0.9) {
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0, 0.5);
      s.height = 2;
      s.width = 40 + Math.random() * 80;
      s.tint = Math.random() < 0.3 ? 0xffffff : CYAN;
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
    if (t > next && t < 2.1) {
      next = t + 0.05 + Math.random() * 0.06;
      bolts.clear();
      const edge = () => {
        const side = Math.floor(Math.random() * 4);
        const u = Math.random();
        return side === 0 ? [rect.left + u * rect.width, rect.top] : side === 1 ? [rect.right, rect.top + u * rect.height] : side === 2 ? [rect.left + u * rect.width, rect.bottom] : [rect.left, rect.top + u * rect.height];
      };
      for (let b = 0; b < 3; b++) {
        const [x0, y0] = edge();
        const a = Math.atan2(y0 - cy, x0 - cx) + (Math.random() - 0.5) * 0.8;
        const len = 40 + Math.random() * 90;
        lightning(bolts, x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, 26, CYAN, 1.6);
        sparks.add(sparkTexture(), x0, y0, { life: 0.3, tint: CYAN, scale: 0.6, grow: -1.5 });
      }
    }
    if (t >= 2.1) bolts.clear();
    sparks.step(dt);
    card.scale.set((rect.width / card.texture.width) * (1 + 0.04 * Math.sin(t * 40) * on + 0.06 * ease.back(span(t, 0, 0.3)) * (1 - span(t, 2.2, 2.6))));
    root.alpha = 1 - span(t, 2.4, 2.8);
    return t < 2.9 || lines.length > 0;
  });
  done();
}

export async function dzmzInstall(rect: DOMRect, code: string) {
  const { app, root, card, fx, done, cx } = await scene(rect, code);
  const dissolve = dissolveFilter([0.13, 0.83, 0.93]);
  card.filters = [dissolve];
  const beam = new Sprite(glowTexture());
  beam.anchor.set(0.5);
  beam.tint = CYAN;
  beam.blendMode = "add";
  beam.width = rect.width * 1.5;
  beam.height = 26;
  fx.addChild(beam);
  const sparks = new Emitter(fx);
  const sheen = new Graphics();
  sheen.blendMode = "add";
  const mask = new Graphics().roundRect(rect.left, rect.top, rect.width, rect.height, 10).fill(0xffffff);
  sheen.mask = mask;
  root.addChild(mask, sheen);
  const frame = new Graphics().roundRect(rect.left - 4, rect.top - 4, rect.width + 8, rect.height + 8, 12).stroke({ color: CYAN, width: 2 });
  fx.addChild(frame);
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0.1, 1.3));
    dissolve.resources.dissolve.uniforms.uProgress = k;
    const by = rect.bottom - rect.height * k;
    beam.position.set(cx, by);
    beam.alpha = k > 0 && k < 1 ? 1 : 0;
    if (k > 0 && k < 1) for (let n = 0; n < 3; n++) sparks.add(sparkTexture(), rect.left + Math.random() * rect.width, by, { vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 120, life: 0.6, tint: CYAN, scale: 0.25 + Math.random() * 0.25, drag: 1 });
    sparks.step(dt);
    frame.alpha = (Math.random() < 0.15 ? 0.4 : 1) * span(t, 0, 0.2) * (1 - span(t, 1.4, 1.8));
    const s = span(t, 1.35, 2.1);
    sheen.clear();
    if (s > 0 && s < 1) {
      const x = rect.left - rect.width + s * rect.width * 3;
      sheen.poly([x, rect.top, x + rect.width * 0.35, rect.top, x + rect.width * 0.35 - rect.height * 0.4, rect.bottom, x - rect.height * 0.4, rect.bottom]).fill({ color: 0xbff8ff, alpha: 0.35 });
    }
    root.alpha = 1 - span(t, 2.4, 2.8);
    return t < 2.9;
  });
  done();
}

export async function pingRez(rect: DOMRect, code: string) {
  const { app, root, card, fx, done, cx, cy } = await scene(rect, code);
  const wave = new ShockwaveFilter({ center: { x: cx, y: cy }, amplitude: 22, wavelength: 90, speed: 520, brightness: 1.15, radius: -1, time: 0 });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  root.filters = [wave, split];
  const rings = new Graphics();
  fx.addChild(rings);
  const dots = new Emitter(fx);
  const core = new Sprite(glowTexture());
  core.anchor.set(0.5);
  core.tint = RED;
  core.blendMode = "add";
  fx.addChild(core);
  await run(app, (t, dt) => {
    wave.time = Math.max(0, t - 0.15);
    wave.center = { x: cx, y: cy };
    const g = t < 0.25 ? (1 - t / 0.25) * 8 : 0;
    split.red = { x: -g, y: 0 };
    split.blue = { x: g, y: g * 0.5 };
    rings.clear();
    for (let n = 0; n < 3; n++) {
      const r = span(t, 0.15 + n * 0.3, 1.25 + n * 0.3);
      if (r > 0 && r < 1) rings.circle(cx, cy, 20 + r * rect.width * 1.4).stroke({ width: 4 * (1 - r) + 1, color: RED, alpha: (1 - r) * 0.9 });
    }
    if (t < 1.4 && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      const d = rect.width * (0.6 + Math.random() * 0.6);
      dots.add(sparkTexture(), cx + Math.cos(a) * d, cy + Math.sin(a) * d, { life: 0.5, tint: RED, scale: 0.35, grow: -0.6 });
    }
    dots.step(dt);
    core.position.set(cx, cy);
    core.scale.set(1 + 3 * span(t, 0, 0.3));
    core.alpha = (1 - span(t, 0.1, 0.6)) * 0.9;
    card.tint = t < 0.3 ? 0xffd0c8 : 0xffffff;
    root.alpha = 1 - span(t, 2.2, 2.6);
    return t < 2.7;
  });
  done();
}
