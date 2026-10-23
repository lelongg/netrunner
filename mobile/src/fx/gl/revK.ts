import { ColorMatrixFilter, Container, Graphics, Sprite } from "pixi.js";
import { GlitchFilter, RGBSplitFilter } from "pixi-filters";
import { ease, focusFilter, layer, run, span } from "./stage";
import { type Board, type Ready, scene, shimmer } from "./kit";
import { type Pt, lerp, rnd } from "./more";
import { bezier, jolt, runnerAt } from "./sixth";
import { keyed, star } from "./revJ";

type Quad = [Pt, Pt, Pt, Pt];

const bi = (q: Quad, s: number, r: number): Pt => lerp(lerp(q[0], q[1], s), lerp(q[3], q[2], s), r);

export function copy(card: Sprite) {
  const s = new Sprite(card.texture);
  s.anchor.copyFrom(card.anchor);
  s.rotation = card.rotation;
  s.scale.copyFrom(card.scale);
  s.position.copyFrom(card.position);
  return s;
}

export function piece(root: Container, card: Sprite, poly: Pt[]) {
  const box = new Container();
  const s = copy(card);
  const m = new Graphics().poly(poly.flat()).fill(0xffffff);
  box.addChild(s, m);
  s.mask = m;
  root.addChildAt(box, root.getChildIndex(card) + 1);
  return box;
}

export function pivot(box: Container, p: Pt) {
  box.pivot.set(...p);
  box.position.set(...p);
}

export function clip(root: Container, sprite: Container, poly: Pt[]) {
  const m = new Graphics().poly(poly.flat()).fill(0xffffff);
  root.addChild(m);
  sprite.mask = m;
  return m;
}

export async function vultureFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const tablet: Quad = [at(0.144, 0.404), at(0.356, 0.424), at(0.333, 0.499), at(0.167, 0.479)];
  const glow = keyed(root, card, [1, -0.7, -0.6], 0.15, 3, 0xff6a4a);
  clip(root, glow, tablet);
  const g = new Graphics();
  layer(root, false).addChild(g);
  const curve = [0.15, 0.22, 0.18, 0.4, 0.34, 0.55, 0.5, 0.72, 0.66, 0.85];
  await run(app, (t) => {
    const beat = (b: number) => Math.max(0, 1 - Math.abs(t - b) / 0.12);
    glow.alpha = 0.3 * span(t, 0.1, 0.35) * (1 - span(t, 1.2, 1.5)) + 0.6 * Math.max(beat(0.4), beat(0.65), beat(0.9));
    g.clear();
    const draw = span(t, 0.25, 0.95);
    const fade = 1 - span(t, 1.2, 1.5);
    if (draw > 0) {
      const n = Math.max(1, Math.floor(draw * (curve.length - 1)));
      const pts = curve.slice(0, n + 1).map((r, i) => bi(tablet, 0.1 + (0.8 * i) / (curve.length - 1), 0.12 + 0.7 * r));
      g.moveTo(...bi(tablet, 0.08, 0.88))
        .lineTo(...bi(tablet, 0.92, 0.88))
        .stroke({ width: 1, color: 0xff9a80, alpha: 0.5 * fade });
      g.moveTo(...pts[0]);
      for (const p of pts.slice(1)) g.lineTo(...p);
      g.stroke({ width: 1.6, color: 0xffd0c0, alpha: 0.95 * fade, join: "round" });
      g.circle(...pts[pts.length - 1], unit * 0.008).fill({ color: 0xffe0d0, alpha: fade });
    }
    return t < 1.5;
  });
  glow.destroy();
  await done();
}

