import { Graphics } from "pixi.js";
import { GlitchFilter, GlowFilter, MotionBlurFilter, RGBSplitFilter, ShockwaveFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, Fire, Smoke, CREDIT, CYAN, GOLD, RED, type Ready, VIOLET, WHITE, burst, flyHome, homing, painted, pt, scene, shimmer } from "./kit";
import { type Pt, glowSprite, lerp, pose, prism, rnd, shardTexture, strikeFx, tether } from "./more";

const ORANGE = 0xff8a2a;
const PINK = 0xff4f9a;

const sealTexture = () =>
  painted("seal", 96, 96, (g) => {
    g.strokeStyle = "#fff";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(48, 48, 42, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.arc(48, 48, 33, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath();
      g.moveTo(48 + Math.cos(a) * 35, 48 + Math.sin(a) * 35);
      g.lineTo(48 + Math.cos(a) * 40, 48 + Math.sin(a) * 40);
      g.stroke();
    }
    g.fillStyle = "#fff";
    g.font = "40px anr-icon";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(CREDIT, 48, 50);
  });

const crowTexture = () =>
  painted("crow", 48, 28, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(24, 14);
    g.quadraticCurveTo(12, 0, 0, 6);
    g.quadraticCurveTo(12, 8, 22, 20);
    g.lineTo(26, 20);
    g.quadraticCurveTo(36, 8, 48, 6);
    g.quadraticCurveTo(36, 0, 24, 14);
    g.fill();
  });

const footTexture = () =>
  painted("foot", 20, 32, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(10, 20, 7, 11, 0, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(4 + i * 4, 5, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  });

const stoneTexture = () =>
  painted("stone", 64, 64, (g) => {
    const r = g.createRadialGradient(24, 22, 3, 32, 32, 30);
    r.addColorStop(0, "#ffffff");
    r.addColorStop(0.7, "#e6e8ee");
    r.addColorStop(1, "#9aa0ad");
    g.fillStyle = r;
    g.beginPath();
    g.ellipse(32, 32, 30, 26, 0, 0, Math.PI * 2);
    g.fill();
  });

export async function governmentSubsidy(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hand = at(0.38, 0.32);
  const seal = glowSprite(fx, sealTexture(), GOLD);
  seal.position.set(...hand);
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  const motes = new Emitter(fx);
  root.addChild(fx);
  let stamped = false;
  await run(app, (t, dt) => {
    const drop = ease.inOut(span(t, 0.05, 0.4));
    seal.alpha = Math.min(1, drop * 2) * (1 - span(t, 1.1, 1.5));
    seal.scale.set((unit / 96) * (0.9 - 0.45 * drop));
    seal.rotation = (1 - drop) * 0.6;
    if (drop >= 1 && !stamped) {
      stamped = true;
      burst(motes, ...hand, 22, GOLD, unit * 1.3, { life: 0.6, scale: 0.35 });
      navigator.vibrate?.(30);
    }
    rings.clear();
    const k = span(t, 0.4, 1);
    if (k > 0 && k < 1) rings.circle(...hand, unit * (0.18 + 0.2 * ease.out(k))).stroke({ width: unit * 0.02 * (1 - k) + 1, color: GOLD, alpha: 1 - k });
    if (t > 0.4 && t < 1.2 && Math.random() < 0.4) motes.add(sparkTexture(), ...at(rnd(0.05, 0.95), rnd(0.12, 0.48)), { vy: -unit * 0.1, life: 0.6, tint: 0xfff0b0, scale: 0.18 * (unit / 180), grow: -0.2 });
    motes.step(dt);
    return t < 1.7 || motes.list.length > 0;
  });
  await done();
}

export async function verbalPlasticity(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const tip = at(0.53, 0.2);
  const end = at(0.95, 0.2);
  const helix = new Graphics();
  helix.blendMode = "add";
  fx.addChild(helix);
  const touch = glowSprite(fx, glowTexture(), CYAN);
  touch.position.set(...tip);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = ease.out(span(t, 0.1, 0.9));
    const fade = 1 - span(t, 1.4, 1.8);
    helix.clear();
    const n = 40;
    const amp = unit * 0.06;
    for (const ph of [0, Math.PI]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= n * k; i++) {
        const u = i / n;
        const [x, y] = lerp(tip, end, u);
        pts.push([x, y + Math.sin(u * 14 + ph - t * 6) * amp * Math.min(1, u * 4)]);
      }
      if (pts.length < 2) continue;
      helix.moveTo(...pts[0]);
      for (const p of pts.slice(1)) helix.lineTo(...p);
      helix.stroke({ width: unit * 0.008, color: ph ? 0x9be8ff : WHITE, alpha: 0.85 * fade });
    }
    for (let i = 2; i <= n * k; i += 3) {
      const u = i / n;
      const [x, y] = lerp(tip, end, u);
      const a = Math.sin(u * 14 - t * 6) * amp * Math.min(1, u * 4);
      helix
        .moveTo(x, y + a)
        .lineTo(x, y - a)
        .stroke({ width: 1, color: CYAN, alpha: 0.5 * fade });
    }
    touch.alpha = 0.8 * Math.sin(Math.PI * span(t, 0, 0.6)) + 0.2 * fade;
    touch.scale.set((unit / 128) * 0.14);
    if (k < 1 && Math.random() < 0.5) motes.add(sparkTexture(), ...lerp(tip, end, k), { vx: rnd(-10, 10), vy: rnd(-10, 10), life: 0.4, tint: CYAN, scale: 0.2 * (unit / 180), grow: -0.3 });
    motes.step(dt);
    return t < 1.8 || motes.list.length > 0;
  });
  await done();
}

