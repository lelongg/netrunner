import { ColorMatrixFilter, Container, Graphics, Sprite } from "pixi.js";
import { RGBSplitFilter, ShockwaveFilter } from "pixi-filters";
import { ease, filterPoint, layer, run, span } from "./stage";
import { type Board, type Ready, scene, shimmer } from "./kit";
import { type Pt, glyphTexture, lerp } from "./more";
import { band, keyed, ribbon } from "./revJ";
import { clip, copy, piece, pivot } from "./revK";

const circle = (c: Pt, r: number, n = 40): Pt[] => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * Math.PI * 2) * r, c[1] + Math.sin((i / n) * Math.PI * 2) * r]);

export async function anoeticVoid(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at, zoom } = await scene(rect, code, ready, board);
  const heads: [Pt, number][] = [
    [at(0.455, 0.165), unit * 0.048],
    [at(0.71, 0.16), unit * 0.066],
  ];
  const figure = at(0.452, 0.468);
  const feet = at(0.45, 0.508);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.025, wavelength: unit * 0.22, speed: unit * 1.1, brightness: 1.04, radius: unit * 0.7, time: 0 });
  const art = piece(root, card, [at(0, 0.105), at(1, 0.105), at(1, 0.53), at(0, 0.53)]);
  art.filters = [wave];
  const suns = heads.map(([c, r]) => {
    const box = piece(root, card, circle(c, r * 1.25));
    pivot(box, c);
    const glow = keyed(root, card, [0.25, 0.55, 0.2], 0.7, 4, 0xffe2a0);
    clip(root, glow, circle(c, r * 1.3));
    root.setChildIndex(glow, root.getChildIndex(box) + 1);
    return { box, glow };
  });
  root.setChildIndex(art, root.getChildIndex(card) + 1);
  const g = new Graphics();
  layer(root, false).addChild(g);
  await run(app, (t) => {
    const fade = 1 - span(t, 1.3, 1.65);
    heads.forEach(([c, r], i) => {
      const d = i * 0.08;
      const pre = ease.inOut(span(t, d, 0.3 + d));
      const pop = ease.back(span(t, 0.3 + d, 0.6 + d));
      const rest = ease.inOut(span(t, 1.1, 1.6));
      const s = 1 + 0.3 * pop * (1 - rest);
      suns[i].box.scale.set(s);
      suns[i].glow.alpha = (0.25 * pre + 0.6 * pop) * fade;
      const ring = span(t, 0.38 + d, 0.95 + d);
      if (ring > 0 && ring < 1) g.circle(...c, r * (1.3 + 1.6 * ease.out(ring))).stroke({ width: 1.4 * (1 - ring) + 0.5, color: 0xffc27a, alpha: 0.7 * (1 - ring) });
    });
    zoom(1 + 0.012 * Math.max(0, 1 - Math.abs(t - 0.42) / 0.12));
    const fp = filterPoint(art, ...heads[1][0]);
    wave.center = { x: fp.x, y: fp.y };
    wave.time = Math.max(0, t - 0.42);
    wave.amplitude = unit * 0.025 * (1 - span(t, 0.5, 1.1));
    g.clear();
    const gaze = ease.inOut(span(t, 0.7, 1.05));
    if (gaze > 0) {
      for (const [c, r] of heads) {
        const from: Pt = lerp(c, figure, r / Math.hypot(figure[0] - c[0], figure[1] - c[1]));
        const to = lerp(from, figure, gaze);
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l;
        const ny = dx / l;
        const w0 = r * 0.45;
        const w1 = unit * (0.012 + 0.05 * gaze);
        g.poly([from[0] + nx * w0, from[1] + ny * w0, to[0] + nx * w1, to[1] + ny * w1, to[0] - nx * w1, to[1] - ny * w1, from[0] - nx * w0, from[1] - ny * w0]).fill({ color: 0xffb46a, alpha: 0.22 * fade });
        const pts = Array.from({ length: 16 }, (_, j) => lerp(from, to, j / 15));
        ribbon(g, pts, unit * 0.005, 0xffe2b0, 0.55 * fade);
      }
    }
    const hit = span(t, 1.02, 1.5);
    if (hit > 0 && hit < 1) {
      g.ellipse(...feet, unit * (0.03 + 0.09 * ease.out(hit)), unit * (0.012 + 0.03 * ease.out(hit))).stroke({ width: 1.3, color: 0xffd8a0, alpha: 0.85 * (1 - hit) });
    }
    return t < 1.65;
  });
  zoom(1);
  for (const s of suns) s.glow.destroy();
  await done();
}

