import { BlurFilter, ColorMatrixFilter, Container, Graphics, Sprite } from "pixi.js";
import { RGBSplitFilter, ZoomBlurFilter } from "pixi-filters";
import { ease, filterPoint, layer, run, span } from "./stage";
import { type Board, type Ready, scene } from "./kit";
import { type Pt, lerp } from "./more";
import { bezier } from "./sixth";
import { band, keyed, ribbon } from "./revJ";

type At = (u: number, v: number) => Pt;

function twin(card: Sprite, parent: Container) {
  const s = new Sprite(card.texture);
  s.anchor.copyFrom(card.anchor);
  s.scale.copyFrom(card.scale);
  s.rotation = card.rotation;
  s.position.copyFrom(card.position);
  parent.addChild(s);
  return s;
}

function artBox(g: Graphics, at: At, v1 = 0.53) {
  return g.poly([...at(0.02, 0.06), ...at(0.98, 0.06), ...at(0.98, v1), ...at(0.02, v1)]).fill(0xffffff);
}

function crack(from: Pt, angle: number, length: number, seed: number): Pt[] {
  const pts: Pt[] = [from];
  let a = angle;
  let p = from;
  const n = 6;
  for (let i = 1; i <= n; i++) {
    a += Math.sin(seed * 12.9 + i * 7.3) * 0.35;
    const step = (length / n) * (0.7 + 0.6 * Math.abs(Math.sin(seed * 3.1 + i * 2.7)));
    p = [p[0] + Math.cos(a) * step, p[1] + Math.sin(a) * step];
    pts.push(p);
  }
  return pts;
}

function partial(g: Graphics, pts: Pt[], k: number) {
  const n = (pts.length - 1) * k;
  g.moveTo(...pts[0]);
  for (let i = 1; i <= Math.ceil(n); i++) g.lineTo(...lerp(pts[i - 1], pts[i], Math.min(1, n - (i - 1))));
  return g;
}

function starShape(g: Graphics, c: Pt, r: number) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.45 : r;
    pts.push(c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d);
  }
  return g.poly(pts);
}