export async function anthillExcavation(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const pit = at(0.3, 0.42);
  const drill = at(0.55, 0.48);
  const dust = new Smoke(fx);
  const sparks = new Emitter(fx);
  const lamps = [at(0.47, 0.34), at(0.31, 0.4), at(0.45, 0.45), at(0.09, 0.4)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xffc94a);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  const base = card.position.clone();
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.2) * (1 - span(t, 1.6, 2));
    if (t < 1.5 && Math.random() < 0.7) {
      const a = rnd(0, Math.PI * 2);
      const r = unit * rnd(0.25, 0.4);
      dust.puff(pit[0] + Math.cos(a) * r, pit[1] + Math.sin(a) * r * 0.5, { vx: -Math.sin(a) * unit * 0.4 - Math.cos(a) * unit * 0.25, vy: Math.cos(a) * unit * 0.2 - Math.sin(a) * unit * 0.12, life: 1.2, size: unit * rnd(0.1, 0.16), grow: 1.8, tint: 0xe0d6c4, alpha: 0.7 });
    }
    if (t > 0.2 && t < 1.5 && Math.random() < 0.7) sparks.add(sparkTexture(), drill[0] + rnd(-4, 4), drill[1] + rnd(-4, 4), { vx: rnd(-1, 1) * unit * 0.7, vy: -unit * rnd(0.2, 0.7), gravity: unit * 1.6, life: 0.35, tint: Math.random() < 0.5 ? 0xffe0a0 : ORANGE, scale: 0.3 * (unit / 180) });
    lamps.forEach((l, i) => {
      l.alpha = on * (0.55 + 0.45 * Math.sin(t * 7 + i * 1.7));
      l.scale.set((unit / 128) * 0.12);
    });
    const r = t > 0.2 && t < 1.5 ? unit * 0.003 : 0;
    card.position.set(base.x + rnd(-1, 1) * r, base.y + rnd(-1, 1) * r);
    dust.step(dt);
    sparks.step(dt);
    return t < 2 || dust.list.length > 0;
  });
  card.position.copyFrom(base);
  await done();
}

export async function tungstenTailor(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.85, 0.167);
  const butt = at(0.22, 0.315);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glint = glowSprite(fx, sparkTexture(), WHITE);
  const stitchesFrom = at(0.12, 0.44);
  const stitchesTo = at(0.62, 0.44);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const run1 = span(t, 0.05, 0.5);
    const [gx, gy] = lerp(butt, eye, run1);
    glint.position.set(gx, gy);
    glint.alpha = Math.sin(Math.PI * run1);
    glint.rotation = t * 4;
    glint.scale.set((unit / 120) * 0.35);
    const k = span(t, 0.5, 1.4);
    const fade = 1 - span(t, 1.6, 2);
    const n = 7;
    const shown = n * k;
    const pts: Pt[] = [eye];
    for (let i = 0; i <= shown; i++) {
      const [x, y] = lerp(stitchesFrom, stitchesTo, i / n);
      pts.push([x, y + (i % 2 ? -1 : 1) * unit * 0.04]);
    }
    if (pts.length > 1) {
      g.moveTo(...pts[0]);
      g.quadraticCurveTo(eye[0] - unit * 0.1, eye[1] + unit * 0.25, ...pts[1]);
      for (const p of pts.slice(2)) g.lineTo(...p);
      g.stroke({ width: unit * 0.012, color: 0xff5a4a, alpha: 0.9 * fade, join: "round", cap: "round" });
      for (const p of pts.slice(1)) g.circle(...p, unit * 0.008).fill({ color: WHITE, alpha: 0.8 * fade });
    }
    return t < 2;
  });
  await done();
}

export async function byte(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, zoom } = await scene(rect, code, ready, board);
  const maw = at(0.42, 0.3);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const bolts = new Graphics();
  bolts.blendMode = "add";
  fx.addChild(bolts);
  const flash = glowSprite(fx, glowTexture(), PINK);
  flash.position.set(...maw);
  root.addChild(fx);
  let next = 0;
  await run(app, (t) => {
    const snap = ease.back(span(t, 0.15, 0.4));
    zoom(1 + 0.08 * snap - 0.08 * span(t, 0.6, 1));
    const k = 1 - span(t, 0.3, 0.9);
    split.red = { x: -8 * k * snap, y: 0 };
    split.blue = { x: 8 * k * snap, y: 0 };
    if (t > next) {
      next = t + rnd(0.04, 0.09);
      bolts.clear();
      if (t < 1.1)
        for (let i = 0; i < 3; i++) {
          const a = rnd(-0.4, 0.4) + (i % 2 ? Math.PI * 0.75 : -Math.PI * 0.25);
          const r1 = unit * 0.12;
          const r2 = unit * rnd(0.35, 0.55);
          lightning(bolts, maw[0] + Math.cos(a) * r1, maw[1] + Math.sin(a) * r1 * 0.6, maw[0] + Math.cos(a) * r2, maw[1] + Math.sin(a) * r2 * 0.6, unit * 0.1, i % 2 ? CYAN : PINK, unit * 0.008);
        }
    }
    flash.alpha = Math.max(0, 1 - Math.abs(t - 0.3) / 0.25) * 0.8;
    flash.scale.set((unit / 128) * 0.6);
    if (snap > 0.9 && t < 0.45) navigator.vibrate?.(40);
    return t < 1.2;
  });
  await done();
}

export async function biggerPicture(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at, zoom } = await scene(rect, code, ready, board);
  const nodes: Pt[] = Array.from({ length: 14 }, () => [rnd(0.1, 0.9), rnd(0.12, 0.48)]);
  const net = new Graphics();
  net.blendMode = "add";
  fx.addChild(net);
  const pings = new Emitter(fx);
  root.addChild(fx);
  const links: [number, number, number][] = [];
  for (let i = 1; i < nodes.length; i++) links.push([Math.floor(rnd(0, i)), i, 0.15 + i * 0.07]);
  const lit = new Set<number>([0]);
  await run(app, (t, dt) => {
    zoom(1 - 0.05 * Math.sin(Math.PI * span(t, 0, 1.8)));
    const fade = 1 - span(t, 1.5, 1.9);
    net.clear();
    for (const [a, b, s] of links) {
      const k = ease.out(span(t, s, s + 0.25));
      if (k <= 0) continue;
      const pa = at(...nodes[a]);
      const pb = at(...nodes[b]);
      const corner: Pt = [pb[0], pa[1]];
      const head = k < 0.5 ? lerp(pa, corner, k * 2) : lerp(corner, pb, k * 2 - 1);
      net.moveTo(...pa).lineTo(...(k < 0.5 ? head : corner));
      if (k >= 0.5) net.lineTo(...head);
      net.stroke({ width: unit * 0.006, color: 0xffd84a, alpha: 0.85 * fade });
      if (k >= 1 && !lit.has(b)) {
        lit.add(b);
        pings.add(glowTexture(), ...pb, { life: 0.5, tint: 0xffe98a, scale: (unit / 128) * 0.05, grow: 0.3 });
      }
    }
    for (const i of lit) net.circle(...at(...nodes[i]), unit * 0.012).fill({ color: WHITE, alpha: fade });
    pings.step(dt);
    return t < 1.9 || pings.list.length > 0;
  });
  await done();
}