export async function hedgeFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const frame: Pt[] = [at(0.235, 0.08), at(1, 0.08), at(1, 0.535), at(0, 0.535), at(0, 0.17), at(0.12, 0.172), at(0.205, 0.14)];
  const tablet: Pt[] = [at(0.382, 0.2835), at(0.465, 0.297), at(0.416, 0.42), at(0.337, 0.393)];
  const focus = at(0.4, 0.35);
  const crowd = piece(root, card, frame);
  pivot(crowd, focus);
  const near = [
    { poly: [at(0, 0.22), at(0.26, 0.22), at(0.31, 0.535), at(0, 0.535)], c: at(0.14, 0.38) },
    { poly: [at(0.85, 0.27), at(1, 0.27), at(1, 0.535), at(0.83, 0.535)], c: at(0.93, 0.4) },
  ].map(({ poly, c }) => {
    const p = piece(root, card, poly);
    root.setChildIndex(p, root.getChildIndex(crowd) + 1);
    pivot(p, c);
    clip(root, p, frame);
    return { p, c };
  });
  clip(root, crowd, frame);
  const gold = glowPiece(root, card, tablet, [0.3, 0.35, 0.35], 0.55, 2.5, 0xffc860);
  root.setChildIndex(gold, root.getChildIndex(near[1].p) + 1);
  gold.alpha = 0;
  const sheen = new Graphics();
  root.addChild(sheen);
  const shine = glowPiece(root, card, tablet, [0.3, 0.35, 0.35], 0.4, 3, 0xfff0c0);
  root.setChildIndex(shine, root.getChildIndex(gold) + 1);
  shine.mask = sheen;
  const top = layer(root, false);
  const coin = new Sprite(glyphTexture());
  coin.anchor.set(0.5);
  coin.tint = 0xffd27a;
  coin.alpha = 0;
  coin.rotation = Math.atan2(tablet[1][1] - tablet[0][1], tablet[1][0] - tablet[0][0]);
  coin.position.set(...lerp(lerp(tablet[0], tablet[2], 0.5), lerp(tablet[1], tablet[3], 0.5), 0.5));
  top.addChild(coin);
  await run(app, (t) => {
    const push = ease.back(span(t, 0.1, 0.55));
    const back = ease.inOut(span(t, 1.05, 1.5));
    const k = push * (1 - back);
    crowd.scale.set(1 + 0.1 * k);
    for (const n of near) {
      n.p.scale.set(1 + 0.2 * k);
      const away = (n.c[0] - focus[0]) * 0.08 * k;
      n.p.position.set(n.c[0] + away, n.c[1]);
    }
    const lit = span(t, 0.35, 0.6) * (1 - span(t, 1.1, 1.5));
    gold.alpha = 0.55 * lit;
    gold.scale.set(1 + 0.1 * k);
    gold.pivot.set(...focus);
    gold.position.set(...focus);
    const sw = span(t, 0.45, 0.85);
    sheen.clear();
    if (sw > 0 && sw < 1) band(sheen, at, sw, 0.025, 0.06, [0.33, 0.28, 0.47, 0.43]);
    shine.alpha = 0.8;
    shine.scale.set(1 + 0.1 * k);
    shine.pivot.set(...focus);
    shine.position.set(...focus);
    sheen.scale.set(1 + 0.1 * k);
    sheen.pivot.set(...focus);
    sheen.position.set(...focus);
    const pop = ease.back(span(t, 0.55, 0.8));
    coin.alpha = 0.9 * Math.min(1, pop * 1.4) * (1 - span(t, 1.05, 1.4));
    coin.scale.set((unit / 48) * 0.17 * (0.5 + 0.5 * pop) * (1 + 0.1 * k));
    return t < 1.5;
  });
  await done();
}

