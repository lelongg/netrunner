import { ColorMatrixFilter, Container, Graphics, Sprite } from "pixi.js";
import { ease, glowTexture, run, span } from "./stage";
import { type Board, type Ready, coinTexture, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp } from "./more";
import { bezier, jolt, runnerAt } from "./sixth";

type At = (u: number, v: number) => Pt;
type Matrix = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

function twin(card: Sprite, parent: Container) {
  const s = new Sprite(card.texture);
  s.anchor.copyFrom(card.anchor);
  s.scale.copyFrom(card.scale);
  s.rotation = card.rotation;
  s.position.copyFrom(card.position);
  parent.addChild(s);
  return s;
}

function keyed(root: Container, card: Sprite, matrix: Matrix, at: At, v0?: number, v1?: number, additive = true) {
  const clip = new Container();
  root.addChildAt(clip, root.getChildIndex(card) + 1);
  const box = artRect(at, v0, v1);
  clip.addChild(box);
  clip.mask = box;
  const layer = new Container();
  clip.addChild(layer);
  const s = twin(card, layer);
  const m = new ColorMatrixFilter();
  m.matrix = matrix;
  if (additive) m.blendMode = "add";
  s.filters = [m];
  return { layer, s };
}

const glowKey = (color: number, kr: number, kg: number, kb: number, o: number): Matrix => [0, 0, 0, 0, ((color >> 16) & 255) / 255, 0, 0, 0, 0, ((color >> 8) & 255) / 255, 0, 0, 0, 0, (color & 255) / 255, kr, kg, kb, 0, o];
const lift = (r: number, g: number, b: number): Matrix => [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
const lum = (k: number, o: number, color: number) => glowKey(color, 0.3 * k, 0.59 * k, 0.11 * k, o);

function soft(key: string) {
  return painted(key, 256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.5, "rgba(255,255,255,0.85)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
  });
}

const bandTexture = () =>
  painted("rvI-band", 16, 128, (g) => {
    const lin = g.createLinearGradient(0, 0, 16, 0);
    lin.addColorStop(0, "rgba(255,255,255,0)");
    lin.addColorStop(0.5, "rgba(255,255,255,1)");
    lin.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lin;
    g.fillRect(0, 0, 16, 128);
  });

const coneTexture = () =>
  painted("rvI-cone", 256, 128, (g) => {
    const lin = g.createLinearGradient(0, 0, 256, 0);
    lin.addColorStop(0, "rgba(255,255,255,1)");
    lin.addColorStop(0.6, "rgba(255,255,255,0.55)");
    lin.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lin;
    g.beginPath();
    g.moveTo(0, 58);
    g.lineTo(256, 0);
    g.lineTo(256, 128);
    g.lineTo(0, 70);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = "destination-in";
    const v = g.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.35, "rgba(0,0,0,1)");
    v.addColorStop(0.65, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = v;
    g.fillRect(0, 0, 256, 128);
  });

function band(parent: Container, mask: Container) {
  const s = new Sprite(bandTexture());
  s.anchor.set(0.5);
  parent.addChild(s);
  mask.mask = s;
  return s;
}

function sweep(s: Sprite, a: Pt, b: Pt, k: number, width: number, length: number) {
  const p = lerp(a, b, k);
  s.position.set(...p);
  s.rotation = Math.atan2(b[1] - a[1], b[0] - a[0]);
  s.width = width;
  s.height = length;
}

function artRect(at: At, v0 = 0.08, v1 = 0.53) {
  const g = new Graphics();
  const a = at(0.03, v0);
  const b = at(0.97, v1);
  g.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])).fill(0xffffff);
  return g;
}