export async function topDownSolutions(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const heads: Pt[] = [
    [0.07, 0.24],
    [0.18, 0.23],
    [0.31, 0.25],
    [0.46, 0.235],
    [0.55, 0.24],
    [0.64, 0.245],
    [0.73, 0.25],
    [0.85, 0.24],
  ];
  const eyes = heads.map((h) => {
    const s = glowSprite(fx, glowTexture(), 0x9dff5a);
    s.position.set(...at(...h));
    return s;
  });
  const beams = new Graphics();
  beams.blendMode = "add";
  fx.addChild(beams);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const fade = 1 - span(t, 1.5, 1.9);
    beams.clear();
    heads.forEach(([u, v], i) => {
      const on = span(t, 0.1 + i * 0.07, 0.2 + i * 0.07);
      eyes[i].alpha = on * fade * 0.9;
      eyes[i].scale.set((unit / 128) * 0.06);
      const k = ease.out(span(t, 0.6 + i * 0.04, 1.0 + i * 0.04));
      if (k <= 0) return;
      const [x, y] = at(u, v - 0.04);
      const [x2, y2] = at(u, v - 0.04 - 0.1 * k);
      beams
        .moveTo(x, y)
        .lineTo(x2, y2)
        .stroke({ width: unit * 0.02, color: 0x9dff5a, alpha: 0.25 * fade });
      beams
        .moveTo(x, y)
        .lineTo(x2, y2)
        .stroke({ width: unit * 0.005, color: WHITE, alpha: 0.8 * fade });
      if (k < 1 && Math.random() < 0.3) motes.add(sparkTexture(), x2, y2, { vy: -unit * 0.3, life: 0.4, tint: 0x9dff5a, scale: 0.2 * (unit / 180), grow: -0.4 });
    });
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

export async function myoshu(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const place = at(0.4, 0.43);
  const from = at(0.38, 0.28);
  const stone = glowSprite(fx, stoneTexture(), WHITE);
  stone.blendMode = "normal";
  const halo = glowSprite(fx, glowTexture(), 0xfff6c8);
  const ripples = new Graphics();
  ripples.blendMode = "add";
  fx.addChild(ripples);
  const glints = new Emitter(fx);
  root.addChild(fx);
  let placed = false;
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0.1, 0.55));
    const [x, y] = lerp(from, place, k);
    stone.position.set(x, y);
    stone.alpha = span(t, 0, 0.1) * (1 - span(t, 1.5, 1.9));
    stone.scale.set((unit / 64) * 0.09 * (1.2 - 0.2 * k));
    halo.position.set(x, y);
    halo.alpha = 0.7 * stone.alpha;
    halo.scale.set((unit / 128) * 0.14);
    if (k >= 1 && !placed) {
      placed = true;
      navigator.vibrate?.(15);
      for (let i = 0; i < 10; i++) glints.add(sparkTexture(), ...at(rnd(0.05, 0.95), rnd(0.4, 0.55)), { life: rnd(0.3, 0.6), tint: WHITE, scale: 0.25 * (unit / 180), grow: -0.3 });
    }
    ripples.clear();
    for (let n = 0; n < 3; n++) {
      const r = span(t, 0.55 + n * 0.15, 1.35 + n * 0.15);
      if (r > 0 && r < 1) ripples.ellipse(...place, unit * (0.06 + 0.6 * ease.out(r)), unit * (0.02 + 0.16 * ease.out(r))).stroke({ width: unit * 0.008 * (1 - r) + 1, color: 0xfff6c8, alpha: 1 - r });
    }
    glints.step(dt);
    return t < 1.9 || glints.list.length > 0;
  });
  await done();
}