export async function betaBuild(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const rail = [at(0.29, 0.372), at(0.61, 0.282)];
  const muzzle = at(0.628, 0.278);
  const dir = Math.atan2(rail[1][1] - rail[0][1], rail[1][0] - rail[0][0]);
  const ux = Math.cos(dir);
  const uy = Math.sin(dir);
  const rifle = glowPiece(root, card, [at(0.2, 0.43), at(0.6, 0.262), at(0.648, 0.284), at(0.6, 0.33), at(0.5, 0.405), at(0.3, 0.475), at(0.2, 0.475)], [-0.5, 1, -0.3], 0.18, 2.6, 0x7dffa0);
  rifle.alpha = 0;
  const visor = glowPiece(root, card, [at(0.36, 0.158), at(0.44, 0.128), at(0.505, 0.158), at(0.512, 0.232), at(0.47, 0.258), at(0.37, 0.242)], [-0.6, 1, -0.5], 0.08, 3, 0x8dffa8);
  visor.alpha = 0;
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const g = new Graphics();
  layer(root, false).addChild(g);
  const shots = [0.32, 0.5, 0.68];
  const power = [1, 0.75, 0.55];
  const reach = unit * 2.4;
  let buzzed = 0;
  await run(app, (t) => {
    const charge = span(t, 0, 0.3);
    let kick = 0;
    let jolt = 0;
    shots.forEach((s, i) => {
      const a = t - s;
      if (a > 0) {
        kick += power[i] * Math.exp(-a * 16) * Math.sin(Math.min(1, a * 14) * Math.PI * 0.5);
        jolt = Math.max(jolt, power[i] * Math.exp(-a * 30));
      }
    });
    const pull = 0.25 * Math.sin(Math.PI * charge) * (t < shots[0] ? 1 : 0);
    const back = unit * 0.045 * (kick + pull);
    root.position.x -= ux * back;
    root.position.y -= uy * back;
    root.rotation = -0.02 * kick;
    root.scale.set(root.scale.x * (1 + 0.025 * jolt));
    root.filters = jolt > 0.15 ? [split] : [];
    split.red = { x: unit * 0.012 * jolt, y: 0 };
    split.blue = { x: -unit * 0.012 * jolt, y: unit * 0.004 * jolt };
    rifle.alpha = 0.55 * charge * (1 - span(t, 0.95, 1.3)) + 0.35 * jolt;
    visor.alpha = 0.8 * span(t, 0.75, 0.95) * (1 - span(t, 1.15, 1.45));
    g.clear();
    shots.forEach((s, i) => {
      const a = t - s;
      if (a < 0 || a > 0.3) return;
      const k = a / 0.3;
      const head = reach * ease.out(Math.min(1, a / 0.12));
      const tail = reach * ease.out(Math.max(0, (a - 0.04) / 0.16));
      const pts: Pt[] = Array.from({ length: 8 }, (_, n) => {
        const d = tail + ((head - tail) * n) / 7;
        return [muzzle[0] + ux * d, muzzle[1] + uy * d];
      });
      ribbon(g, pts, unit * 0.022 * power[i], 0x3dff7a, 0.45 * (1 - k));
      ribbon(g, pts, unit * 0.007 * power[i], 0xd8ffe2, 0.9 * (1 - k));
      const r = unit * (0.03 + 0.09 * ease.out(Math.min(1, a / 0.2)));
      g.ellipse(muzzle[0], muzzle[1], r, r * 0.55).stroke({ width: 1.5, color: 0x7dffa0, alpha: 0.85 * (1 - Math.min(1, a / 0.2)) });
      if (a < 0.06) {
        const f = 1 - a / 0.06;
        for (const side of [-1, 1]) {
          const px = -uy * side;
          const py = ux * side;
          g.poly([muzzle[0], muzzle[1], muzzle[0] + (ux * 0.9 + px * 0.5) * unit * 0.08 * f, muzzle[1] + (uy * 0.9 + py * 0.5) * unit * 0.08 * f, muzzle[0] + ux * unit * 0.14 * f, muzzle[1] + uy * unit * 0.14 * f]).fill({ color: 0x9dffb8, alpha: 0.8 * f });
        }
      }
      if (buzzed <= i) {
        buzzed = i + 1;
        navigator.vibrate?.(15);
      }
    });
    return t < 1.45;
  });
  root.rotation = 0;
  root.filters = [];
  await done();
}