export async function retribution(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at, zoom } = await scene(rect, code, ready, board);
  const dim = new ColorMatrixFilter();
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [dim, split];
  const debris = keyed(root, card, [0.9, -0.5, -0.3], 0.25, 2.2, 0xff5a7a);
  const debrisClip = new Graphics();
  artBox(debrisClip, at);
  root.addChild(debrisClip);
  debris.mask = debrisClip;
  const fx = layer(root, false);
  const smear = new Graphics();
  smear.blendMode = "add";
  const scar = new Graphics();
  const edge = new Graphics();
  edge.blendMode = "add";
  fx.addChild(smear, scar, edge);
  const grip = at(0.63, 0.215);
  const tip = at(0.735, 0.125);
  const hit = at(0.76, 0.36);
  const L = Math.hypot(tip[0] - grip[0], tip[1] - grip[1]);
  const rest = Math.atan2(tip[1] - grip[1], tip[0] - grip[0]);
  const strike = Math.atan2(hit[1] - grip[1], hit[0] - grip[0]);
  const cracks = Array.from({ length: 8 }, (_, i) => crack(hit, (i / 8) * Math.PI * 2 + 0.3 * Math.sin(i * 5.1), unit * (0.14 + 0.12 * Math.abs(Math.sin(i * 2.3))), i + 1));
  const base = card.position.clone();
  let impact = -1;
  await run(app, (t) => {
    smear.clear();
    scar.clear();
    edge.clear();
    const lean = ease.inOut(span(t, 0, 0.3));
    const fall = ease.inOut(span(t, 0, 0.45));
    dim.brightness(1 - 0.22 * lean * (1 - span(t, 0.5, 1.2)) + 0.1 * Math.max(0, 1 - Math.abs(t - 0.47) / 0.08), false);
    const wind = rest - 0.35 * ease.out(span(t, 0, 0.25));
    const swing = span(t, 0.25, 0.45);
    const a = swing > 0 ? wind + (strike + 0.05 - wind) * ease.inOut(swing) : wind;
    const from = Math.max(wind, a - 0.9);
    if (swing > 0 && t < 0.65) {
      const fade = 1 - span(t, 0.45, 0.65);
      const steps = 14;
      const outer: number[] = [];
      const inner: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const b = from + ((a - from) * i) / steps;
        const w = (i / steps) ** 1.6;
        outer.push(grip[0] + Math.cos(b) * L * 1.04, grip[1] + Math.sin(b) * L * 1.04);
        inner.unshift(grip[0] + Math.cos(b) * L * (1.04 - 0.5 * w), grip[1] + Math.sin(b) * L * (1.04 - 0.5 * w));
      }
      smear.poly([...outer, ...inner]).fill({ color: 0x9fd0ff, alpha: 0.32 * fade });
      smear
        .moveTo(grip[0] + Math.cos(from) * L * 1.04, grip[1] + Math.sin(from) * L * 1.04)
        .arc(grip[0], grip[1], L * 1.04, from, a)
        .stroke({ width: 1.6, color: 0xd8ecff, alpha: 0.85 * fade });
    }
    if (impact < 0 && t >= 0.45) {
      impact = t;
      navigator.vibrate?.([40, 20, 40]);
    }
    if (impact >= 0) {
      const k = span(t, impact, impact + 0.14);
      const hold = 1 - span(t, 1.05, 1.4);
      cracks.forEach((c, i) => {
        const kk = Math.min(1, k * (1.2 - (i % 3) * 0.12));
        partial(scar, c, kk).stroke({ width: unit * 0.012, color: 0x1a0610, alpha: 0.55 * hold, join: "miter", cap: "butt" });
        partial(edge, c, kk).stroke({ width: 1, color: 0xff8ad0, alpha: 0.7 * hold, join: "miter", cap: "butt" });
      });
      const r = span(t, impact, impact + 0.35);
      if (r < 1) edge.circle(...hit, unit * (0.04 + 0.2 * ease.out(r))).stroke({ width: 1.5 * (1 - r) + 0.5, color: 0xffb0d8, alpha: 0.7 * (1 - r) });
      debris.alpha = 0.55 * Math.max(0, 1 - (t - impact) / 0.6);
      const kick = Math.max(0, 1 - (t - impact) / 0.3);
      zoom(1 + 0.04 * ease.back(Math.min(1, (t - impact) / 0.08)) * kick);
      split.red = { x: unit * 0.006 * kick, y: 0 };
      split.blue = { x: -unit * 0.006 * kick, y: 0 };
      card.position.set(base.x + Math.sin(t * 95) * unit * 0.01 * kick, base.y + Math.cos(t * 80) * unit * 0.008 * kick);
    } else zoom(1 - 0.015 * fall);
    return t < 1.4;
  });
  card.position.copyFrom(base);
  zoom(1);
  card.filters = [];
  debris.destroy();
  debrisClip.destroy();
  await done();
}