export async function amazeAmusements(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const tower = TOWER.map(([u, v]) => at(u, v));
  const circuit = keyed(root, card, [-0.7, 0.3, 0.9], 0.25, 3.4, 0x9af4ff);
  const cm = new Graphics();
  root.addChild(cm);
  circuit.mask = cm;
  const gold = keyed(root, card, [0.55, 0.5, -0.7], 0.3, 1.6, 0xffc860);
  clip(root, gold, tower);
  const g = new Graphics();
  layer(root, false).addChild(g);
  const apex = at(0.432, 0.1);
  await run(app, (t) => {
    const env = span(t, 0, 0.25) * (1 - span(t, 1.35, 1.75));
    cm.clear();
    for (let b = 0; b < 3; b++) {
      const ang = t * 4.2 + (b * Math.PI * 2) / 3;
      const c = Math.cos(ang);
      if (c <= 0.05) continue;
      const x = Math.sin(ang);
      const w = 0.07 * c;
      const bu = 0.465 + 0.3 * x;
      const tu = 0.435 + 0.03 * x;
      cm.poly([...at(tu - w * 0.2, 0.09), ...at(tu + w * 0.2, 0.09), ...at(bu + w, 0.49), ...at(bu - w, 0.49)]).fill(0xffffff);
    }
    circuit.alpha = 0.95 * env;
    gold.alpha = 0.22 * env * (0.8 + 0.2 * Math.sin(t * 6));
    g.clear();
    const pop = ease.back(span(t, 0.95, 1.2)) * (1 - span(t, 1.35, 1.75));
    if (pop > 0) {
      star(g, apex, unit * 0.075 * pop, 0xffe6a0, 0.85, t * 0.6);
      star(g, apex, unit * 0.04 * pop, 0xffffff, 0.6, -t * 0.6 + 0.4);
    }
    return t < 1.75;
  });
  circuit.destroy();
  gold.destroy();
  await done();
}

const PANE: Quad = [
  [0.504, 0.276],
  [0.825, 0.122],
  [0.9375, 0.315],
  [0.6125, 0.461],
];

function cracks(origin: [number, number], n: number) {
  const out: { pts: [number, number][]; d: number }[] = [];
  const grow = (p: [number, number], a: number, depth: number, d: number) => {
    const pts: [number, number][] = [p];
    let q = p;
    for (let i = 0; i < 5; i++) {
      a += rnd(-0.35, 0.35);
      q = [q[0] + Math.cos(a) * 0.07, q[1] + Math.sin(a) * 0.07];
      if (q[0] < 0.02 || q[0] > 0.98 || q[1] < 0.02 || q[1] > 0.98) break;
      pts.push(q);
      if (depth < 2 && Math.random() < 0.3) grow(q, a + rnd(-1, 1), depth + 1, d + i * 0.04);
    }
    out.push({ pts, d });
  };
  for (let i = 0; i < n; i++) grow(origin, (i / n) * Math.PI * 2 + rnd(-0.2, 0.2), 0, 0);
  return out;
}

const BOOK: Quad = [
  [0.194, 0.295],
  [0.79, 0.268],
  [0.684, 0.497],
  [0.167, 0.378],
];

export async function cookbook(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, at } = await scene(rect, code, ready, board);
  const book = BOOK.map(([u, v]) => at(u, v)) as Quad;
  const glow = keyed(root, card, [0.5, 0.45, -0.5], 0.42, 2.2, 0xffc870);
  clip(root, glow, [at(0.1, 0.1), at(0.9, 0.1), at(0.9, 0.52), at(0.1, 0.52)]);
  const g = new Graphics();
  layer(root, false).addChild(g);
  const depth: Pt = [book[3][0] - book[0][0], book[3][1] - book[0][1]];
  const lift = Math.hypot(...depth) * 1.1;
  await run(app, (t) => {
    glow.alpha = 0.45 * Math.sin(Math.PI * span(t, 0, 1.7));
    g.clear();
    for (let i = 0; i < 4; i++) {
      const k = ease.inOut(span(t, 0.1 + i * 0.16, 0.85 + i * 0.16));
      if (k <= 0 || k >= 1) continue;
      const th = k * Math.PI * 0.92;
      const inset = 0.06 + i * 0.015;
      const back0 = bi(book, inset, 0.02);
      const back1 = bi(book, 1 - inset, 0.02);
      const f0 = bi(book, inset, 0.97);
      const f1 = bi(book, 1 - inset, 0.97);
      const free = (b: Pt, f: Pt): Pt => [b[0] + (f[0] - b[0]) * Math.cos(th), b[1] + (f[1] - b[1]) * Math.cos(th) - lift * Math.sin(th)];
      const page: Quad = [back0, back1, free(back1, f1), free(back0, f0)];
      const a = Math.sin(Math.PI * k);
      g.poly(page.flat()).fill({ color: 0xffd890, alpha: 0.16 * a });
      g.poly(page.flat()).stroke({ width: 1.2, color: 0xffe8b8, alpha: 0.85 * a, join: "round" });
      for (let l = 0; l < 4; l++) {
        const r = 0.25 + l * 0.17;
        g.moveTo(...bi(page, 0.12, r)).lineTo(...bi(page, l === 3 ? 0.55 : 0.85, r));
      }
      g.stroke({ width: 1, color: 0xffe8b8, alpha: 0.45 * a });
    }
    return t < 1.75;
  });
  glow.destroy();
  await done();
}