export async function risingTide(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, card, world, done, unit, at } = sc;
  const flood = copy(card);
  root.addChildAt(flood, root.getChildIndex(card) + 1);
  const fm = new Graphics();
  root.addChild(fm);
  flood.mask = fm;
  const roil = shimmer(root, flood, rect, unit * 0.12);
  const light = keyed(root, card, [-0.25, 0.3, 0.7], 0.25, 2.2, 0x7fd4ff);
  const lm = new Graphics();
  root.addChild(lm);
  light.mask = lm;
  const g = new Graphics();
  layer(root, false).addChild(g);
  const ice = board?.strike ?? null;
  const w = new Graphics();
  world.addChild(w);
  const surge = ice ? 0.95 : 1.15;
  let crashed = false;
  const edge = (v: number, t: number, amp: number): Pt[] => Array.from({ length: 33 }, (_, i) => at(i / 32, v + amp * Math.sin((i / 32) * 13 + t * 7) + amp * 0.5 * Math.sin((i / 32) * 29 - t * 11)));
  await run(app, (t) => {
    const rise = ease.back(span(t, 0.05, 0.8));
    const out = ice ? ease.inOut(span(t, 0.8, surge)) : ease.inOut(span(t, 1.15, 1.5));
    const v = ice ? 0.535 - 0.32 * rise - 0.3 * out : 0.535 - 0.32 * rise + 0.33 * out;
    const amp = 0.012 * (0.4 + 0.6 * Math.sin(Math.PI * span(t, 0.05, 1.2)));
    const line = edge(Math.max(0.07, v), t, amp);
    const below = [...line, at(1, 0.535), at(0, 0.535)];
    const shown = v < 0.53 && v > -0.2;
    for (const m of [fm, lm]) {
      m.clear();
      if (shown) m.poly(below.flat()).fill(0xffffff);
    }
    roil(t, 0.9 * Math.min(1, rise * 1.5));
    light.alpha = 0.42 * Math.min(1, rise * 1.5);
    g.clear();
    if (shown && v > 0.08) {
      g.poly(line.flat(), false).stroke({ width: unit * 0.02, color: 0x6fd0ff, alpha: 0.3 });
      g.poly(line.flat(), false).stroke({ width: 1.6, color: 0xe6f8ff, alpha: 0.85 });
    }
    w.clear();
    if (ice) {
      const r = ice;
      const k = ease.out(span(t, surge - 0.05, surge + 0.25));
      const back = ease.inOut(span(t, surge + 0.4, surge + 0.7));
      const lvl = r.bottom - r.height * (1.05 * k - 1.05 * back);
      if (k > 0 && back < 1) {
        const pts: number[] = [];
        for (let i = 0; i <= 24; i++) {
          const x = r.left + (r.width * i) / 24;
          pts.push(x, lvl + unit * 0.025 * Math.sin(i * 0.9 + t * 9) * (1 - back));
        }
        w.poly([...pts, r.right, r.bottom, r.left, r.bottom]).fill({ color: 0x2f9ad8, alpha: 0.35 * (1 - back) });
        w.poly(pts, false).stroke({ width: 1.8, color: 0xe6f8ff, alpha: 0.9 * (1 - back) });
      }
      const crash = span(t, surge + 0.2, surge + 0.55);
      if (crash > 0 && crash < 1) {
        const top = r.top;
        for (let i = 0; i < 5; i++) {
          const x = r.left + r.width * (0.1 + 0.2 * i);
          const hgt = unit * (0.18 + 0.08 * (i % 2)) * Math.sin(Math.PI * crash);
          const lean = (i - 2) * unit * 0.04 * crash;
          w.moveTo(x, top).quadraticCurveTo(x + lean * 0.5, top - hgt, x + lean, top - hgt * 0.4);
        }
        w.stroke({ width: 1.6, color: 0xd8f4ff, alpha: 0.85 * (1 - crash), cap: "round" });
      }
      if (!crashed && t > surge + 0.2) {
        crashed = true;
        navigator.vibrate?.(30);
      }
    }
    return t < (ice ? surge + 0.75 : 1.5);
  });
  flood.destroy();
  light.destroy();
  w.destroy();
  await done();
}

