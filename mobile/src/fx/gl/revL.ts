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
  await run(app, (t) => {
    const dash = Math.sin(Math.PI * span(t, 0, 0.55));
    const fp = filterPoint(blurred, wheel[0], wheel[1]);
    rush.center = { x: fp.x, y: fp.y };
    rush.strength = 0.09;
    blurred.alpha = 0.85 * dash;
    zoom(1 + 0.02 * dash);
    jet.alpha = 0.7 * Math.sin(Math.PI * span(t, 0, 0.8)) * (0.85 + 0.15 * Math.sin(t * 40));
    return t < 1.1;
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