export async function blingPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const wave = keyed(root, card, [-0.5, 0.55, 0.55], 0.3, 3, 0xd8f8ff);
  const wm = new Graphics();
  root.addChild(wm);
  wave.mask = wm;
  const box = new Container();
  root.addChildAt(box, root.getChildIndex(wave));
  box.addChild(wave);
  clip(root, box, [at(0.4, 0.18), at(0.85, 0.18), at(0.85, 0.52), at(0.4, 0.52)]);
  const halo = keyed(root, card, [-0.5, 0.55, 0.55], 0.3, 2, 0x7ad8ff);
  clip(root, halo, [at(0.4, 0.18), at(0.85, 0.18), at(0.85, 0.52), at(0.4, 0.52)]);
  const gems: [Pt, number][] = [
    [at(0.5, 0.36), 0xffffff],
    [at(0.52, 0.41), 0x8affb0],
    [at(0.49, 0.45), 0x7ae8ff],
  ];
  const hub = at(0.51, 0.41);
  const rays: Pt[] = [at(0.66, 0.29), at(0.72, 0.36), at(0.7, 0.43)];
  const g = new Graphics();
  layer(root, false).addChild(g);
  await run(app, (t) => {
    const fade = 1 - span(t, 1.35, 1.75);
    halo.alpha = 0.28 * Math.sin(Math.PI * span(t, 0.2, 1.75)) * (0.88 + 0.12 * Math.sin(t * 37));
    wm.clear();
    for (let w = 0; w < 2; w++) {
      const k = ease.out(span(t, 0.25 + w * 0.35, 1.0 + w * 0.35));
      if (k <= 0 || k >= 1) continue;
      const r = unit * 0.45 * k;
      wm.circle(hub[0], hub[1], r).fill(0xffffff);
      wm.circle(hub[0], hub[1], Math.max(0, r - unit * 0.05)).cut();
    }
    wave.alpha = 0.9;
    g.clear();
    gems.forEach(([p, col], i) => {
      const k = ease.out(span(t, 0.05 + i * 0.08, 0.45 + i * 0.08));
      if (k <= 0) return;
      const tip = lerp(p, rays[i], k);
      g.moveTo(...p)
        .lineTo(...tip)
        .stroke({ width: unit * 0.012, color: col, alpha: 0.25 * fade });
      g.moveTo(...p)
        .lineTo(...tip)
        .stroke({ width: 1.2, color: 0xeaffff, alpha: 0.85 * fade * (1 - 0.5 * span(t, 0.6, 1.2)) });
      const f = Math.sin(Math.PI * span(t, 0.95 + i * 0.12, 1.45 + i * 0.12));
      if (f > 0) star(g, p, unit * 0.055 * f, col, 0.9 * f, 0.4 + t * 0.5);
    });
    return t < 1.75;
  });
  box.destroy({ children: true });
  halo.destroy();
  await done();
}

const SCREEN: Quad = [
  [0.287, 0.26],
  [0.403, 0.252],
  [0.447, 0.321],
  [0.317, 0.34],
];
const BEZEL: Quad = [
  [0.257, 0.248],
  [0.413, 0.243],
  [0.463, 0.329],
  [0.307, 0.35],
];