export async function hedgeFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const { layer, s } = keyed(root, card, lum(2.2, -1.25, 0xf2c05a), at);
  const pool = new Sprite(soft("rvI-soft"));
  pool.anchor.set(0.5);
  const heart = at(0.5, 0.27);
  pool.position.set(...heart);
  layer.addChild(pool);
  s.mask = pool;
  const trails = new Graphics();
  fx.addChild(trails);
  const ends: Pt[] = [at(0.47, 0.3), at(0.2, 0.32), at(0.8, 0.29), at(0.62, 0.22), at(0.36, 0.24), at(0.9, 0.36)];
  const starts: Pt[] = [at(-0.1, 0.14), at(1.1, 0.12), at(-0.1, 0.44), at(1.1, 0.44), at(0.22, -0.08), at(0.8, -0.08)];
  const coins = starts.map((from, i) => {
    const c = new Sprite(coinTexture());
    c.anchor.set(0.5);
    c.alpha = 0;
    fx.addChild(c);
    const to = ends[i];
    const mid = lerp(from, to, 0.5);
    const bend: Pt = [mid[0] + (to[1] - from[1]) * 0.3, mid[1] - Math.abs(to[0] - from[0]) * 0.15];
    return { c, from, to, bend, d: 0.15 + i * 0.09 };
  });
  root.addChild(fx);
  await run(app, (t) => {
    const grow = ease.out(span(t, 0.35, 1.25));
    pool.width = pool.height = unit * (0.15 + 1.5 * grow);
    layer.alpha = 0.75 * span(t, 0.35, 0.6) * (1 - span(t, 1.25, 1.65));
    trails.clear();
    for (const m of coins) {
      const k = span(t, m.d, m.d + 0.6);
      if (k <= 0 || k >= 1) {
        m.c.alpha = 0;
        continue;
      }
      const e = ease.inOut(k);
      const n = 12;
      for (let j = 0; j < n; j++) {
        const a = bezier(m.from, m.bend, m.to, Math.max(0, e - (0.3 * j) / n));
        const b = bezier(m.from, m.bend, m.to, Math.max(0, e - (0.3 * (j + 1)) / n));
        trails
          .moveTo(...a)
          .lineTo(...b)
          .stroke({ width: unit * 0.012 * (1 - j / n), color: 0xe2b24c, alpha: 0.6 * (1 - j / n) * (1 - span(k, 0.85, 1)) });
      }
      m.c.position.set(...bezier(m.from, m.bend, m.to, e));
      m.c.alpha = 1 - span(k, 0.85, 1);
      const sc = (unit / 64) * 0.12 * (1 - 0.5 * span(k, 0.75, 1));
      m.c.scale.set(sc * Math.cos(t * 8 + m.d * 9), sc);
    }
    return t < 1.65;
  });
  await done();
}

const MADANI_EYE: Pt = [0.553, 0.262];

export async function madaniPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const { layer, s } = keyed(root, card, lift(1.75, 1.5, 1.15), at, 0.12, 0.52, false);
  const light = band(layer, s);
  const eye = glowSprite(fx, glowTexture(), 0x5fe8d0);
  eye.position.set(...at(...MADANI_EYE));
  root.addChild(fx);
  const a = at(0.08, 0.12);
  const b = at(0.7, 0.44);
  await run(app, (t) => {
    const k = ease.inOut(span(t, 0.05, 1.15));
    sweep(light, a, b, k, unit * 0.75, unit * 1.6);
    layer.alpha = Math.sin(Math.PI * span(t, 0.05, 1.15));
    const e = Math.sin(Math.PI * span(t, 0.85, 1.55));
    eye.alpha = 0.7 * e;
    eye.scale.set((unit / 128) * (0.04 + 0.03 * e));
    return t < 1.55;
  });
  await done();
}

export async function madani(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const { layer, s } = keyed(root, card, lift(0.95, 1.75, 1.7), at, 0.12, 0.52, false);
  const light = band(layer, s);
  const eye = glowSprite(fx, glowTexture(), 0x6af0dc);
  eye.position.set(...at(...MADANI_EYE));
  const ring = new Graphics();
  fx.addChild(ring);
  root.addChild(fx);
  const base = at(0.42, 0.46);
  const top = at(0.52, 0.12);
  await run(app, (t) => {
    const up = ease.inOut(span(t, 0.05, 0.75));
    sweep(light, base, top, up, unit * 0.6, unit * 1.2);
    light.rotation += Math.PI / 2;
    layer.alpha = Math.sin(Math.PI * span(t, 0.05, 0.85));
    ring.clear();
    const r = span(t, 0.05, 0.6);
    if (r > 0 && r < 1) ring.ellipse(base[0], base[1], rect.width * (0.12 + 0.2 * ease.out(r)), rect.height * (0.012 + 0.018 * ease.out(r))).stroke({ width: 1.5, color: 0x6af0dc, alpha: 0.7 * (1 - r) });
    const e = Math.max(0, 1 - Math.abs(t - 0.75) / 0.35);
    eye.alpha = 0.85 * e;
    eye.scale.set((unit / 128) * (0.04 + 0.05 * e));
    return t < 1.2;
  });
  await done();
}