export async function reanimationProtocol(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const skull = at(0.52, 0.25);
  const glow = new GlowFilter({ color: 0x9dff3a, distance: 12, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const ecg = new Graphics();
  ecg.blendMode = "add";
  const bolts = new Graphics();
  bolts.blendMode = "add";
  fx.addChild(ecg, bolts);
  const core = glowSprite(fx, glowTexture(), 0x9dff3a);
  core.position.set(...skull);
  root.addChild(fx);
  const beats = [0.35, 0.75, 1.0];
  let next = 0;
  await run(app, (t) => {
    const pulse = beats.reduce((m, b) => Math.max(m, t > b ? Math.max(0, 1 - (t - b) / 0.2) : 0), 0);
    glow.outerStrength = 0.5 + 3 * pulse;
    core.alpha = 0.3 + 0.7 * pulse;
    core.scale.set((unit / 128) * (0.2 + 0.15 * pulse));
    ecg.clear();
    const head = span(t, 0.05, 1.4);
    const y0 = at(0, 0.45)[1];
    const x0 = at(0.04, 0.45)[0];
    const x1 = at(0.96, 0.45)[0];
    const pts: Pt[] = [];
    for (let i = 0; i <= 80 * head; i++) {
      const u = i / 80;
      const tt = 0.05 + u * 1.35;
      const spike = beats.reduce((m, b) => m + Math.max(0, 1 - Math.abs(tt - b) / 0.03) * (Math.abs(tt - b) < 0.015 ? -1 : 0.5), 0);
      pts.push([x0 + (x1 - x0) * u, y0 + spike * unit * 0.12]);
    }
    if (pts.length > 1) {
      ecg.moveTo(...pts[0]);
      for (const p of pts.slice(1)) ecg.lineTo(...p);
      ecg.stroke({ width: unit * 0.008, color: 0x9dff3a, alpha: 0.9 * (1 - span(t, 1.5, 1.9)) });
    }
    if (t > next) {
      next = t + 0.08;
      bolts.clear();
      if (pulse > 0.3)
        for (let i = 0; i < 2; i++) {
          const a = rnd(0, Math.PI * 2);
          lightning(bolts, skull[0] + Math.cos(a) * unit * 0.12, skull[1] + Math.sin(a) * unit * 0.12, skull[0] + Math.cos(a) * unit * 0.4, skull[1] + Math.sin(a) * unit * 0.35, unit * 0.12, PINK, unit * 0.007);
        }
    }
    return t < 1.9;
  });
  await done();
}

export async function manegarmSkunkworks(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const brain = at(0.58, 0.18);
  const orbits = new Graphics();
  orbits.blendMode = "add";
  fx.addChild(orbits);
  const core = glowSprite(fx, glowTexture(), 0xbfe6ff);
  core.position.set(...brain);
  const synapses = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.3) * (1 - span(t, 1.6, 2));
    orbits.clear();
    for (let i = 0; i < 3; i++) {
      const tilt = i * 1.05 + t * 0.6;
      const pts: number[] = [];
      for (let s = 0; s <= 40; s++) {
        const a = (s / 40) * Math.PI * 2 + t * (2 + i);
        const x = Math.cos(a) * unit * 0.22;
        const y = Math.sin(a) * unit * 0.07;
        pts.push(brain[0] + x * Math.cos(tilt) - y * Math.sin(tilt), brain[1] + x * Math.sin(tilt) * 0.5 + y * Math.cos(tilt));
      }
      orbits.poly(pts, false).stroke({ width: 1.2, color: 0xbfe6ff, alpha: 0.6 * on });
    }
    core.alpha = on * (0.4 + 0.2 * Math.sin(t * 9));
    core.scale.set((unit / 128) * 0.2);
    if (on > 0.5 && Math.random() < 0.5) {
      const a = rnd(0, Math.PI * 2);
      synapses.add(sparkTexture(), brain[0] + Math.cos(a) * unit * 0.08, brain[1] + Math.sin(a) * unit * 0.06, { vx: Math.cos(a) * unit * 0.2, vy: Math.sin(a) * unit * 0.2, life: 0.4, tint: Math.random() < 0.5 ? WHITE : VIOLET, scale: 0.22 * (unit / 180), grow: -0.4 });
    }
    synapses.step(dt);
    return t < 2 || synapses.list.length > 0;
  });
  await done();
}

export async function treadLightly(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.43, 0.31);
  const cone = new Graphics();
  cone.blendMode = "add";
  fx.addChild(cone);
  const steps = new Emitter(fx);
  const red = glowSprite(fx, glowTexture(), RED);
  red.position.set(...eye);
  root.addChild(fx);
  const path: Pt[] = [
    [0.1, 0.5],
    [0.17, 0.47],
    [0.24, 0.5],
    [0.31, 0.47],
    [0.38, 0.5],
    [0.45, 0.47],
  ];
  const placed = path.map(() => false);
  await run(app, (t, dt) => {
    card.tint = t < 1.7 ? 0xc8d4ff : WHITE;
    path.forEach((p, i) => {
      if (placed[i] || t < 0.15 + i * 0.18) return;
      placed[i] = true;
      steps.add(footTexture(), ...at(...p), { life: 0.9, tint: CYAN, scale: (unit / 180) * 0.35, alpha: 0.8 });
    });
    const sweep = Math.sin(t * 2.2) * 0.5;
    cone.clear();
    const on = span(t, 0.1, 0.4) * (1 - span(t, 1.5, 1.9));
    const a = Math.PI * 0.62 + sweep;
    const len = unit * 0.7;
    cone.poly([...eye, eye[0] + Math.cos(a - 0.18) * len, eye[1] + Math.sin(a - 0.18) * len, eye[0] + Math.cos(a + 0.18) * len, eye[1] + Math.sin(a + 0.18) * len]).fill({ color: RED, alpha: 0.12 * on });
    red.alpha = on * (0.6 + 0.4 * Math.sin(t * 12));
    red.scale.set((unit / 128) * 0.06);
    steps.step(dt);
    return t < 1.9 || steps.list.length > 0;
  });
  card.tint = WHITE;
  await done();
}

export async function selfModifyingCodePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.5, 0.33);
  const petals = new Graphics();
  petals.blendMode = "add";
  fx.addChild(petals);
  const motes = new Emitter(fx);
  root.addChild(fx);
  const hues = [0xffb070, 0xff6ad0, 0x8fd8ff];
  await run(app, (t, dt) => {
    petals.clear();
    for (let b = 0; b < 3; b++) {
      const k = Math.sin(Math.PI * span(t, b * 0.45, b * 0.45 + 0.8));
      if (k <= 0) continue;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + b * 0.4;
        const r = unit * (0.08 + 0.24 * k);
        const tipP: Pt = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.55];
        const l: Pt = [c[0] + Math.cos(a - 0.35) * r * 0.55, c[1] + Math.sin(a - 0.35) * r * 0.3];
        const rr: Pt = [c[0] + Math.cos(a + 0.35) * r * 0.55, c[1] + Math.sin(a + 0.35) * r * 0.3];
        petals
          .moveTo(...c)
          .quadraticCurveTo(...l, ...tipP)
          .quadraticCurveTo(...rr, ...c)
          .stroke({ width: 1.5, color: hues[b], alpha: 0.9 * k });
      }
    }
    if (t < 1.4 && Math.random() < 0.5) motes.add(sparkTexture(), c[0] + rnd(-1, 1) * unit * 0.2, c[1] + rnd(-1, 1) * unit * 0.1, { vy: -unit * rnd(0.1, 0.3), life: 0.7, tint: hues[Math.floor(rnd(0, 3))], scale: 0.2 * (unit / 180), grow: -0.2 });
    motes.step(dt);
    return t < 1.75 || motes.list.length > 0;
  });
  await done();
}