export async function detentePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const screen = SCREEN.map(([u, v]) => at(u, v)) as Quad;
  const bezel = BEZEL.map(([u, v]) => at(u, v)) as Quad;
  const face = piece(root, card, screen);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  face.filters = [split];
  const blue = keyed(root, card, [-0.4, 0.3, 0.8], 0.2, 2.4, 0x9fd8ff);
  clip(root, blue, screen);
  const chips: Pt[] = [at(0.1, 0.46), at(0.28, 0.49)];
  const g = new Graphics();
  layer(root, false).addChild(g);
  await run(app, (t) => {
    const boot = span(t, 0.05, 0.6);
    const fade = 1 - span(t, 1.3, 1.65);
    const flick = t < 0.6 ? (Math.floor(t * 22) % 3 === 0 ? 0.3 : 1) : 1;
    blue.alpha = 0.85 * boot * fade * flick;
    const glitch = (t > 0.7 && t < 0.78) || (t > 0.95 && t < 1.0) ? 1 : 0;
    split.red = { x: unit * 0.012 * glitch, y: 0 };
    split.blue = { x: -unit * 0.012 * glitch, y: 0 };
    g.clear();
    const s = ease.inOut(span(t, 0.1, 0.7));
    if (s > 0 && s < 1) {
      g.moveTo(...bi(screen, 0, s))
        .lineTo(...bi(screen, 1, s))
        .stroke({ width: 1.6, color: 0xe0f4ff, alpha: 0.9 });
      g.moveTo(...bi(screen, 0, Math.max(0, s - 0.08)))
        .lineTo(...bi(screen, 1, Math.max(0, s - 0.08)))
        .stroke({ width: 1, color: 0x9fd8ff, alpha: 0.4 });
    }
    const trace = ease.out(span(t, 0.05, 0.55));
    if (trace > 0) {
      const loop = [...bezel, bezel[0]];
      const total = 4 * trace;
      g.moveTo(...loop[0]);
      for (let i = 0; i < 4; i++) {
        const f = Math.min(1, Math.max(0, total - i));
        if (f <= 0) break;
        g.lineTo(...lerp(loop[i], loop[i + 1], f));
      }
      g.stroke({ width: 1.2, color: 0x9fd8ff, alpha: 0.7 * fade, join: "round" });
    }
    chips.forEach((p, i) => {
      const f = Math.sin(Math.PI * span(t, 0.75 + i * 0.2, 1.2 + i * 0.2));
      if (f > 0) star(g, p, unit * 0.045 * f, 0xffd0c0, 0.85 * f, 0.5);
    });
    return t < 1.65;
  });
  blue.destroy();
  await done();
}

export async function detente(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const bezel = BEZEL.map(([u, v]) => at(u, v)) as Quad;
  const center = bi(bezel, 0.5, 0.5);
  const shade = new Graphics();
  root.addChildAt(shade, root.getChildIndex(card) + 1);
  const tablet = piece(root, card, bezel);
  pivot(tablet, center);
  const glare = new Graphics();
  tablet.addChild(glare);
  const g = new Graphics();
  layer(root, false).addChild(g);
  await run(app, (t) => {
    const up = ease.out(span(t, 0, 0.35)) * (1 - ease.inOut(span(t, 0.9, 1.3)));
    tablet.scale.set(1 + 0.32 * up);
    tablet.rotation = -0.1 * up;
    tablet.position.set(center[0] + unit * 0.06 * up, center[1] - unit * 0.05 * up);
    shade
      .clear()
      .poly(bezel.map(([x, y]) => [x + unit * 0.03 * up, y + unit * 0.04 * up]).flat())
      .fill({ color: 0x000000, alpha: 0.35 * up });
    glare.clear();
    const k = ease.inOut(span(t, 0.25, 0.8));
    if (k > 0 && k < 1) {
      const s0 = -0.3 + 1.6 * k;
      const q: Pt[] = [bi(bezel, Math.max(0, s0 - 0.12), 0), bi(bezel, Math.min(1, s0), 0), bi(bezel, Math.min(1, Math.max(0, s0 - 0.3)), 1), bi(bezel, Math.max(0, Math.min(1, s0 - 0.42)), 1)];
      glare.poly(q.flat()).fill({ color: 0xdff4ff, alpha: 0.35 });
    }
    g.clear();
    const ring = span(t, 0.3, 0.9);
    if (ring > 0 && ring < 1) {
      const grow = 1 + 0.6 * ease.out(ring);
      const pts = bezel.map(([x, y]) => [center[0] + (x - center[0]) * grow * (1 + 0.32 * up), center[1] + (y - center[1]) * grow * (1 + 0.32 * up)] as Pt);
      g.poly(pts.flat()).stroke({ width: 1.2, color: 0x9fd8ff, alpha: 0.6 * (1 - ring) });
    }
    return t < 1.35;
  });
  shade.destroy();
  tablet.destroy({ children: true });
  await done();
}

const TUBES: [Pt, Pt][] = [
  [
    [0.189, 0.607],
    [0.372, 0.925],
  ],
  [
    [0.267, 0.587],
    [0.422, 0.929],
  ],
  [
    [0.356, 0.575],
    [0.506, 0.933],
  ],
  [
    [0.467, 0.552],
    [0.567, 0.937],
  ],
  [
    [0.578, 0.528],
    [0.678, 0.937],
  ],
];

function tubePoly(at: (u: number, v: number) => Pt, top: Pt, bottom: Pt, level: number, w: number) {
  const dx = top[0] - bottom[0];
  const dy = (top[1] - bottom[1]) * 1.4;
  const l = Math.hypot(dx, dy);
  const nx = (-dy / l) * w;
  const ny = ((dx / l) * w) / 1.4;
  const tip: [number, number] = [bottom[0] + dx * level, bottom[1] + (top[1] - bottom[1]) * level];
  return [at(bottom[0] - nx, bottom[1] - ny), at(bottom[0] + nx, bottom[1] + ny), at(tip[0] + nx, tip[1] + ny), at(tip[0] - nx, tip[1] - ny)];
}