export async function scrounge(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const xray = keyed(root, card, [-0.6, 0.2, 1], 0.05, 2.2, 0x3ab8e0);
  const cone = new Graphics();
  root.addChild(cone);
  const clipBox = new Graphics();
  artBox(clipBox, at);
  root.addChild(clipBox);
  const holder = new Container();
  root.addChildAt(holder, root.getChildIndex(xray));
  holder.addChild(xray);
  holder.mask = clipBox;
  xray.mask = cone;
  const fx = layer(root, false);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const lineClip = new Graphics();
  artBox(lineClip, at);
  fx.addChild(lineClip);
  g.mask = lineClip;
  const tip = at(0.75, 0.285);
  const find: [Pt, Pt] = [at(0.71, 0.42), at(0.82, 0.48)];
  const findAt = lerp(find[0], find[1], 0.5);
  const aim = (p: Pt) => Math.atan2(p[1] - tip[1], p[0] - tip[0]);
  const start = aim(at(1.02, 0.3));
  const stop = aim(at(0.55, 0.52));
  const lock = aim(findAt);
  const reach = unit * 0.5;
  const half = 0.2;
  await run(app, (t) => {
    cone.clear();
    g.clear();
    const on = span(t, 0.05, 0.2) * (1 - span(t, 1.35, 1.65));
    const sweep = ease.inOut(span(t, 0.1, 0.8));
    const settle = ease.inOut(span(t, 0.8, 1.05));
    const a = start + (stop - start) * sweep + (lock - stop) * settle;
    const w = half * (1 - 0.45 * settle);
    const l: Pt = [tip[0] + Math.cos(a - w) * reach, tip[1] + Math.sin(a - w) * reach];
    const r: Pt = [tip[0] + Math.cos(a + w) * reach, tip[1] + Math.sin(a + w) * reach];
    if (on > 0) {
      cone.poly([...tip, ...l, ...r]).fill(0xffffff);
      xray.alpha = 0.6 * on;
      g.moveTo(...tip)
        .lineTo(...l)
        .stroke({ width: 1, color: 0x8aeaff, alpha: 0.55 * on });
      g.moveTo(...tip)
        .lineTo(...r)
        .stroke({ width: 1, color: 0x8aeaff, alpha: 0.55 * on });
      for (let i = 0; i < 3; i++) {
        const f = (t * 1.6 + i / 3) % 1;
        const rr = reach * (0.15 + 0.85 * f);
        g.moveTo(tip[0] + Math.cos(a - w) * rr, tip[1] + Math.sin(a - w) * rr)
          .arc(tip[0], tip[1], rr, a - w, a + w)
          .stroke({ width: 1, color: 0xbff4ff, alpha: 0.5 * on * Math.sin(Math.PI * f) });
      }
    }
    const found = span(t, 1, 1.2);
    if (found > 0) {
      const fade = 1 - span(t, 1.4, 1.65);
      const pad = unit * 0.04 * (1 - ease.out(found));
      const [p0, p1] = find;
      const x0 = p0[0] - pad;
      const y0 = p0[1] - pad;
      const x1 = p1[0] + pad;
      const y1 = p1[1] + pad;
      const c = unit * 0.025;
      for (const [x, y, sx, sy] of [
        [x0, y0, 1, 1],
        [x1, y0, -1, 1],
        [x0, y1, 1, -1],
        [x1, y1, -1, -1],
      ] as const)
        g.moveTo(x + sx * c, y)
          .lineTo(x, y)
          .lineTo(x, y + sy * c);
      g.stroke({ width: 1.6, color: 0xbff4ff, alpha: 0.9 * fade * found });
    }
    return t < 1.65;
  });
  holder.destroy({ children: true });
  cone.destroy();
  clipBox.destroy();
  await done();
}

export async function sideHustlePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at, zoom } = await scene(rect, code, ready, board);
  const wheel = at(0.36, 0.42);
  const rush = new ZoomBlurFilter({ strength: 0, innerRadius: unit * 0.16, radius: unit * 1.2 });
  const clip = new Container();
  root.addChildAt(clip, root.getChildIndex(card) + 1);
  const box = new Graphics();
  artBox(box, at, 0.52);
  clip.addChild(box);
  clip.mask = box;
  const blurred = twin(card, clip);
  blurred.filters = [rush];
  const jet = keyed(root, card, [-0.9, 0.3, 1], 0.32, 2.6, 0x5ad8ff);
  const jetClip = new Graphics();
  artBox(jetClip, at, 0.52);
  root.addChild(jetClip);
  jet.mask = jetClip;
  const fx = layer(root, false);
  const stars = new Graphics();
  fx.addChild(stars);
  const row = Array.from({ length: 5 }, (_, i) => at(0.64 + i * 0.07, 0.235 - Math.sin((i / 4) * Math.PI) * 0.015));
  await run(app, (t) => {
    stars.clear();
    const dash = Math.sin(Math.PI * span(t, 0, 0.55));
    const fp = filterPoint(blurred, wheel[0], wheel[1]);
    rush.center = { x: fp.x, y: fp.y };
    rush.strength = 0.09;
    blurred.alpha = 0.85 * dash;
    zoom(1 + 0.02 * dash);
    jet.alpha = 0.7 * Math.sin(Math.PI * span(t, 0, 0.8)) * (0.85 + 0.15 * Math.sin(t * 40));
    const fade = 1 - span(t, 1.45, 1.75);
    row.forEach((c, i) => {
      const k = span(t, 0.55 + i * 0.12, 0.75 + i * 0.12);
      if (k <= 0) return;
      const r = unit * 0.034 * ease.back(k);
      if (i < 4) {
        starShape(stars, [c[0], c[1] + unit * 0.004], r).fill({ color: 0x2a1a00, alpha: 0.5 * fade });
        starShape(stars, c, r)
          .fill({ color: 0xf4c44a, alpha: 0.95 * fade })
          .stroke({ width: 1, color: 0x7a5200, alpha: 0.9 * fade });
      } else starShape(stars, c, r).stroke({ width: 1.4, color: 0xf4c44a, alpha: 0.9 * fade });
    });
    return t < 1.75;
  });
  zoom(1);
  clip.destroy({ children: true });
  jet.destroy();
  jetClip.destroy();
  await done();
}

