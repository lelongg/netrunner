import { Container, Filter, GlProgram, Graphics, Rectangle, Sprite, Texture, defaultFilterVert } from "pixi.js";
import { GlitchFilter, RGBSplitFilter } from "pixi-filters";
import { ease, layer, run, span } from "./stage";
import { type Board, type Ready, scene, shimmer } from "./kit";
import { type Pt, glyphTexture, lerp } from "./more";
import { keyed } from "./revJ";
import { bezier, jolt } from "./sixth";

const twin = (card: Sprite, tex: Texture = card.texture) => {
  const s = new Sprite(tex);
  s.anchor.copyFrom(card.anchor);
  s.rotation = card.rotation;
  s.scale.copyFrom(card.scale);
  s.position.copyFrom(card.position);
  return s;
};

const crop = (card: Sprite, u0: number, v0: number, u1: number, v1: number) => {
  const t = card.texture;
  return new Texture({ source: t.source, frame: new Rectangle(t.frame.x + u0 * t.frame.width, t.frame.y + v0 * t.frame.height, (u1 - u0) * t.frame.width, (v1 - v0) * t.frame.height) });
};

const thump = (t: number, at: number, size: number, width = 0.22) => {
  const k = span(t, at, at + width);
  return k > 0 && k < 1 ? size * Math.sin(Math.PI * k) * (1 - k) * 2.2 : 0;
};

export const PAINT = `
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
  float k = clamp((dot(rgb, uWeights) - uThreshold) * uGain, 0.0, 1.0) * c.a;
  finalColor = vec4(uTint * k, k);
}`;