export async function selfModifyingCode(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.5, 0.33);
  const glitch = new GlitchFilter({ slices: 12, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [glitch];
  const rings = new Graphics();
  rings.blendMode = "add";
  fx.addChild(rings);
  const bits = new Emitter(fx);
  root.addChild(fx);
  burst(bits, ...c, 26, 0xff6ad0, unit * 1.2, { life: 0.6, scale: 0.3 });
  await run(app, (t, dt) => {
    glitch.offset = t < 0.5 && Math.random() < 0.5 ? unit * 0.05 : 0;
    glitch.seed = Math.random();
    rings.clear();
    const k = span(t, 0.1, 0.8);
    if (k > 0 && k < 1) rings.ellipse(...c, unit * (0.1 + 0.5 * ease.out(k)), unit * (0.05 + 0.25 * ease.out(k))).stroke({ width: unit * 0.015 * (1 - k) + 1, color: 0x8fd8ff, alpha: 1 - k });
    bits.step(dt);
    return t < 0.9 || bits.list.length > 0;
  });
  await done();
}

export async function azimatPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const face = at(0.62, 0.26);
  const halo = new Graphics();
  halo.blendMode = "add";
  fx.addChild(halo);
  const orbs = [at(0.38, 0.43), at(0.48, 0.46), at(0.24, 0.47)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x6affb8);
    s.position.set(...p);
    return s;
  });
  const embers = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const on = span(t, 0, 0.3) * (1 - span(t, 1.6, 2));
    halo.clear();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.8;
      const r = unit * 0.24;
      halo.circle(face[0] + Math.cos(a) * r, face[1] + Math.sin(a) * r * 0.9, unit * 0.012).fill({ color: i % 2 ? 0xff7a4a : 0x6affb8, alpha: on });
    }
    halo.circle(...face, unit * 0.24).stroke({ width: 1, color: 0x6affb8, alpha: 0.5 * on });
    orbs.forEach((o, i) => {
      o.alpha = on * (0.5 + 0.3 * Math.sin(t * 4 + i));
      o.scale.set((unit / 128) * 0.12);
    });
    if (on > 0 && Math.random() < 0.4) embers.add(sparkTexture(), face[0] + rnd(-1, 1) * unit * 0.3, face[1] + unit * 0.2, { vx: rnd(-10, 10), vy: -unit * 0.2, life: 0.8, tint: 0xff7a4a, scale: 0.2 * (unit / 180), grow: -0.2 });
    embers.step(dt);
    return t < 2 || embers.list.length > 0;
  });
  await done();
}

export async function azimat(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const face = at(0.62, 0.26);
  const orbs = [0, 1, 2].map(() => glowSprite(fx, glowTexture(), 0x6affb8));
  const trail = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    orbs.forEach((o, i) => {
      const a = t * 6 + (i * Math.PI * 2) / 3;
      const r = unit * 0.28 * (1 - 0.6 * span(t, 0.5, 1));
      o.position.set(face[0] + Math.cos(a) * r, face[1] + Math.sin(a) * r * 0.6);
      o.alpha = 1 - span(t, 0.9, 1.1);
      o.scale.set((unit / 128) * 0.1);
      if (t < 1 && Math.random() < 0.6) trail.add(sparkTexture(), o.x, o.y, { life: 0.3, tint: i ? 0x6affb8 : 0xff7a4a, scale: 0.2 * (unit / 180), grow: -0.4 });
    });
    trail.step(dt);
    return t < 1.1 || trail.list.length > 0;
  });
  await done();
}

export async function buzzsawPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hub = at(0.55, 0.31);
  const sparks = new Emitter(fx);
  const arcs = new Graphics();
  arcs.blendMode = "add";
  fx.addChild(arcs);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const spin = span(t, 0, 0.5);
    const on = 1 - span(t, 1.4, 1.8);
    arcs.clear();
    for (let i = 0; i < 3; i++) {
      const a = t * 18 * spin + (i * Math.PI * 2) / 3;
      arcs.arc(...hub, unit * 0.22, a, a + 1.2).stroke({ width: unit * 0.015, color: 0xffb347, alpha: 0.7 * spin * on });
    }
    if (spin > 0.3 && t < 1.4)
      for (let n = 0; n < 2; n++) {
        const a = rnd(Math.PI * 0.55, Math.PI * 1.05);
        const [x, y] = [hub[0] + Math.cos(a) * unit * 0.22, hub[1] + Math.sin(a) * unit * 0.22];
        sparks.add(sparkTexture(), x, y, { vx: -Math.sin(a) * unit * 1.6 + rnd(-30, 30), vy: Math.cos(a) * unit * 1.6, gravity: unit * 2.2, life: 0.4, tint: Math.random() < 0.5 ? 0xffe0a0 : ORANGE, scale: 0.25 * (unit / 180) });
      }
    sparks.step(dt);
    return t < 1.8 || sparks.list.length > 0;
  });
  await done();
}

export async function buzzsaw(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at } = sc;
  const hub = at(0.55, 0.31);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const impact = strikeFx(sc, "saw", ORANGE, hub);
  await run(
    app,
    (t, dt) => {
      if (t < 0.6)
        for (let n = 0; n < 3; n++) {
          const a = rnd(0, Math.PI * 2);
          sparks.add(sparkTexture(), hub[0] + Math.cos(a) * unit * 0.22, hub[1] + Math.sin(a) * unit * 0.22, { vx: -Math.sin(a) * unit * 1.8, vy: Math.cos(a) * unit * 1.8, gravity: unit * 2, life: 0.35, tint: Math.random() < 0.5 ? 0xffe0a0 : ORANGE, scale: 0.28 * (unit / 180) });
        }
      sparks.step(dt);
      return t < 0.7 || sparks.list.length > 0;
    },
    sc.strike ? 1.4 : 1,
  );
  await impact;
  await done();
}

