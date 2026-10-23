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

export async function betaBuild(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const glitch = new GlitchFilter({ slices: 14, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [glitch, split];
  const lines = painted(root, card, [0.34, 0.33, 0.33], 0.72, 4, 0x6cf09a);
  const green = keyed(root, card, [-0.7, 1.2, -0.5], 0.12, 3, 0x9affc0);
  green.blendMode = "add";
  const ring = new Graphics();
  root.addChild(ring);
  lines.mask = ring;
  const holder = new Container();
  root.addChildAt(holder, root.getChildIndex(lines));
  holder.addChild(lines);
  const art = new Graphics().poly([at(0.0, 0.08), at(1.0, 0.08), at(1.0, 0.5), at(0.0, 0.5)].flat()).fill(0xffffff);
  root.addChild(art);
  holder.mask = art;
  const gun = at(0.42, 0.35);
  await run(app, (t) => {
    const unstable = 1 - span(t, 0.05, 0.42);
    glitch.offset = unit * 0.07 * unstable * unstable;
    glitch.seed = Math.random();
    glitch.slices = 8 + Math.floor(Math.random() * 10);
    if (unstable <= 0) card.filters = [split];
    const lock = span(t, 0.42, 0.7);
    const k = (unstable > 0 ? unit * 0.012 * unstable : 0) + unit * 0.01 * (1 - lock) * (lock > 0 ? 1 : 0);
    split.red = sideways ? { x: 0, y: k } : { x: k, y: 0 };
    split.blue = sideways ? { x: 0, y: -k } : { x: -k, y: 0 };
    root.scale.set(root.scale.x * (1 + thump(t, 0.42, 0.05)), root.scale.y * (1 + thump(t, 0.42, 0.05)));
    const w = ease.out(span(t, 0.45, 1.25));
    ring.clear();
    if (w > 0 && w < 1) {
      const r = unit * 1.05 * w;
      ring.circle(...gun, r + unit * 0.06).fill(0xffffff);
      ring.circle(...gun, Math.max(0, r - unit * 0.14)).cut();
    }
    lines.alpha = w > 0 && w < 1 ? 0.85 * (1 - w * 0.5) : 0;
    const flare = Math.sin(Math.PI * span(t, 0.95, 1.5));
    green.alpha = 0.55 * flare;
    return t < 1.5;
  });
  card.filters = [];
  await done();
}

const PAINT = `
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

export async function hedgeFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const lights = keyed(root, card, [0.34, 0.33, 0.33], 0.7, 3, 0xffb44a);
  lights.blendMode = "add";
  const core = at(0.522, 0.27);
  const iris = new Graphics();
  root.addChild(iris);
  const hole = new Graphics();
  root.addChild(hole);
  lights.mask = hole;
  const top = layer(root, false);
  const coin = new Sprite(glyphTexture());
  coin.anchor.set(0.5);
  coin.tint = 0xffd27a;
  coin.alpha = 0;
  top.addChild(coin);
  const ring = new Graphics();
  top.addChild(ring);
  const corners = [at(-1, -1), at(2, -1), at(2, 2), at(-1, 2)].flat();
  const box = new Graphics();
  box.poly([at(0.0, 0.07), at(1.0, 0.07), at(1.0, 0.56), at(0.0, 0.56)].flat()).fill(0xffffff);
  root.addChild(box);
  iris.mask = box;
  await run(app, (t) => {
    const close = ease.inOut(span(t, 0.05, 0.55));
    const reopen = ease.inOut(span(t, 0.95, 1.45));
    const r = unit * (1.5 - 1.36 * close + 1.36 * reopen);
    const dark = 0.78 * Math.min(1, close * 1.4) * (1 - reopen);
    iris.clear();
    if (dark > 0.01) {
      iris.poly(corners).fill({ color: 0x04060c, alpha: dark });
      iris.circle(...core, r).cut();
    }
    hole.clear();
    hole.circle(...core, r).fill(0xffffff);
    lights.alpha = 0.3 * Math.min(1, close * 1.2) * (1 - reopen);
    const pop = ease.back(span(t, 0.5, 0.72));
    const gone = span(t, 0.95, 1.3);
    coin.position.set(core[0], core[1] - unit * 0.1 * gone);
    coin.alpha = Math.min(1, pop * 1.5) * (1 - gone);
    coin.scale.set((unit / 48) * 0.16 * (0.6 + 0.4 * pop));
    ring.clear();
    const rk = span(t, 0.52, 0.95);
    if (rk > 0 && rk < 1) ring.circle(...core, unit * (0.07 + 0.12 * ease.out(rk))).stroke({ width: 1.4, color: 0xffd27a, alpha: 0.8 * (1 - rk) });
    const s = 1 + thump(t, 0.52, 0.04);
    root.scale.set(root.scale.x * s, root.scale.y * s);
    return t < 1.5;
  });
  await done();
}

export async function risingTide(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, card, world, done, unit, at } = sc;
  const roil = shimmer(root, card, rect, unit * 0.05);
  const water = keyed(root, card, [-0.2, 0.35, 0.75], 0.5, 3, 0x9ae6ff);
  water.blendMode = "add";
  const swells = [0.08, 0.36, 0.64];
  const crest = sc.strike ? new Sprite(crop(card, 0.0, 0.3, 0.62, 0.56)) : null;
  if (crest) {
    crest.anchor.set(0.5);
    crest.alpha = 0;
    world.addChild(crest);
    const w = crest.texture.width / 2;
    const h = crest.texture.height / 2;
    const shape: number[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI;
      shape.push(Math.cos(a) * w, Math.sin(a) * h * 0.9 + h * 0.5);
    }
    for (let i = 24; i >= 0; i--) {
      const a = Math.PI + (i / 24) * Math.PI;
      shape.push(Math.cos(a) * w * 0.82, Math.sin(a) * h * 0.35 + h * 0.5);
    }
    const m = new Graphics().poly(shape).fill(0xffffff);
    crest.addChild(m);
    crest.mask = m;
  }
  const foam = new Graphics();
  world.addChild(foam);
  let landed = false;
  await run(
    app,
    (t) => {
      let k = 0;
      let level = 0;
      swells.forEach((s, i) => {
        const p = span(t, s, s + 0.32);
        k = Math.max(k, Math.sin(Math.PI * p) * (0.45 + 0.27 * i));
        level += ease.out(span(t, s, s + 0.2));
      });
      const release = ease.inOut(span(t, 0.95, 1.3));
      roil(t, k + 0.3 * level * (1 - release));
      water.alpha = 0.32 * k;
      const z = 1 + 0.02 * level * (1 - release);
      root.scale.set(root.scale.x * z, root.scale.y * z);
      foam.clear();
      if (crest && sc.strike) {
        const src = root.toGlobal({ x: at(0.31, 0.43)[0], y: at(0.31, 0.43)[1] });
        const f = span(t, 0.92, 1.28);
        const p = bezier([src.x, src.y], [(src.x + sc.strike[0]) / 2, Math.min(src.y, sc.strike[1]) - unit * 0.6], sc.strike, ease.inOut(f));
        const base = card.scale.x * root.scale.x;
        crest.position.set(...p);
        crest.rotation = card.rotation - 0.5 + 0.5 * f;
        const squash = span(t, 1.24, 1.42);
        crest.scale.set(base * (0.75 + 0.35 * f) * (1 + 0.5 * squash), base * (0.75 + 0.35 * f) * (1 - 0.6 * squash));
        crest.alpha = f > 0 ? 0.95 * (1 - span(t, 1.3, 1.5)) : 0;
        if (!landed && t > 1.27) {
          landed = true;
          navigator.vibrate?.(30);
          jolt(board, 0.3);
        }
        for (let i = 0; i < 2; i++) {
          const r = span(t, 1.26 + i * 0.08, 1.6 + i * 0.08);
          if (r > 0 && r < 1) foam.ellipse(sc.strike[0], sc.strike[1], unit * (0.2 + 0.5 * ease.out(r)), unit * (0.08 + 0.18 * ease.out(r))).stroke({ width: 2 * (1 - r) + 0.6, color: 0xd8f6ff, alpha: 0.8 * (1 - r) });
        }
      }
      return t < (sc.strike ? 1.65 : 1.35);
    },
    1,
  );
  crest?.destroy();
  foam.destroy();
  await done();
}