export async function touchUps(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const clip = new Container();
  root.addChildAt(clip, root.getChildIndex(card) + 1);
  const box = new Graphics();
  artBox(box, at);
  clip.addChild(box);
  clip.mask = box;
  const lensLayer = new Container();
  clip.addChild(lensLayer);
  const polished = twin(card, lensLayer);
  const tone = new ColorMatrixFilter();
  tone.matrix = [1.12, 0.04, 0, 0, 0.02, 0.02, 1.08, 0, 0, 0.01, 0, 0.02, 1.0, 0, 0, 0, 0, 0, 1, 0];
  polished.filters = [new BlurFilter({ strength: unit * 0.006, quality: 3 }), tone];
  const lensMask = new Graphics();
  lensLayer.addChild(lensMask);
  polished.mask = lensMask;
  const fx = layer(root, false);
  const g = new Graphics();
  fx.addChild(g);
  const path: Pt[] = [at(0.42, 0.225), at(0.475, 0.222), at(0.52, 0.225), at(0.565, 0.228), at(0.567, 0.266)];
  const face: [Pt, Pt] = [at(0.543, 0.24), at(0.592, 0.292)];
  const along = (k: number): Pt => {
    const n = (path.length - 1) * k;
    const i = Math.min(path.length - 2, Math.floor(n));
    return lerp(path[i], path[i + 1], ease.inOut(n - i));
  };
  const R = unit * 0.045;
  await run(app, (t) => {
    lensMask.clear();
    g.clear();
    const on = span(t, 0.05, 0.25) * (1 - span(t, 1.35, 1.65));
    const p = along(span(t, 0.1, 1.05));
    const r = R * (1 + 0.15 * Math.sin(Math.PI * span(t, 1.05, 1.25)));
    if (on > 0) {
      lensMask.circle(p[0], p[1], r).fill(0xffffff);
      polished.alpha = on;
      g.circle(p[0], p[1], r).stroke({ width: 1.4, color: 0xfff0d8, alpha: 0.85 * on });
      g.circle(p[0], p[1], r * 1.12).stroke({ width: 0.8, color: 0xffd8a8, alpha: 0.45 * on });
      g.moveTo(p[0] + r * 0.72, p[1] + r * 0.72)
        .lineTo(p[0] + r * 1.45, p[1] + r * 1.45)
        .stroke({ width: unit * 0.012, color: 0x6a5030, alpha: 0.7 * on, cap: "round" });
      g.moveTo(p[0] - r * 0.55, p[1] - r * 0.45)
        .arc(p[0], p[1], r * 0.72, Math.PI * 1.15, Math.PI * 1.45)
        .stroke({ width: 1.2, color: 0xffffff, alpha: 0.6 * on });
    }
    const frame = span(t, 1.05, 1.25);
    if (frame > 0) {
      const fade = 1 - span(t, 1.45, 1.75);
      const pad = unit * 0.05 * (1 - ease.out(frame));
      const [a, b] = face;
      const c = unit * 0.02;
      for (const [x, y, sx, sy] of [
        [a[0] - pad, a[1] - pad, 1, 1],
        [b[0] + pad, a[1] - pad, -1, 1],
        [a[0] - pad, b[1] + pad, 1, -1],
        [b[0] + pad, b[1] + pad, -1, -1],
      ] as const)
        g.moveTo(x + sx * c, y)
          .lineTo(x, y)
          .lineTo(x, y + sy * c);
      g.stroke({ width: 1.8, color: 0xf6c945, alpha: 0.95 * fade * frame });
    }
    return t < 1.75;
  });
  clip.destroy({ children: true });
  await done();
}