function wireApple(g: Graphics, c: Pt, r: number, spin: number, alpha: number) {
  for (let i = 0; i < 6; i++) {
    const a = spin + (i / 6) * Math.PI;
    const w = Math.abs(Math.cos(a)) * r;
    const front = Math.sin(a) > 0;
    g.ellipse(c[0], c[1], Math.max(0.5, w), r).stroke({ width: front ? 1.6 : 1, color: front ? 0xff6a6a : RED, alpha: alpha * (front ? 1 : 0.5) });
  }
  for (let i = 1; i < 5; i++) {
    const y = c[1] - r + (2 * r * i) / 5;
    const hw = Math.sqrt(Math.max(0, r * r - (y - c[1]) ** 2));
    g.ellipse(c[0], y, hw, hw * 0.18).stroke({ width: 1, color: 0xff6a6a, alpha: alpha * 0.8 });
  }
}

export async function principiaPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const apple = at(0.27, 0.34);
  const R = unit * 0.25;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const ball = glowSprite(fx, glowTexture(), GOLD);
  const trail = new Emitter(fx);
  root.addChild(fx);
  const top = at(0.5, 0.06);
  const mid = at(0.66, 0.2);
  const end = at(0.63, 0.39);
  let landed = false;
  await run(app, (t, dt) => {
    const on = Math.sin(Math.PI * span(t, 0, 1.7));
    g.clear();
    wireApple(g, apple, R, t * 2.2, 0.9 * on);
    const k = span(t, 0.2, 1);
    const e = k * k;
    const u = 1 - e;
    const p: Pt = [u * u * top[0] + 2 * u * e * mid[0] + e * e * end[0], u * u * top[1] + 2 * u * e * mid[1] + e * e * end[1]];
    ball.position.set(...p);
    ball.alpha = k > 0 ? 1 - span(t, 1.3, 1.6) : 0;
    ball.scale.set((unit / 128) * 0.12);
    if (k > 0 && k < 1) trail.add(sparkTexture(), ...p, { life: 0.5, tint: GOLD, scale: 0.22 * (unit / 180), grow: -0.3 });
    if (k >= 1 && !landed) {
      landed = true;
      burst(trail, ...end, 16, GOLD, unit * 0.8, { life: 0.5, scale: 0.3 });
    }
    const rk = span(t, 1, 1.6);
    if (rk > 0 && rk < 1) g.ellipse(...end, unit * 0.25 * ease.out(rk), unit * 0.08 * ease.out(rk)).stroke({ width: 1.5, color: GOLD, alpha: 1 - rk });
    trail.step(dt);
    return t < 1.75 || trail.list.length > 0;
  });
  await done();
}

export async function principia(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at, world, strike } = sc;
  const apple = at(0.27, 0.34);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const arc = new Graphics();
  arc.blendMode = "add";
  world.addChild(arc);
  const ball = glowSprite(world, glowTexture(), GOLD);
  const bits = new Emitter(world);
  root.addChild(fx);
  let hit = false;
  await run(
    app,
    (t, dt) => {
      g.clear();
      wireApple(g, apple, unit * 0.25, t * 6, Math.sin(Math.PI * span(t, 0, 0.6)));
      arc.clear();
      if (!strike) return t < 0.7;
      const src = root.toGlobal({ x: apple[0], y: apple[1] });
      const k = span(t, 0.1, 0.45);
      const peak: Pt = [(src.x + strike[0]) / 2, Math.min(src.y, strike[1]) - unit * 0.6];
      const q = (s: number): Pt => [(1 - s) ** 2 * src.x + 2 * (1 - s) * s * peak[0] + s * s * strike[0], (1 - s) ** 2 * src.y + 2 * (1 - s) * s * peak[1] + s * s * strike[1]];
      if (k > 0 && k < 1) {
        const p = q(k * k);
        ball.position.set(...p);
        ball.alpha = 1;
        ball.scale.set((unit / 128) * 0.14);
        bits.add(sparkTexture(), ...p, { life: 0.3, tint: GOLD, scale: 0.25 * (unit / 180), grow: -0.5 });
      } else ball.alpha = 0;
      if (k >= 1 && !hit) {
        hit = true;
        burst(bits, ...strike, 24, GOLD, unit * 2, { life: 0.5, scale: 0.35 });
        for (let i = 0; i < 14; i++) bits.add(shardTexture(), ...strike, { vx: rnd(-1, 1) * unit * 2, vy: -unit * rnd(0.3, 1.6), gravity: unit * 4, spin: rnd(-8, 8), life: 0.7, tint: 0xbfe6ff, scale: (unit / 180) * rnd(0.3, 0.55), blend: "normal" });
        navigator.vibrate?.(30);
      }
      const r = span(t, 0.45, 0.9);
      if (r > 0 && r < 1) {
        arc.circle(...strike, unit * (0.1 + 0.7 * ease.out(r))).stroke({ width: unit * 0.02 * (1 - r) + 1, color: GOLD, alpha: 1 - r });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          lightning(arc, strike[0], strike[1], strike[0] + Math.cos(a) * unit * 0.4 * ease.out(r), strike[1] + Math.sin(a) * unit * 0.4 * ease.out(r), unit * 0.06, 0xbfe6ff, unit * 0.006 * (1 - r) + 0.5);
        }
      }
      bits.step(dt);
      return t < 1 || bits.list.length > 0;
    },
    sc.strike ? 1.3 : 1,
  );
  await done();
}

export async function bumi(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.46, 0.735);
  const iris = new Graphics();
  iris.blendMode = "add";
  fx.addChild(iris);
  const core = glowSprite(fx, glowTexture(), RED);
  core.position.set(...eye);
  const glints = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const open = ease.back(span(t, 0.2, 0.6));
    const fade = 1 - span(t, 1.6, 2);
    iris.clear();
    for (let i = 0; i < 3; i++) {
      const r = unit * (0.05 + 0.04 * i) * open;
      const a = t * (2 - i) * (i % 2 ? -1 : 1);
      iris.arc(...eye, r, a, a + Math.PI * 1.4).stroke({ width: 1.5, color: i ? RED : WHITE, alpha: 0.8 * fade });
    }
    core.alpha = (0.4 + 0.4 * open) * fade;
    core.scale.set((unit / 128) * (0.15 + 0.1 * open));
    if (t > 0.6 && t < 1.4 && Math.random() < 0.25) glints.add(sparkTexture(), ...at(rnd(0.2, 0.65), rnd(0.55, 0.95)), { life: 0.35, tint: WHITE, scale: 0.3 * (unit / 180), grow: -0.6 });
    glints.step(dt);
    return t < 2 || glints.list.length > 0;
  });
  await done();
}