function painted(root: Container, card: Sprite, weights: [number, number, number], threshold: number, gain: number, tint: number) {
  const s = twin(card);
  const glProgram = GlProgram.from({ vertex: defaultFilterVert, fragment: PAINT, name: "fx-paint" });
  const rgb = [((tint >> 16) & 255) / 255, ((tint >> 8) & 255) / 255, (tint & 255) / 255];
  s.filters = [
    new Filter({
      glProgram,
      resources: {
        paint: {
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

export async function charmOffensive(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, at } = await scene(rect, code, ready, board);
  const area = (pts: [number, number][]) => {
    const g = new Graphics();
    g.poly(pts.flatMap(([u, v]) => at(u, v))).fill(0xffffff);
    root.addChild(g);
    return g;
  };
  const him: [number, number][] = [
    [0.27, 0.27],
    [0.66, 0.27],
    [0.69, 0.56],
    [0.24, 0.56],
  ];
  const her: [number, number][] = [
    [0.66, 0.2],
    [0.92, 0.18],
    [0.93, 0.56],
    [0.66, 0.56],
  ];
  const lit = keyed(root, card, [-0.9, 0.35, 0.95], 0.22, 3.2, 0x7adcff);
  lit.mask = area(him);
  const off = painted(root, card, [-0.9, 0.35, 0.95], 0.22, 3.2, 0x1a2630);
  off.mask = area(him);
  const warm = keyed(root, card, [1.1, -0.75, -0.25], 0.28, 2.6, 0xff7a6a);
  warm.mask = area(her);
  const flick = [0.62, 0.69, 0.74, 0.8];
  await run(app, (t) => {
    const guard = Math.max(Math.sin(Math.PI * span(t, 0.0, 0.22)), Math.sin(Math.PI * span(t, 0.2, 0.42)));
    const dying = span(t, 0.62, 0.86);
    const blink = dying > 0 && dying < 1 ? (flick.some((f) => Math.abs(t - f) < 0.025) ? 1 : 0) : 0;
    lit.alpha = t < 0.45 ? 0.9 * guard : 0.9 * blink;
    off.alpha = 0.85 * ease.out(dying) * (1 - ease.inOut(span(t, 1.25, 1.6)));
    warm.alpha = 0.7 * Math.sin(Math.PI * span(t, 0.38, 1.6)) * (0.8 + 0.2 * Math.sin(t * 9));
    const s = 1 + thump(t, 0.45, 0.03) + thump(t, 0.95, 0.02, 0.3);
    root.scale.set(root.scale.x * s, root.scale.y * s);
    return t < 1.6;
  });
  await done();
}

const CUT: [Pt, Pt] = [
  [0.0, 0.705],
  [1.0, 0.292],
];

function chop(root: Container, card: Sprite, at: (u: number, v: number) => Pt, unit: number) {
  const [a, b] = CUT;
  const halves = [
    [[-0.1, -0.1], [1.1, -0.1], b, a],
    [a, b, [1.1, 1.1], [-0.1, 1.1]],
  ].map((poly) => {
    const box = new Container();
    const s = twin(card);
    const m = new Graphics();
    m.poly((poly as Pt[]).flatMap(([u, v]) => at(u, v))).fill(0xffffff);
    box.addChild(s, m);
    s.mask = m;
    box.visible = false;
    root.addChildAt(box, root.getChildIndex(card) + 1);
    return box;
  });
  const p0 = at(...a);
  const p1 = at(...b);
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const d: Pt = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
  const n: Pt = [d[1], -d[0]];
  const seam = new Graphics();
  layer(root).addChild(seam);
  return (open: number) => {
    const on = open > 0.001;
    card.visible = !on;
    seam.clear();
    halves.forEach((h, i) => {
      h.visible = on;
      const side = i ? -1 : 1;
      h.position.set((n[0] * side * 0.05 + d[0] * side * 0.025) * unit * open, (n[1] * side * 0.05 + d[1] * side * 0.025) * unit * open);
    });
    if (on) {
      seam
        .moveTo(...p0)
        .lineTo(...p1)
        .stroke({ width: unit * 0.006 * open + 0.5, color: 0xff5a64, alpha: 0.9 * open });
    }
  };
}

export async function cleaverPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const open = chop(root, card, at, unit);
  const edge = new Graphics();
  layer(root, false).addChild(edge);
  const e0 = at(0.6, 0.458);
  const e1 = at(0.93, 0.322);
  const blade = keyed(root, card, [0.6, 0.2, 0.2], 0.62, 3, 0xff8a9a);
  blade.blendMode = "add";
  await run(app, (t) => {
    const lift = ease.inOut(span(t, 0, 0.32));
    const fall = ease.back(span(t, 0.32, 0.44));
    const settle = ease.inOut(span(t, 0.7, 1.1));
    root.rotation = (sideways ? -1 : 1) * (-0.07 * lift + 0.11 * fall) * (1 - settle);
    const hit = span(t, 0.42, 0.48);
    const o = Math.min(ease.out(hit), 1 - ease.inOut(span(t, 0.62, 1.0)));
    open(o);
    const kick = Math.max(0, 1 - Math.abs(t - 0.45) / 0.18);
    split.red = sideways ? { x: 0, y: unit * 0.014 * kick } : { x: unit * 0.014 * kick, y: 0 };
    split.blue = sideways ? { x: 0, y: -unit * 0.014 * kick } : { x: -unit * 0.014 * kick, y: 0 };
    blade.alpha = 0.5 * Math.sin(Math.PI * span(t, 0.05, 0.5));
    edge.clear();
    const g = span(t, 0.05, 0.4);
    if (g > 0 && g < 1) {
      const head = lerp(e0, e1, ease.inOut(g));
      const tail = lerp(e0, e1, Math.max(0, ease.inOut(g) - 0.3));
      edge
        .moveTo(...tail)
        .lineTo(...head)
        .stroke({ width: unit * 0.008, color: 0xffe0e4, alpha: 0.9, cap: "round" });
    }
    if (t > 0.44 && t < 0.47) navigator.vibrate?.(35);
    return t < 1.15;
  });
  open(0);
  root.rotation = 0;
  card.filters = [];
  await done();
}

export async function cleaver(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, card, world, done, unit, at, sideways } = sc;
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const open = chop(root, card, at, unit);
  const gash = new Graphics();
  world.addChild(gash);
  const glow = new Graphics();
  glow.blendMode = "add";
  world.addChild(glow);
  let hit = false;
  await run(
    app,
    (t) => {
      const lift = ease.inOut(span(t, 0, 0.26));
      const fall = ease.back(span(t, 0.26, 0.36));
      const settle = ease.inOut(span(t, 0.6, 0.95));
      root.rotation = (sideways ? -1 : 1) * (-0.1 * lift + 0.16 * fall) * (1 - settle);
      const o = Math.min(ease.out(span(t, 0.34, 0.4)), 1 - ease.inOut(span(t, 0.5, 0.85)));
      open(o);
      const kick = Math.max(0, 1 - Math.abs(t - 0.37) / 0.16);
      split.red = sideways ? { x: 0, y: unit * 0.016 * kick } : { x: unit * 0.016 * kick, y: 0 };
      split.blue = sideways ? { x: 0, y: -unit * 0.016 * kick } : { x: -unit * 0.016 * kick, y: 0 };
      gash.clear();
      glow.clear();
      const s = sc.strike;
      const k = span(t, 0.36, 0.42);
      const fade = 1 - span(t, 0.75, 1.15);
      if (s && k > 0) {
        const L = unit * 0.55 * ease.out(k);
        const a = -0.42;
        const dx = Math.cos(a) * L;
        const dy = Math.sin(a) * L;
        const nx = -Math.sin(a);
        const ny = Math.cos(a);
        const w = unit * 0.035 * (1 - 0.6 * span(t, 0.45, 1.1));
        gash.poly([s[0] - dx, s[1] - dy, s[0] + nx * w, s[1] + ny * w, s[0] + dx, s[1] + dy, s[0] - nx * w, s[1] - ny * w]).fill({ color: 0x1a0306, alpha: 0.85 * fade });
        glow
          .moveTo(s[0] - dx, s[1] - dy)
          .lineTo(s[0] + nx * w, s[1] + ny * w)
          .lineTo(s[0] + dx, s[1] + dy)
          .stroke({ width: 1.6, color: 0xff4a5a, alpha: 0.95 * fade });
        glow
          .moveTo(s[0] - dx, s[1] - dy)
          .lineTo(s[0] - nx * w, s[1] - ny * w)
          .lineTo(s[0] + dx, s[1] + dy)
          .stroke({ width: 1.2, color: 0xff8a94, alpha: 0.8 * fade });
      }
      if (!hit && t > 0.37) {
        hit = true;
        navigator.vibrate?.(40);
        if (s) jolt(board, 0.25);
      }
      return t < 1.15;
    },
    sc.strike ? 1.1 : 1,
  );
  open(0);
  root.rotation = 0;
  card.filters = [];
  gash.destroy();
  glow.destroy();
  await done();
}