const RIM = { c: [0.455, 0.471] as Pt, rx: 0.233, ry: 0.02, tilt: -0.01 };

export async function maintenanceAccess(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const { layer, s } = keyed(root, card, glowKey(0x7af7dc, -1.4, 1.6, 0.4, -0.35), at);
  const pool = new Sprite(soft("rvI-soft"));
  pool.anchor.set(0.5);
  layer.addChild(pool);
  s.mask = pool;
  const rim = new Graphics();
  fx.addChild(rim);
  const lids = new Graphics();
  fx.addChild(lids);
  const eyes: Pt[] = [at(0.42, 0.416), at(0.48, 0.408)];
  const glows = eyes.map((p) => {
    const g = glowSprite(fx, glowTexture(), 0xffd24a);
    g.position.set(...p);
    return g;
  });
  root.addChild(fx);
  const c = at(...RIM.c);
  const W = rect.width * RIM.rx;
  const H = rect.height * RIM.ry;
  const P = (a: number): Pt => {
    const x = Math.cos(a) * W;
    const y = Math.sin(a) * H;
    return [c[0] + x * Math.cos(RIM.tilt) - y * Math.sin(RIM.tilt), c[1] + x * Math.sin(RIM.tilt) + y * Math.cos(RIM.tilt)];
  };
  const hidden = (a: number) => Math.sin(a) < 0 && Math.cos(a) > -0.4 && Math.cos(a) < 0.74;
  await run(app, (t) => {
    rim.clear();
    const k = ease.inOut(span(t, 0.05, 0.75));
    const fade = 1 - span(t, 1.1, 1.5);
    for (const dir of [1, -1]) {
      const head = Math.PI / 2 + dir * Math.PI * k;
      const n = 24;
      for (let j = 0; j < n; j++) {
        const a0 = head - (dir * 1.4 * j) / n;
        const a1 = head - (dir * 1.4 * (j + 1)) / n;
        if (hidden(a0) || hidden(a1)) continue;
        rim
          .moveTo(...P(a0))
          .lineTo(...P(a1))
          .stroke({ width: unit * 0.012 * (1 - j / n), color: 0x7af7dc, alpha: 0.85 * (1 - j / n) * fade });
      }
    }
    if (k >= 1) {
      for (let i = 0; i < 48; i++) {
        const a0 = (i / 48) * Math.PI * 2;
        const a1 = ((i + 1) / 48) * Math.PI * 2;
        if (hidden(a0) || hidden(a1)) continue;
        rim.moveTo(...P(a0)).lineTo(...P(a1));
      }
      rim.stroke({ width: 1.2, color: 0x7af7dc, alpha: 0.5 * fade });
    }
    pool.position.set(c[0], c[1] - rect.height * 0.04);
    pool.width = rect.width * (0.3 + 0.35 * ease.out(span(t, 0.3, 1)));
    pool.height = rect.height * 0.16;
    layer.alpha = 0.9 * span(t, 0.3, 0.6) * fade;
    lids.clear();
    const blink = Math.max(0, 1 - Math.abs(t - 0.95) / 0.07) + Math.max(0, 1 - Math.abs(t - 1.15) / 0.07);
    eyes.forEach((p, i) => {
      glows[i].alpha = 0.6 * span(t, 0.5, 0.75) * (1 - span(t, 1.3, 1.5)) * (1 - Math.min(1, blink));
      glows[i].scale.set((unit / 128) * 0.065);
      if (blink > 0) lids.ellipse(p[0], p[1], unit * 0.022, unit * 0.022 * Math.min(1, blink)).fill({ color: 0x101416, alpha: 0.95 });
    });
    return t < 1.5;
  });
  await done();
}

const GULLET: Pt[] = [
  [0.82, 0.27],
  [0.7, 0.25],
  [0.62, 0.27],
  [0.57, 0.34],
  [0.48, 0.39],
  [0.36, 0.39],
  [0.24, 0.36],
  [0.15, 0.34],
];

function along(pts: Pt[], k: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = k * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) return lerp(pts[i], pts[i + 1], lens[i] ? d / lens[i] : 0);
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