export async function bumiFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.46, 0.735);
  const beam = new Graphics();
  beam.blendMode = "add";
  fx.addChild(beam);
  const hits = new Emitter(app.stage);
  const target: Pt = board?.runner ? pt(board.runner) : at(0.46, 1.6);
  root.addChild(fx);
  let struck = false;
  await run(app, (t, dt) => {
    beam.clear();
    const charge = span(t, 0, 0.3);
    beam.circle(...eye, unit * 0.08 * charge).fill({ color: RED, alpha: 0.5 * charge * (1 - span(t, 0.8, 1)) });
    const k = span(t, 0.3, 0.8);
    if (k > 0 && k < 1) {
      const src = root.toGlobal({ x: eye[0], y: eye[1] });
      for (const [w, a, c] of [
        [unit * 0.06, 0.25, RED],
        [unit * 0.015, 1, WHITE],
      ] as const)
        beam
          .moveTo(eye[0], eye[1])
          .lineTo(target[0] - (src.x - eye[0]), target[1] - (src.y - eye[1]))
          .stroke({ width: w * (1 - k * 0.5), color: c, alpha: a });
      if (!struck) {
        struck = true;
        burst(hits, ...target, 20, RED, unit * 1.2, { life: 0.5, scale: 0.35 });
        navigator.vibrate?.(40);
      }
    }
    hits.step(dt);
    return t < 1 || hits.list.length > 0;
  });
  await done();
}

function breath(at: (u: number, v: number) => Pt, unit: number, power: number) {
  const mouth = at(0.535, 0.595);
  const tip = at(0.55, 0.45);
  const len = Math.hypot(tip[0] - mouth[0], tip[1] - mouth[1]) || 1;
  const dir: Pt = [(tip[0] - mouth[0]) / len, (tip[1] - mouth[1]) / len];
  return (fire: Fire) => {
    for (let n = 0; n < 2; n++) {
      const spread = rnd(-0.18, 0.18);
      const c = Math.cos(spread);
      const sn = Math.sin(spread);
      const v = unit * rnd(1.4, 2.2) * power;
      fire.emit(mouth[0] + rnd(-2, 2), mouth[1] + rnd(-2, 2), { vx: (dir[0] * c - dir[1] * sn) * v, vy: (dir[0] * sn + dir[1] * c) * v, size: unit * rnd(0.05, 0.09) * power, life: rnd(0.3, 0.5) });
    }
  };
}

export async function biawak(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const heat = shimmer(root, card, rect, unit * 0.03);
  const fire = new Fire(fx, root, unit * 0.5);
  const glow = glowSprite(fx, glowTexture(), ORANGE);
  glow.position.set(...at(0.535, 0.595));
  const blow = breath(at, unit, 1);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const roar = Math.sin(Math.PI * span(t, 0.25, 1.35));
    heat(t, roar);
    glow.alpha = 0.55 * roar;
    glow.scale.set((unit / 128) * (0.2 + 0.2 * roar));
    if (roar > 0.15) blow(fire);
    fire.step(dt);
    return t < 1.5 || fire.list.length > 0;
  });
  await done();
}

export async function biawakFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, zoom } = await scene(rect, code, ready, board);
  const claws = new Graphics();
  claws.blendMode = "add";
  fx.addChild(claws);
  const fire = new Fire(fx, root, unit * 0.5);
  const sparks = new Emitter(fx);
  const blow = breath(at, unit, 1.4);
  root.addChild(fx);
  const a = at(0.25, 0.62);
  const b = at(0.7, 0.95);
  await run(app, (t, dt) => {
    claws.clear();
    zoom(1 + 0.04 * Math.sin(Math.PI * span(t, 0, 0.3)));
    if (t < 0.35) blow(fire);
    for (let i = 0; i < 3; i++) {
      const k = ease.out(span(t, 0.3 + i * 0.05, 0.5 + i * 0.05));
      if (k <= 0) continue;
      const off = (i - 1) * unit * 0.12;
      const from: Pt = [a[0] + off, a[1]];
      const to: Pt = [b[0] + off, b[1]];
      const head = lerp(from, to, k);
      const fade = 1 - span(t, 0.7, 1.1);
      claws
        .moveTo(...from)
        .lineTo(...head)
        .stroke({ width: unit * 0.03 * (1 - k * 0.5), color: ORANGE, alpha: 0.5 * fade });
      claws
        .moveTo(...from)
        .lineTo(...head)
        .stroke({ width: unit * 0.008, color: 0xfff0d0, alpha: fade });
      if (k < 1 && Math.random() < 0.8) sparks.add(sparkTexture(), ...head, { vx: rnd(-1, 1) * unit * 0.5, vy: rnd(-1, 1) * unit * 0.5, life: 0.3, tint: ORANGE, scale: 0.25 * (unit / 180), grow: -0.5 });
    }
    card.tint = t < 0.3 ? 0xffd8c0 : WHITE;
    sparks.step(dt);
    fire.step(dt);
    return t < 1.15 || sparks.list.length > 0 || fire.list.length > 0;
  });
  card.tint = WHITE;
  await done();
}

export async function funhouse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const face = at(0.5, 0.76);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.04, wavelength: unit * 0.5, speed: unit * 0.8, brightness: 1.05, radius: unit * 0.8, time: 0 });
  card.filters = [wave];
  const bulbs = new Graphics();
  bulbs.blendMode = "add";
  fx.addChild(bulbs);
  root.addChild(fx);
  const hues = [0xff4f9a, 0xffd84a, 0x4fd8ff, 0x9dff5a];
  await run(app, (t) => {
    wave.center = filterPoint(card, ...face);
    wave.time = (t * 0.8) % 1;
    bulbs.clear();
    const on = span(t, 0, 0.2) * (1 - span(t, 1.6, 2));
    const n = 22;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const p: Pt = u < 0.5 ? at(0.06 + u * 2 * 0.88, 0.53) : at(0.06 + (u - 0.5) * 2 * 0.88, 0.98);
      const lit = Math.floor(t * 8 + i) % 3 === 0;
      bulbs.circle(...p, unit * 0.012).fill({ color: hues[i % hues.length], alpha: on * (lit ? 1 : 0.25) });
    }
    return t < 2;
  });
  await done();
}