function glowPiece(root: Container, card: Sprite, poly: Pt[], weights: [number, number, number], threshold: number, gain: number, tint: number) {
  const box = new Container();
  const s = keyed(root, card, weights, threshold, gain, tint);
  root.removeChild(s);
  const m = new Graphics().poly(poly.flat()).fill(0xffffff);
  box.addChild(s, m);
  s.mask = m;
  s.alpha = 1;
  root.addChildAt(box, root.getChildIndex(card) + 1);
  return box;
}

function hitRay(o: Pt, a: number, poly: Pt[]): Pt {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const ex = x2 - x1;
    const ey = y2 - y1;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((x1 - o[0]) * ey - (y1 - o[1]) * ex) / den;
    const u = ((x1 - o[0]) * dy - (y1 - o[1]) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return [o[0] + dx * best, o[1] + dy * best];
}

type Shard = { poly: Pt[]; c: Pt; box: Container; hole: Container | null; vx: number; vy: number; spin: number; delay: number; drop: boolean };

function shatter(root: Container, card: Sprite, pane: Pt[], o: Pt, unit: number) {
  const n = 11;
  const jit = [0.1, -0.2, 0.15, -0.05, 0.25, -0.15, 0.05, -0.25, 0.2, -0.1, 0.0];
  const ring = [0.32, 0.4, 0.28, 0.44, 0.35, 0.26, 0.42, 0.33, 0.38, 0.3, 0.36];
  const ring2 = [0.72, 0.8, 0.68, 0.84, 0.75, 0.7, 0.82, 0.74, 0.78, 0.69, 0.77];
  const reach = [1, 0.7, 0.95, 0.6, 1, 0.8, 0.65, 1, 0.75, 0.9, 0.62];
  const rays = Array.from({ length: n }, (_, i) => {
    const a = ((i + jit[i] * 0.8) / n) * Math.PI * 2 - Math.PI / 2;
    const h = hitRay(o, a, pane);
    return { a, h, m: lerp(o, h, ring[i]), q: lerp(o, h, ring2[i]), reach: reach[i] };
  });
  const angleOf = (p: Pt) => Math.atan2(p[1] - o[1], p[0] - o[0]);
  const norm = (a: number, from: number) => {
    let d = a - from;
    while (d < 0) d += Math.PI * 2;
    while (d >= Math.PI * 2) d -= Math.PI * 2;
    return d;
  };
  const shards: Shard[] = [];
  const make = (poly: Pt[], drop: boolean, delay: number) => {
    const c = poly.reduce<Pt>((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
    const hole = drop ? piece(root, card, poly) : null;
    if (hole) {
      const cm = new ColorMatrixFilter();
      cm.brightness(0.55, false);
      hole.filters = [cm];
      hole.alpha = 0;
    }
    const box = piece(root, card, poly);
    if (drop) box.addChild(new Graphics().poly(poly.flat()).stroke({ width: 1, color: 0xf2e4f4, alpha: 0.7 }));
    pivot(box, c);
    const out = Math.atan2(c[1] - o[1], c[0] - o[0]);
    shards.push({ poly, c, box, hole, vx: Math.cos(out) * unit * 0.25, vy: -unit * 0.2 + Math.sin(out) * unit * 0.15, spin: (shards.length % 2 ? 1 : -1) * (2 + (shards.length % 3)), delay, drop });
  };
  rays.forEach((r, i) => {
    const nx = rays[(i + 1) % n];
    const span2 = norm(nx.a, r.a);
    const corners = pane.filter((p) => norm(angleOf(p), r.a) > 0 && norm(angleOf(p), r.a) < span2).sort((p, q) => norm(angleOf(p), r.a) - norm(angleOf(q), r.a));
    make([r.q, r.h, ...corners, nx.h, nx.q], false, 0);
    make([r.m, r.q, nx.q, nx.m], i % 3 !== 1, 0.03 * (i % 4));
    make([o, r.m, nx.m], false, 0);
  });
  return { shards, rays };
}

const ART: [number, number][] = [
  [0, 0.07],
  [1, 0.07],
  [1, 0.535],
  [0, 0.535],
];

export async function retribution(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, done, unit, at } = await scene(rect, code, ready, board);
  const grip = at(0.82, 0.315);
  const tip = at(0.863, 0.158);
  const dx = tip[0] - grip[0];
  const dy = tip[1] - grip[1];
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * unit * 0.022;
  const ny = (dx / len) * unit * 0.022;
  const bat: Pt[] = [
    [grip[0] + nx, grip[1] + ny],
    [tip[0] + nx * 1.3 + dx * 0.04, tip[1] + ny * 1.3 + dy * 0.04],
    [tip[0] - nx * 1.3 + dx * 0.04, tip[1] - ny * 1.3 + dy * 0.04],
    [grip[0] - nx, grip[1] - ny],
  ];
  const debris = piece(root, card, [at(0.52, 0.375), at(0.99, 0.355), at(0.99, 0.5), at(0.52, 0.5)]);
  const hit = at(0.672, 0.432);
  pivot(debris, hit);
  const ghosts = [0, 1, 2, 3, 4].map((i) => {
    const b = glowPiece(root, card, bat, [-0.6, 0.1, 1], 0.32, 3, 0x8fb0ff);
    pivot(b, grip);
    b.alpha = 0;
    return { b, lag: i * 0.022, k: 1 - i * 0.2 };
  });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const g = new Graphics();
  layer(root, false).addChild(g);
  const pane: Pt[] = [at(0.22, 0.165), at(0.44, 0.165), at(0.44, 0.292), at(0.1, 0.292), at(0.1, 0.19), at(0.18, 0.185)];
  const crackAt = at(0.33, 0.235);
  const { shards, rays } = shatter(root, card, pane, crackAt, unit);
  for (const sh of shards)
    if (sh.drop)
      clip(
        root,
        sh.box,
        ART.map(([u, v]) => at(u, v)),
      );
  const cracks = new Graphics();
  layer(root, false).addChild(cracks);
  const angle = (t: number) => (t < 0.32 ? 0.35 * ease.inOut(span(t, 0, 0.32)) : 0.35 - 2.95 * Math.pow(span(t, 0.32, 0.48), 2.2));
  const strike = 0.48;
  await run(app, (t) => {
    const out = 1 - span(t, 0.75, 1.05);
    for (const gh of ghosts) {
      gh.b.rotation = angle(Math.max(0, t - gh.lag));
      const moving = t > 0.32 && t < strike + 0.15;
      gh.b.alpha = (gh.lag === 0 ? 0.25 + 0.5 * span(t, 0.05, 0.3) : moving ? 0.6 * gh.k : 0) * out;
    }
    const after = t - strike;
    const shock = after > 0 ? Math.exp(-after * 9) : 0;
    root.rotation = after > 0 ? 0.008 * Math.sin(after * 70) * shock : 0;
    debris.scale.set(1 + (after > 0 ? 0.07 * Math.sin(Math.min(1, after / 0.35) * Math.PI) * Math.max(0, 1 - after) : 0));
    debris.position.set(hit[0], hit[1] - (after > 0 ? unit * 0.02 * Math.sin(Math.min(1, after / 0.3) * Math.PI) : 0));
    root.filters = after > 0 && after < 0.08 ? [split] : [];
    split.red = { x: unit * 0.008 * shock, y: 0 };
    split.blue = { x: -unit * 0.008 * shock, y: 0 };
    g.clear();
    const sw = span(t, 0.36, strike + 0.25);
    if (sw > 0 && sw < 1) {
      const a0 = Math.atan2(dy, dx) + 0.35;
      const a1 = Math.atan2(dy, dx) + angle(Math.min(t, strike));
      const r = len * 1.02;
      const pts: Pt[] = Array.from({ length: 20 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / 19;
        return [grip[0] + Math.cos(a) * r, grip[1] + Math.sin(a) * r];
      });
      ribbon(g, pts, unit * 0.03, 0x8fb0ff, 0.3 * (1 - sw));
      ribbon(g, pts, unit * 0.008, 0xe0eaff, 0.75 * (1 - sw));
    }
    if (after > 0 && after < 0.45) {
      const k = after / 0.45;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
        const r0 = unit * (0.04 + 0.1 * ease.out(k));
        const r1 = r0 + unit * 0.06 * (1 - k);
        g.moveTo(hit[0] + Math.cos(a) * r0, hit[1] + Math.sin(a) * r0).lineTo(hit[0] + Math.cos(a) * r1, hit[1] + Math.sin(a) * r1);
      }
      g.stroke({ width: 1.6, color: 0xffd6e4, alpha: 0.9 * (1 - k), cap: "round" });
    }
    const ck = span(t, strike, strike + 0.14);
    const fall = Math.max(0, t - strike - 0.12);
    for (const sh of shards) {
      if (ck > 0 && !sh.drop) {
        const off = unit * 0.006 * Math.sin(sh.c[0] * 0.37 + sh.c[1] * 0.11);
        sh.box.position.set(sh.c[0] + off, sh.c[1] - off * 0.5);
      }
      if (!sh.drop) continue;
      const ft = Math.max(0, fall - sh.delay);
      if (sh.hole) sh.hole.alpha = ft > 0 ? 1 : 0;
      sh.box.position.set(sh.c[0] + sh.vx * ft, sh.c[1] + sh.vy * ft + 0.5 * unit * 3.2 * ft * ft);
      sh.box.rotation = sh.spin * ft;
      sh.box.alpha = 1 - span(ft, 0.45, 0.7);
    }
    cracks.clear();
    const cf = 1 - span(t, 1.15, 1.45);
    if (ck > 0 && cf > 0) {
      const draw = (w: number, color: number, alpha: number) => {
        for (const r of rays) cracks.moveTo(...crackAt).lineTo(...lerp(crackAt, r.h, ck * r.reach));
        rays.forEach((r, i) => {
          if (ck >= 1 && i % 2 === 0) cracks.moveTo(...r.m).lineTo(...rays[(i + 1) % rays.length].m);
          if (ck >= 1 && i % 3 !== 1) cracks.moveTo(...r.q).lineTo(...rays[(i + 1) % rays.length].q);
        });
        cracks.stroke({ width: w, color, alpha });
      };
      draw(1.8, 0x2a1830, 0.35 * cf);
      draw(0.8, 0xf2e4f4, 0.65 * cf);
    }
    return t < 1.5;
  });
  root.rotation = 0;
  root.filters = [];
  await done();
}