export async function diviner(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, at } = await scene(rect, code, ready, board);
  const empty = copy(card);
  const cm = new ColorMatrixFilter();
  cm.desaturate();
  cm.brightness(0.4, true);
  empty.filters = [cm];
  root.addChildAt(empty, root.getChildIndex(card) + 1);
  const em = new Graphics();
  root.addChild(em);
  empty.mask = em;
  const fill = keyed(root, card, [-0.5, 0.9, -0.2], 0.2, 2.6, 0x7dffa8);
  const fm = new Graphics();
  root.addChild(fm);
  fill.mask = fm;
  const g = new Graphics();
  layer(root, false).addChild(g);
  await run(app, (t) => {
    em.clear();
    fm.clear();
    g.clear();
    const fade = 1 - span(t, 1.05, 1.35);
    TUBES.forEach(([top, bottom], i) => {
      const k = ease.inOut(span(t, 0.1 + i * 0.1, 0.75 + i * 0.1));
      if (k < 1) em.poly(tubePoly(at, bottom, top, 1 - k, 0.034).flat()).fill(0xffffff);
      if (k <= 0) return;
      fm.poly(tubePoly(at, top, bottom, k, 0.034).flat()).fill(0xffffff);
      if (k < 1) {
        const q = tubePoly(at, top, bottom, k, 0.024);
        g.moveTo(...q[2])
          .lineTo(...q[3])
          .stroke({ width: 1.8, color: 0xd8ffe4, alpha: 0.95 });
      }
    });
    empty.alpha = 1 - span(t, 1.0, 1.15);
    const surge = Math.max(0, 1 - Math.abs(t - 1.05) / 0.2);
    fill.alpha = (0.3 + 0.55 * surge) * fade;
    return t < 1.35;
  });
  empty.destroy();
  fill.destroy();
  await done();
}

const HEXAGRAM = [1, 0, 1, 1, 0, 1];

export async function divinerFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, card, done, unit, at } = await scene(rect, code, ready, board);
  const flash = keyed(root, card, [-0.5, 0.9, -0.2], 0.2, 2.6, 0x7dffa8);
  const g = new Graphics();
  world.addChild(g);
  const target: Pt = board?.runner ? runnerAt(board) : [rect.left + rect.width / 2, rect.bottom + unit * 0.5];
  const sticks = HEXAGRAM.map((yang, i) => {
    const [top, bottom] = TUBES[i % TUBES.length];
    return { yang, top, bottom, spin: rnd(4, 7) * (i % 2 ? 1 : -1), d: i * 0.05 };
  });
  let landed = false;
  await run(app, (t) => {
    flash.alpha = 0.7 * Math.max(0, 1 - Math.abs(t - 0.12) / 0.14);
    g.clear();
    const L = unit * 0.34;
    const gap = unit * 0.075;
    sticks.forEach((s, i) => {
      const a0 = root.toGlobal({ x: at(...s.top)[0], y: at(...s.top)[1] });
      const a1 = root.toGlobal({ x: at(...s.bottom)[0], y: at(...s.bottom)[1] });
      const from: Pt = [(a0.x + a1.x) / 2, (a0.y + a1.y) / 2];
      const rest = Math.atan2(a1.y - a0.y, a1.x - a0.x);
      const slot: Pt = [target[0], target[1] - unit * 0.22 + (5 - i) * unit * 0.085];
      const k = ease.inOut(span(t, 0.15 + s.d, 0.7 + s.d));
      const peak: Pt = [(from[0] + slot[0]) / 2 + (i - 2.5) * unit * 0.08, Math.min(from[1], slot[1]) - unit * 0.5];
      const p = bezier(from, peak, slot, k);
      const rot = rest + (0 - rest) * k + Math.sin(Math.PI * k) * s.spin;
      const fade = 1 - span(t, 1.25, 1.6);
      const glowA = span(t, 0.75, 0.9) * fade;
      const half = (L / 2) * (k < 1 ? 0.7 + 0.3 * k : 1);
      const seg = (x0: number, x1: number) => {
        const c = Math.cos(rot);
        const sn = Math.sin(rot);
        const P = (x: number): Pt => [p[0] + c * x, p[1] + sn * x];
        g.moveTo(...P(x0))
          .lineTo(...P(x1))
          .stroke({ width: unit * 0.035, color: 0x2fd870, alpha: (0.35 + 0.3 * glowA) * fade, cap: "round" });
        g.moveTo(...P(x0))
          .lineTo(...P(x1))
          .stroke({ width: 1.5, color: 0xd8ffe4, alpha: 0.95 * fade, cap: "round" });
      };
      if (s.yang || k < 1) seg(-half, half);
      else {
        const open = ease.out(span(t, 0.72 + s.d, 0.85 + s.d)) * gap;
        seg(-half, -open / 2);
        seg(open / 2, half);
      }
    });
    const ring = span(t, 0.85, 1.4);
    if (ring > 0 && ring < 1) g.circle(target[0], target[1] + unit * 0.0, unit * (0.3 + 0.25 * ease.out(ring))).stroke({ width: 1.2, color: 0x7dffa8, alpha: 0.6 * (1 - ring) });
    if (!landed && t > 0.9) {
      landed = true;
      jolt(board, 0.35);
    }
    return t < 1.6;
  });
  g.destroy();
  flash.destroy();
  await done();
}