export async function funhouseFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const face = at(0.5, 0.76);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.1, wavelength: unit * 0.6, speed: unit * 2, brightness: 1.2, radius: -1, time: 0 });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [wave, split];
  root.addChild(fx);
  await run(app, (t) => {
    wave.center = filterPoint(card, ...face);
    wave.time = t;
    const w = Math.sin(t * 20) * 6 * (1 - span(t, 0.4, 0.9));
    split.red = sideways ? { x: 0, y: w } : { x: w, y: 0 };
    split.blue = sideways ? { x: 0, y: -w } : { x: -w, y: 0 };
    return t < 0.9;
  });
  await done();
}

export async function bran(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const crows = new Emitter(fx);
  root.addChild(fx);
  const nest = at(0.75, 0.85);
  let flown = false;
  await run(app, (t, dt) => {
    if (!flown && t > 0.2) {
      flown = true;
      for (let i = 0; i < 16; i++) {
        const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1);
        const v = unit * rnd(0.4, 0.9);
        crows.add(crowTexture(), nest[0] + rnd(-1, 1) * unit * 0.15, nest[1] + rnd(-1, 1) * unit * 0.1, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.4, life: rnd(1, 1.5), tint: 0xd8c8ff, scale: (unit / 180) * rnd(0.35, 0.6), alpha: 0.9 });
      }
    }
    for (const p of crows.list) p.s.scale.y = p.s.scale.x * (0.6 + 0.4 * Math.sin(p.age * 22));
    crows.step(dt);
    return t < 0.5 || crows.list.length > 0;
  });
  await done();
}

export async function branFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const flock = new Emitter(app.stage);
  const target: Pt = board?.runner ? pt(board.runner) : at(0.5, 1.6);
  const src = at(0.75, 0.85);
  root.addChild(fx);
  const birds = Array.from({ length: 10 }, (_, i) => homing(app.stage, crowTexture(), src, target, i * 0.05, 0xd8c8ff, (unit / 180) * 0.5, rnd(-1, 1) * unit * 1.2));
  let struck = false;
  await run(app, (t, dt) => {
    for (const b of birds) b.s.scale.y = b.s.scale.x * (0.6 + 0.4 * Math.sin(t * 24));
    if (flyHome(birds, t, flock, VIOLET) === birds.length && !struck) {
      struck = true;
      if (board?.runner) prism(document.querySelector('[data-anchor="runner-panel"]'), 0.4);
      burst(flock, ...target, 14, VIOLET, unit, { life: 0.4, scale: 0.3 });
    }
    flock.step(dt);
    return !struck || flock.list.length > 0;
  });
  for (const b of birds) b.s.destroy();
  await done();
}

export async function doomscroll(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, at } = await scene(rect, code, ready, board);
  const frames: [number, number, number, number][] = [
    [0.15, 0.53, 0.32, 0.75],
    [0.35, 0.53, 0.62, 0.62],
    [0.4, 0.78, 0.7, 0.93],
    [0.7, 0.55, 0.88, 0.7],
  ];
  const lines = new Graphics();
  lines.blendMode = "add";
  fx.addChild(lines);
  root.addChild(fx);
  const blur = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 9 });
  card.filters = [blur];
  await run(app, (t) => {
    const k = Math.sin(Math.PI * span(t, 0, 1.8));
    blur.velocity = { x: 0, y: 6 * k };
    lines.clear();
    for (const [u0, v0, u1, v1] of frames)
      for (let i = 0; i < 5; i++) {
        const v = v0 + (v1 - v0) * ((i / 5 + t * 1.6) % 1);
        lines
          .moveTo(...at(u0 + 0.02, v))
          .lineTo(...at(u1 - 0.02, v))
          .stroke({ width: 1.5, color: 0xffd84a, alpha: 0.5 * k });
      }
    return t < 1.8;
  });
  await done();
}

export async function doomscrollFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  app.stage.addChild(g);
  const target = board?.runner;
  root.addChild(fx);
  const src = at(0.55, 0.85);
  await run(app, (t) => {
    g.clear();
    if (target) {
      const k = ease.out(span(t, 0.05, 0.4));
      for (let i = 0; i < 4; i++) {
        const to: Pt = [target.left + target.width * (0.2 + i * 0.2), target.top + target.height * 0.5];
        tether(g, [root.toGlobal({ x: src[0], y: src[1] }).x, root.toGlobal({ x: src[0], y: src[1] }).y], to, k, 0xffd84a, unit * 0.01, 1 - span(t, 0.6, 0.9), unit * 0.05, t + i);
      }
      if (t > 0.4 && t < 0.42) prism(document.querySelector('[data-anchor="runner-panel"]'), 0.5);
    } else {
      const k = span(t, 0, 0.7);
      for (let i = 0; i < 6; i++) {
        const v = 0.5 + ((i / 6 + k) % 1) * 0.5;
        g.moveTo(...at(0.08, v))
          .lineTo(...at(0.92, v))
          .stroke({ width: 2, color: 0xffd84a, alpha: 0.6 * (1 - k) });
      }
    }
    return t < 0.95;
  });
  g.destroy();
  await done();
}

export const buzzsawInstall = buzzsawPose;
export const bumiPose = pose(RED, [0.46, 0.735]);
export const biawakPose = pose(ORANGE, [0.4, 0.58]);
export const funhousePose = pose(0xff4f9a, [0.5, 0.76]);
export const branPose = pose(VIOLET, [0.33, 0.765]);
export const doomscrollPose = pose(0xffd84a, [0.55, 0.85]);
