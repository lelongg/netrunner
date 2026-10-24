import { type Container, Filter, GlProgram, Graphics, Sprite, defaultFilterVert } from "pixi.js";
import { ease, layer, run, span } from "./stage";
import { type Board, type Ready, scene } from "./kit";
import { type Pt, lerp } from "./more";
import { bezier } from "./sixth";

type At = (u: number, v: number) => Pt;

export const KEY = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec3 uWeights;
uniform float uThreshold;
uniform float uGain;
uniform vec3 uTint;
void main() {
  vec4 c = texture(uTexture, vTextureCoord);
  vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
  float k = clamp((dot(rgb, uWeights) - uThreshold) * uGain, 0.0, 1.0);
  finalColor = vec4(uTint * k * c.a, 0.0);
}`;

export function keyed(root: Container, card: Sprite, weights: [number, number, number], threshold: number, gain: number, tint: number) {
  const s = new Sprite(card.texture);
  s.anchor.copyFrom(card.anchor);
  s.rotation = card.rotation;
  s.scale.copyFrom(card.scale);
  s.position.copyFrom(card.position);
  const glProgram = GlProgram.from({ vertex: defaultFilterVert, fragment: KEY, name: "fx-key" });
  const rgb = [((tint >> 16) & 255) / 255, ((tint >> 8) & 255) / 255, (tint & 255) / 255];
  s.filters = [
    new Filter({
      glProgram,
      resources: {
        key: {
          uWeights: { value: new Float32Array(weights), type: "vec3<f32>" },
          uThreshold: { value: threshold, type: "f32" },
          uGain: { value: gain, type: "f32" },
          uTint: { value: new Float32Array(rgb), type: "vec3<f32>" },
        },
      },
    }),
  ];
  s.alpha = 0;
  root.addChildAt(s, root.getChildIndex(card) + 1);
  return s;
}

export function band(g: Graphics, at: At, k: number, width: number, slant: number, box: [number, number, number, number]) {
  const [u0, v0, u1, v1] = box;
  const c = u0 - width - slant + (u1 - u0 + 2 * (width + slant)) * k;
  const clamp = (u: number) => Math.min(u1, Math.max(u0, u));
  return g.poly([...at(clamp(c - width - slant), v0), ...at(clamp(c + width - slant), v0), ...at(clamp(c + width + slant), v1), ...at(clamp(c - width + slant), v1)]).fill(0xffffff);
}

export function ribbon(g: Graphics, pts: Pt[], width: number, color: number, alpha: number) {
  if (pts.length < 3) return;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = width * Math.sin((Math.PI * i) / (pts.length - 1)) ** 0.7;
    left.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]);
    right.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w]);
  }
  g.poly([...left, ...right.reverse()].flat()).fill({ color, alpha });
}

export function star(g: Graphics, c: Pt, r: number, color: number, alpha: number, spin: number) {
  const pts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = spin + (i * Math.PI) / 4;
    const d = i % 2 ? r * 0.18 : r;
    pts.push(c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d);
  }
  g.poly(pts).fill({ color, alpha });
}

export async function karuna(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const hands = keyed(root, card, [0.5, 0.45, -0.3], 0.42, 2.4, 0xff9a50);
  const g = new Graphics();
  layer(root, false).addChild(g);
  const face = at(0.585, 0.715);
  const petals = 8;
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.25, 1.65);
    const breath = Math.sin(Math.PI * span(t, 0.05, 1.6));
    hands.alpha = 0.4 * breath;
    const open = ease.out(span(t, 0.15, 0.95));
    for (const [ring, R, off, col] of [
      [0, unit * 0.2, 0, 0xffc27a],
      [1, unit * 0.3, Math.PI / petals, 0xff9a4a],
    ] as const) {
      const k = ease.out(span(t, 0.15 + ring * 0.15, 0.95 + ring * 0.15));
      if (k <= 0) continue;
      const spread = 0.12 + 0.2 * k;
      for (let i = 0; i < petals; i++) {
        const a = off + (i / petals) * Math.PI * 2 + t * 0.25 * (ring ? -1 : 1);
        const r0 = R * 0.35;
        const r1 = R * (0.4 + 0.6 * k);
        const base: Pt = [face[0] + Math.cos(a) * r0, face[1] + Math.sin(a) * r0];
        const tip: Pt = [face[0] + Math.cos(a) * r1, face[1] + Math.sin(a) * r1];
        const mid = (r0 + r1) / 2;
        const c1: Pt = [face[0] + Math.cos(a - spread) * mid, face[1] + Math.sin(a - spread) * mid];
        const c2: Pt = [face[0] + Math.cos(a + spread) * mid, face[1] + Math.sin(a + spread) * mid];
        g.moveTo(...base)
          .quadraticCurveTo(...c1, ...tip)
          .quadraticCurveTo(...c2, ...base);
        g.stroke({ width: 1.3, color: col, alpha: 0.75 * fade * Math.min(1, k * 2) });
      }
    }
    if (open > 0) {
      g.circle(face[0], face[1], unit * 0.07 * open).stroke({ width: 1, color: 0xffd8a0, alpha: 0.6 * fade });
      g.circle(face[0], face[1], unit * (0.3 + 0.03 * open)).stroke({ width: 0.8, color: 0xff9a4a, alpha: 0.35 * fade * open });
    }
    return t < 1.65;
  });
  hands.destroy();
  await done();
}

export async function phatGioan(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const silk = keyed(root, card, [0.6, 0.4, -1], 0.35, 2.4, 0xffe0a0);
  const mask = new Graphics();
  root.addChild(mask);
  silk.mask = mask;
  const warm = keyed(root, card, [0.6, 0.4, -1], 0.35, 1.6, 0xff9a40);
  const frame = new Graphics();
  root.addChild(frame);
  frame.poly([...at(0.03, 0.07), ...at(0.97, 0.07), ...at(0.97, 0.52), ...at(0.03, 0.52)]).fill(0xffffff);
  warm.mask = frame;
  const g = new Graphics();
  layer(root, false).addChild(g);
  const glass = at(0.215, 0.105);
  await run(app, (t) => {
    const k = ease.inOut(span(t, 0.15, 1.15));
    mask.clear();
    band(mask, at, k, 0.05, 0.12, [0.03, 0.07, 0.97, 0.52]);
    silk.alpha = 0.9 * Math.sin(Math.PI * span(t, 0.1, 1.25));
    warm.alpha = 0.25 * Math.sin(Math.PI * span(t, 0, 1.5));
    g.clear();
    const c = span(t, 0.05, 0.45);
    if (c > 0 && c < 1) {
      star(g, glass, unit * 0.06 * Math.sin(Math.PI * c), 0xfff2d0, 0.9, c * 1.5);
      g.circle(glass[0], glass[1], unit * (0.02 + 0.08 * ease.out(c))).stroke({ width: 1, color: 0xffe2a0, alpha: 0.7 * (1 - c) });
    }
    return t < 1.5;
  });
  silk.mask = null;
  mask.destroy();
  silk.destroy();
  warm.mask = null;
  frame.destroy();
  warm.destroy();
  await done();
}

export async function gourmand(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at, zoom } = await scene(rect, code, ready, board);
  const bolts = keyed(root, card, [-0.6, 1, 0.1], 0.2, 2.6, 0xb8ffb0);
  const g = new Graphics();
  layer(root, false).addChild(g);
  const heel = at(0.717, 0.229);
  const point = at(0.833, 0.282);
  const flicker = [0.08, 0.16, 0.22, 0.5, 0.56, 0.9, 0.98];
  await run(app, (t) => {
    const chomp = ease.back(span(t, 0.35, 0.55)) * (1 - span(t, 0.6, 1));
    zoom(1 - 0.035 * chomp);
    const near = Math.max(0, ...flicker.map((f) => 1 - Math.abs(t - f) / 0.045));
    bolts.alpha = (0.2 + 0.5 * near) * (1 - span(t, 1.05, 1.35));
    g.clear();
    const s = span(t, 0.55, 0.95);
    if (s > 0 && s < 1) {
      const head = ease.inOut(s);
      const a = lerp(heel, point, Math.max(0, head - 0.25));
      const b = lerp(heel, point, head);
      g.moveTo(...a)
        .lineTo(...b)
        .stroke({ width: 1.6, color: 0xeafff4, alpha: 0.9 * Math.sin(Math.PI * s), cap: "round" });
      if (s > 0.8) star(g, point, unit * 0.04 * Math.sin(Math.PI * span(s, 0.8, 1)), 0xeafff4, 0.9, s * 2);
    }
    return t < 1.35;
  });
  zoom(1);
  bolts.destroy();
  await done();
}

export async function gamedragonPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const aura = keyed(root, card, [-0.8, -0.1, 1], 0.12, 1.8, 0x7ac8ff);
  const shell: Pt[] = [at(0.4, 0.17), at(0.7, 0.1), at(0.84, 0.4), at(0.5, 0.46)];
  const gloss = keyed(root, card, [0.33, 0.33, 0.34], 0.35, 1.6, 0xd8f0ff);
  const mask = new Graphics();
  root.addChild(mask);
  gloss.mask = mask;
  const screen = keyed(root, card, [0.6, 0.6, -1], 0.4, 2.5, 0xffe080);
  const sm = new Graphics();
  root.addChild(sm);
  screen.mask = sm;
  const g = new Graphics();
  layer(root, false).addChild(g);
  await run(app, (t) => {
    const fade = 1 - span(t, 1.25, 1.6);
    aura.alpha = 0.45 * Math.sin(Math.PI * span(t, 0, 1.6)) * (0.85 + 0.15 * Math.sin(t * 9));
    const k = ease.inOut(span(t, 0.2, 1));
    mask.clear();
    const a = lerp(shell[0], shell[1], k);
    const b = lerp(shell[3], shell[2], k);
    const w = unit * 0.06;
    mask.poly([a[0] - w, a[1], a[0] + w, a[1], b[0] + w, b[1], b[0] - w, b[1]]).fill(0xffffff);
    gloss.alpha = 0.5 * Math.sin(Math.PI * span(t, 0.2, 1));
    const boot = span(t, 0.5, 0.85);
    sm.clear();
    if (boot > 0) {
      const top = 0.29 - 0.03 * ease.out(boot);
      const bot = 0.29 + 0.03 * ease.out(boot);
      sm.poly([...at(0.5, top), ...at(0.68, top), ...at(0.68, bot), ...at(0.5, bot)]).fill(0xffffff);
    }
    screen.alpha = boot > 0 ? (boot < 1 && Math.floor(t * 30) % 3 === 0 ? 0.3 : 0.7) * fade : 0;
    g.clear();
    g.poly(shell.flat()).stroke({ width: 1, color: 0x9ad8ff, alpha: 0.35 * Math.sin(Math.PI * span(t, 0.1, 0.9)) });
    return t < 1.6;
  });
  gloss.mask = null;
  screen.mask = null;
  mask.destroy();
  sm.destroy();
  aura.destroy();
  gloss.destroy();
  screen.destroy();
  await done();
}

const MANE_ROOTS: [number, number][] = [
  [0.5, 0.2],
  [0.55, 0.26],
  [0.56, 0.33],
  [0.52, 0.38],
];

export async function marjanah(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, card, world, done, unit, at } = sc;
  const mane = keyed(root, card, [1, -0.8, 0.1], 0.2, 2.2, 0xff8ab8);
  const g = new Graphics();
  layer(world, false).addChild(g);
  let hit = false;
  const strands = MANE_ROOTS.map(([u, v], i) => ({ u, v, bend: (i - 1.5) * 0.35, d: i * 0.05, w: unit * (0.035 - i * 0.004) }));
  await run(
    app,
    (t) => {
      g.clear();
      mane.alpha = 0.6 * Math.sin(Math.PI * span(t, 0, 0.6));
      const center = root.toGlobal({ x: at(0.55, 0.28)[0], y: at(0.55, 0.28)[1] });
      const to = sc.strike ?? ([center.x - unit * 0.6, center.y - unit * 0.8] as Pt);
      const R = unit * 0.32;
      for (const s of strands) {
        const local = at(s.u, s.v);
        const g0 = root.toGlobal({ x: local[0], y: local[1] });
        const src: Pt = [g0.x, g0.y];
        const ctrl: Pt = [(src[0] + to[0]) / 2 - (to[1] - src[1]) * s.bend, (src[1] + to[1]) / 2 + (to[0] - src[0]) * s.bend];
        const fly = ease.inOut(span(t, 0.1 + s.d, 0.45 + s.d));
        const wrap = ease.out(span(t, 0.4 + s.d, 0.75 + s.d));
        const fade = 1 - span(t, 0.85, 1.15);
        if (fly <= 0 || fade <= 0) continue;
        const pts: Pt[] = [];
        const tail = Math.max(0, fly - 0.45 + wrap * 0.4);
        for (let i = 0; i <= 18; i++) pts.push(bezier(src, ctrl, to, tail + ((fly - tail) * i) / 18));
        const a0 = Math.atan2(to[1] - ctrl[1], to[0] - ctrl[0]) + Math.PI / 2;
        for (let i = 1; i <= 14 * wrap; i++) {
          const q = i / 14;
          const r = R * (1 - 0.55 * wrap) * (1 - q * 0.3);
          const a = a0 + q * Math.PI * 1.6 * (s.bend >= 0 ? 1 : -1);
          pts.push([to[0] + Math.cos(a) * r * 0.9 - Math.cos(a0) * r * 0.9, to[1] + Math.sin(a) * r * 0.6 - Math.sin(a0) * r * 0.6]);
        }
        ribbon(g, pts, s.w, 0xff6fa0, 0.55 * fade);
        ribbon(g, pts, s.w * 0.35, 0xffd6e6, 0.75 * fade);
      }
      const c = span(t, 0.7, 1.05);
      if (c > 0 && c < 1) {
        for (let n = -1; n <= 1; n++) {
          const L = unit * 0.38;
          const ang = -0.9;
          const off: Pt = [Math.cos(ang + Math.PI / 2) * n * unit * 0.08, Math.sin(ang + Math.PI / 2) * n * unit * 0.08];
          const p0: Pt = [to[0] + off[0] - Math.cos(ang) * L * 0.5, to[1] + off[1] - Math.sin(ang) * L * 0.5];
          const p1: Pt = [to[0] + off[0] + Math.cos(ang) * L * 0.5, to[1] + off[1] + Math.sin(ang) * L * 0.5];
          const pts: Pt[] = [];
          const e = ease.out(span(c, 0, 0.5));
          for (let i = 0; i <= 10; i++) {
            const q = (i / 10) * e;
            const p = lerp(p0, p1, q);
            pts.push([p[0] + Math.sin(q * Math.PI) * unit * 0.03, p[1] - Math.sin(q * Math.PI) * unit * 0.03]);
          }
          ribbon(g, pts, unit * 0.012, 0xffe0ec, 0.9 * (1 - span(c, 0.5, 1)));
        }
      }
      if (!hit && t > 0.7) {
        hit = true;
        navigator.vibrate?.(20);
      }
      return t < 1.15;
    },
    sc.strike ? 1.1 : 1,
  );
  mane.destroy();
  await done();
}