const dash = (g: Graphics, a: Pt, b: Pt, color: number, alpha: number) =>
  g
    .moveTo(...a)
    .lineTo(...b)
    .stroke({ width: 1.6, color, alpha, cap: "round" });

export async function idiosyncresis(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const art: Pt[] = [at(0.03, 0.1), at(0.97, 0.1), at(0.97, 0.52), at(0.03, 0.52)];
  const face = piece(root, card, art);
  const flow = shimmer(root, face, rect, unit * 0.045);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const eyesGlow = keyed(root, card, [0.4, 0.4, 0.2], 0.85, 6, 0xfff4b0);
  clip(root, eyesGlow, [at(0.42, 0.18), at(0.6, 0.18), at(0.6, 0.29), at(0.42, 0.29)]);
  const streams: [Pt, Pt, Pt][] = [
    [at(0.02, 0.41), at(0.17, 0.375), at(0.34, 0.32)],
    [at(0.05, 0.37), at(0.19, 0.345), at(0.33, 0.305)],
    [at(0.61, 0.195), at(0.71, 0.18), at(0.83, 0.16)],
  ];
  const mouth = at(0.608, 0.27);
  const g = new Graphics();
  layer(root, false).addChild(g);
  const bits = Array.from({ length: 30 }, (_, i) => ({ path: i % 3, off: i / 30 + rnd(0, 0.03), len: rnd(0.02, 0.05), col: i % 4 ? 0xd8ff5a : 0xffd84a }));
  const screams = [0.45, 0.75, 1.05];
  await run(app, (t) => {
    const env = Math.sin(Math.PI * span(t, 0, 1.9));
    flow(t, env);
    const jolt = Math.max(...screams.map((b) => Math.max(0, 1 - Math.abs(t - b) / 0.08)));
    root.filters = jolt > 0 ? [split] : [];
    split.red = { x: unit * 0.014 * jolt, y: 0 };
    split.blue = { x: -unit * 0.014 * jolt, y: 0 };
    eyesGlow.alpha = 0.8 * env;
    g.clear();
    for (const b of bits) {
      const s = (b.off + t * 0.55) % 1;
      const [p0, p1, p2] = streams[b.path];
      dash(g, bezier(p0, p1, p2, s), bezier(p0, p1, p2, Math.min(1, s + b.len)), b.col, 0.85 * env * Math.sin(Math.PI * s));
    }
    screams.forEach((b) => {
      const w = span(t, b, b + 0.7);
      if (w <= 0 || w >= 1) return;
      const r = unit * (0.04 + 0.3 * ease.out(w));
      g.moveTo(mouth[0] + Math.cos(-0.9) * r, mouth[1] + Math.sin(-0.9) * r)
        .arc(mouth[0], mouth[1], r, -0.9, 0.5)
        .stroke({ width: 1.6, color: 0xff6ab0, alpha: 0.75 * (1 - w) });
    });
    return t < 1.9;
  });
  root.filters = [];
  eyesGlow.destroy();
  await done();
}

const TOWER: [number, number][] = [
  [0.41, 0.09],
  [0.47, 0.09],
  [0.62, 0.22],
  [0.74, 0.33],
  [0.77, 0.4],
  [0.7, 0.48],
  [0.25, 0.48],
  [0.16, 0.42],
  [0.23, 0.3],
  [0.33, 0.18],
];