export async function leechPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const { layer, s } = keyed(root, card, glowKey(0xffc8f4, 1.4, -1.3, 1.0, -0.2), at);
  const pool = new Sprite(soft("rvI-soft"));
  pool.anchor.set(0.5);
  layer.addChild(pool);
  s.mask = pool;
  const lens = new Container();
  root.addChildAt(lens, root.getChildIndex(layer.parent!) + 1);
  const swollen = twin(card, lens);
  const hole = new Sprite(soft("rvI-soft"));
  hole.anchor.set(0.5);
  root.addChild(hole);
  swollen.mask = hole;
  const path = GULLET.map((p) => at(...p));
  const eyes = [at(0.462, 0.212), at(0.54, 0.158)].map((p) => {
    const g = glowSprite(fx, glowTexture(), 0x9aff8a);
    g.position.set(...p);
    return g;
  });
  root.addChild(fx);
  await run(app, (t) => {
    const k = ease.inOut(span(t, 0.15, 1.25));
    const p = along(path, k);
    const on = Math.sin(Math.PI * span(t, 0.15, 1.25));
    lens.pivot.set(...p);
    lens.position.set(...p);
    lens.scale.set(1 + 0.42 * on);

    hole.position.set(...p);
    hole.width = hole.height = unit * 0.3;
    hole.alpha = on;
    lens.alpha = on;
    pool.position.set(...p);
    pool.width = pool.height = unit * 0.3;
    layer.alpha = 0.85 * on;
    const wake = Math.sin(Math.PI * span(t, 0, 0.5));
    eyes.forEach((e, i) => {
      e.alpha = 0.6 * Math.max(wake, 0.4 * on) * (0.85 + 0.15 * Math.sin(t * 10 + i));
      e.scale.set((unit / 128) * 0.05);
    });
    return t < 1.4;
  });
  await done();
}

const LANTERN: Pt = [0.4, 0.645];

export async function lamplighterFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const lamp = at(...LANTERN);
  const { layer, s } = keyed(root, card, lift(1.5, 1.65, 1.9), at, 0.5, 0.98, false);
  const rake = new Sprite(coneTexture());
  rake.anchor.set(0, 0.5);
  rake.position.set(...lamp);
  layer.addChild(rake);
  s.mask = rake;
  const heart = glowSprite(fx, glowTexture(), 0xc8e2ff);
  heart.position.set(...lamp);
  const beam = new Sprite(coneTexture());
  beam.anchor.set(0, 0.5);
  beam.blendMode = "add";
  beam.tint = 0xa8ccff;
  world.addChild(beam);
  const mark = new Graphics();
  world.addChild(mark);
  root.addChild(fx);
  const target = runnerAt(board);
  let hit = false;
  await run(app, (t) => {
    const on = span(t, 0, 0.15) * (1 - span(t, 1.1, 1.45));
    rake.rotation = -1.4 + 2.2 * ease.inOut(span(t, 0, 0.7));
    rake.width = unit * 1.3;
    rake.height = unit * 1.1;
    layer.alpha = on;
    heart.alpha = 0.5 * on;
    heart.scale.set((unit / 128) * (0.1 + 0.03 * Math.sin(t * 14)));
    const src = root.toGlobal({ x: lamp[0], y: lamp[1] });
    const aim = Math.atan2(target[1] - src.y, target[0] - src.x);
    const swing = ease.out(span(t, 0.4, 0.8));
    beam.position.set(src.x, src.y);
    beam.rotation = aim - 0.7 * (1 - swing);
    beam.width = Math.hypot(target[0] - src.x, target[1] - src.y) * 1.1;
    beam.height = unit * (0.9 - 0.6 * span(t, 0.7, 0.95));
    beam.alpha = 0.32 * span(t, 0.4, 0.55) * (1 - span(t, 1.0, 1.35));
    mark.clear();
    const r = span(t, 0.8, 1.35);
    if (r > 0 && r < 1) {
      const R = unit * (0.3 - 0.14 * ease.out(r));
      mark.circle(target[0], target[1], R).stroke({ width: 1.5, color: 0xd0e6ff, alpha: 0.75 * (1 - r) });
      mark.circle(target[0], target[1], R * 0.55).stroke({ width: 1, color: 0x9cc4ff, alpha: 0.5 * (1 - r) });
    }
    if (!hit && t > 0.85) {
      hit = true;
      jolt(board, 0.3);
    }
    return t < 1.45;
  });
  beam.destroy();
  mark.destroy();
  await done();
}
