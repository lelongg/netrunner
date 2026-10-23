import { Graphics } from "pixi.js";
import { GlowFilter } from "pixi-filters";
import { Emitter, ease, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, Fire, type Ready, WHITE, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";
import { bezier, jolt, runnerAt } from "./sixth";

const AMBER = 0xffa24a;
const MANE = 0xff6fa0;

const petalTexture = () =>
  painted("rc-petal", 24, 12, (g) => {
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.beginPath();
    g.ellipse(12, 6, 11, 4, 0, 0, Math.PI * 2);
    g.fill();
  });

const nuggetTexture = () =>
  painted("rc-nugget", 28, 24, (g) => {
    const r = g.createLinearGradient(4, 2, 24, 22);
    r.addColorStop(0, "#fff2b0");
    r.addColorStop(0.5, "#e8b13a");
    r.addColorStop(1, "#8a5a10");
    g.fillStyle = r;
    g.beginPath();
    g.moveTo(5, 10);
    g.lineTo(12, 3);
    g.lineTo(22, 6);
    g.lineTo(25, 15);
    g.lineTo(15, 22);
    g.lineTo(4, 18);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(255,240,190,0.9)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(12, 3);
    g.lineTo(14, 12);
    g.lineTo(25, 15);
    g.moveTo(14, 12);
    g.lineTo(4, 18);
    g.stroke();
  });

function path(pts: Pt[], k: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = k * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) return lerp(pts[i], pts[i + 1], lens[i] ? d / lens[i] : 0);
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

const MUDRAS: [number, number][] = [
  [0.72, 0.635],
  [0.72, 0.775],
];
const PALMS: [number, number][] = [
  [0.38, 0.575],
  [0.38, 0.845],
];

export async function karuna(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const glow = new GlowFilter({ color: AMBER, distance: 10, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const fire = new Fire(fx, undefined, unit * 0.5);
  const lights = MUDRAS.map(([u, v]) => {
    const s = glowSprite(fx, glowTexture(), 0xffc070);
    s.position.set(...at(u, v));
    return s;
  });
  const face = glowSprite(fx, glowTexture(), 0xff7a3a);
  face.position.set(...at(0.2, 0.7));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    MUDRAS.forEach(([u, v], i) => {
      const c = at(u, v);
      const on = span(t, 0.15 + i * 0.2, 0.45 + i * 0.2) * fade;
      lights[i].alpha = 0.75 * on;
      lights[i].scale.set((unit / 128) * 0.2);
      for (let r = 0; r < 3; r++) {
        const k = (t * 0.7 + r / 3 + i * 0.15) % 1;
        if (on <= 0) continue;
        g.circle(c[0], c[1], unit * (0.04 + 0.28 * k)).stroke({ width: 2.2 * (1 - k) + 0.8, color: 0xffc070, alpha: 0.85 * (1 - k) * on });
      }
    });
    if (t < 1.4)
      for (const [u, v] of PALMS)
        if (Math.random() < 0.9) {
          const p = at(u - rnd(0.02, 0.17), v + rnd(-0.03, 0.03));
          fire.emit(p[0], p[1], { vx: rnd(-1, 1) * unit * 0.05, vy: -unit * rnd(0.05, 0.15), size: unit * rnd(0.07, 0.11), life: rnd(0.45, 0.7) });
        }
    face.alpha = 0.45 * Math.sin(Math.PI * span(t, 0.4, 1.8));
    face.scale.set((unit / 128) * 0.3);
    glow.outerStrength = 2.2 * Math.sin(Math.PI * span(t, 0.1, 1.8));
    fire.step(dt);
    return t < 1.9 || fire.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function karunaFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const embers = new Emitter(world);
  const target = runnerAt(board);
  const hits = [false, false];
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    MUDRAS.forEach(([u, v], i) => {
      const local = at(u, v);
      const src = root.toGlobal({ x: local[0], y: local[1] });
      const d = i * 0.4;
      const charge = span(t, d, d + 0.2);
      if (charge > 0 && charge < 1) g.circle(src.x, src.y, unit * 0.05 * (1 - charge) + unit * 0.02).stroke({ width: 2, color: 0xffd090, alpha: charge });
      const k = span(t, d + 0.2, d + 0.55);
      if (k > 0 && k < 1) {
        const p = bezier([src.x, src.y], [(src.x + target[0]) / 2, Math.min(src.y, target[1]) - unit * 0.3], target, ease.inOut(k));
        g.circle(p[0], p[1], unit * 0.035).stroke({ width: 2.2, color: 0xffd090, alpha: 0.95 });
        g.circle(p[0], p[1], unit * 0.06).stroke({ width: 1, color: AMBER, alpha: 0.5 });
        embers.add(sparkTexture(), p[0], p[1], { life: 0.35, tint: AMBER, scale: (unit / 180) * 0.25, grow: -0.5 });
      }
      const r = span(t, d + 0.55, d + 1);
      if (r > 0 && r < 1) {
        const R = board?.runner ? Math.min(board.runner.width, board.runner.height) * 0.6 : unit * 0.3;
        g.circle(target[0], target[1], R * (0.2 + 0.8 * ease.out(r))).stroke({ width: 2 * (1 - r) + 0.6, color: AMBER, alpha: 0.85 * (1 - r) });
      }
      if (!hits[i] && t > d + 0.55) {
        hits[i] = true;
        for (let n = 0; n < 12; n++) embers.add(sparkTexture(), ...target, { vx: rnd(-1, 1) * unit * 0.8, vy: -unit * rnd(0.2, 0.8), gravity: unit, life: 0.6, tint: n % 3 ? AMBER : 0xffe0b0, scale: (unit / 180) * 0.28 });
        jolt(board, 0.3);
      }
    });
    embers.step(dt);
    return t < 1.4 || embers.list.length > 0;
  });
  g.destroy();
  await done();
}

const BODY: [number, number][] = [
  [0.07, 0.43],
  [0.2, 0.375],
  [0.33, 0.355],
  [0.45, 0.37],
  [0.55, 0.35],
  [0.6, 0.28],
  [0.62, 0.22],
];

export async function leechPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const body = BODY.map(([u, v]) => at(u, v));
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const eyes = [at(0.47, 0.215), at(0.57, 0.165)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x6aff6a);
    s.position.set(...p);
    return s;
  });
  const box: Pt = at(0.78, 0.235);
  const mouth: Pt = at(0.63, 0.24);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (let n = 0; n < 2; n++) {
      const k = span(t, n * 0.35, n * 0.35 + 0.9);
      if (k <= 0 || k >= 1) continue;
      const a = path(body, Math.max(0, k - 0.12));
      const b = path(body, k);
      const f = Math.sin(Math.PI * k);
      for (const [w, c, al] of [
        [unit * 0.06, 0xd04aff, 0.45],
        [2, 0xffc8ff, 0.9],
      ] as const) {
        g.moveTo(...a);
        for (let q = 1; q <= 8; q++) g.lineTo(...path(body, Math.max(0, k - 0.12 + (0.12 * q) / 8)));
        g.stroke({ width: w, color: c, alpha: al * f, cap: "round" });
      }
      g.circle(b[0], b[1], unit * 0.03).fill({ color: 0xffb0ff, alpha: 0.85 * f });
    }
    const wake = span(t, 0.9, 1.1) * fade;
    for (const e of eyes) {
      e.alpha = 0.75 * wake * (0.8 + 0.2 * Math.sin(t * 12));
      e.scale.set((unit / 128) * 0.1);
    }
    if (t > 0.9 && t < 1.6 && Math.random() < 0.9) {
      const from: Pt = [box[0] + rnd(-1, 1) * unit * 0.08, box[1] + rnd(-1, 1) * unit * 0.04];
      motes.add(sparkTexture(), ...from, { vx: (mouth[0] - from[0]) * 2.2, vy: (mouth[1] - from[1]) * 2.2, life: 0.45, tint: Math.random() < 0.5 ? 0x7af0ff : 0xb0fff0, scale: (unit / 180) * 0.24, alpha: 0.7 });
    }
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

const MANE_STRANDS: [Pt, Pt, Pt][] = [
  [
    [0.36, 0.22],
    [0.6, 0.12],
    [0.88, 0.1],
  ],
  [
    [0.38, 0.27],
    [0.62, 0.2],
    [0.92, 0.17],
  ],
  [
    [0.4, 0.33],
    [0.62, 0.3],
    [0.88, 0.28],
  ],
  [
    [0.42, 0.38],
    [0.6, 0.38],
    [0.78, 0.36],
  ],
];

export async function marjanahPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const strands = MANE_STRANDS.map((s) => s.map(([u, v]) => at(u, v)) as [Pt, Pt, Pt]);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const petals = new Emitter(fx);
  const eye = glowSprite(fx, sparkTexture(), 0xbfeaff);
  eye.position.set(...at(0.29, 0.31));
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    strands.forEach((s, i) => {
      const k = span(t, 0.1 + i * 0.08, 1.1 + i * 0.08);
      if (k <= 0 || k >= 1) return;
      const wave = (q: number): Pt => {
        const p = bezier(s[0], s[1], s[2], q);
        return [p[0], p[1] + Math.sin(q * 9 - t * 9 + i) * unit * 0.02 * q];
      };
      const head = ease.inOut(k);
      const tail = Math.max(0, head - 0.3);
      g.moveTo(...wave(tail));
      for (let n = 1; n <= 16; n++) g.lineTo(...wave(tail + ((head - tail) * n) / 16));
      g.stroke({ width: unit * 0.022, color: MANE, alpha: 0.35 * fade, cap: "round" });
      g.moveTo(...wave(tail));
      for (let n = 1; n <= 16; n++) g.lineTo(...wave(tail + ((head - tail) * n) / 16));
      g.stroke({ width: 1.3, color: 0xffd0e0, alpha: 0.8 * fade, cap: "round" });
      if (Math.random() < 0.35) petals.add(petalTexture(), ...wave(head), { vx: unit * rnd(0.3, 0.6), vy: -unit * rnd(0, 0.2), spin: rnd(-4, 4), life: 0.8, tint: Math.random() < 0.5 ? MANE : 0xffb0c8, scale: (unit / 180) * rnd(0.3, 0.5), alpha: 0.85 });
    });
    const f = Math.sin(Math.PI * span(t, 0.9, 1.5));
    eye.alpha = f;
    eye.rotation = t;
    eye.scale.set((unit / 120) * 0.28 * f);
    petals.step(dt);
    return t < 1.9 || petals.list.length > 0;
  });
  await done();
}

export async function marjanah(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, world, fx, done, unit, at } = sc;
  const mouth = at(0.2, 0.42);
  const maneTip = at(0.82, 0.16);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const local = new Graphics();
  local.blendMode = "add";
  fx.addChild(local);
  const petals = new Emitter(world);
  root.addChild(fx);
  let hit = false;
  await run(
    app,
    (t, dt) => {
      g.clear();
      local.clear();
      const src = root.toGlobal({ x: mouth[0], y: mouth[1] });
      const to = sc.strike ?? ([src.x - unit * 0.5, src.y - unit * 0.5] as Pt);
      const dir = Math.atan2(to[1] - src.y, to[0] - src.x);
      for (let i = 0; i < 3; i++) {
        const k = span(t, i * 0.08, i * 0.08 + 0.45);
        if (k <= 0 || k >= 1) continue;
        const R = unit * (0.1 + 0.5 * ease.out(k));
        local
          .moveTo(mouth[0] + Math.cos(dir - 0.5) * R, mouth[1] + Math.sin(dir - 0.5) * R)
          .arc(mouth[0], mouth[1], R, dir - 0.5, dir + 0.5)
          .stroke({ width: 2 * (1 - k) + 0.6, color: 0xbfeaff, alpha: 0.7 * (1 - k) });
      }
      if (t < 0.4 && Math.random() < 0.8) {
        const tip = root.toGlobal({ x: maneTip[0], y: maneTip[1] });
        petals.add(petalTexture(), tip.x + rnd(-1, 1) * unit * 0.1, tip.y + rnd(-1, 1) * unit * 0.05, { vx: (to[0] - tip.x) * rnd(1.5, 2.5), vy: (to[1] - tip.y) * rnd(1.5, 2.5), drag: 1.2, spin: rnd(-6, 6), life: 0.6, tint: Math.random() < 0.5 ? MANE : 0xffb0c8, scale: (unit / 180) * rnd(0.35, 0.55), alpha: 0.9 });
      }
      const s = span(t, 0.4, 0.75);
      if (s > 0 && s < 1) {
        const L = unit * 0.55;
        const a = dir + Math.PI / 2 + 0.5;
        for (let n = -1; n <= 1; n++) {
          const off: Pt = [Math.cos(a - Math.PI / 2) * n * unit * 0.09, Math.sin(a - Math.PI / 2) * n * unit * 0.09];
          const p0: Pt = [to[0] + off[0] - Math.cos(a) * L * 0.5, to[1] + off[1] - Math.sin(a) * L * 0.5];
          const p1 = lerp(p0, [to[0] + off[0] + Math.cos(a) * L * 0.5, to[1] + off[1] + Math.sin(a) * L * 0.5], ease.out(s));
          g.moveTo(...p0)
            .lineTo(...p1)
            .stroke({ width: unit * 0.04 * (1 - s) + 1, color: MANE, alpha: 0.5 * (1 - s) });
          g.moveTo(...p0)
            .lineTo(...p1)
            .stroke({ width: 1.6, color: 0xffe0ec, alpha: 0.95 * (1 - s) });
        }
      }
      if (!hit && t > 0.45) {
        hit = true;
        for (let n = 0; n < 18; n++) petals.add(petalTexture(), ...to, { vx: rnd(-1, 1) * unit * 1.6, vy: rnd(-1, 1) * unit * 1.6, drag: 2, spin: rnd(-8, 8), life: 0.6, tint: n % 2 ? MANE : 0xffd0e0, scale: (unit / 180) * rnd(0.3, 0.5), alpha: 0.9 });
        navigator.vibrate?.(20);
      }
      petals.step(dt);
      return t < 1 || petals.list.length > 0;
    },
    sc.strike ? 1.1 : 1,
  );
  g.destroy();
  await done();
}

const WINDOWS = Array.from({ length: 60 }, () => ({ u: rnd(0.12, 0.74), v: rnd(0.54, 0.95), w: rnd(0.025, 0.06), h: rnd(0.012, 0.024), d: rnd(0, 1) }));

function windowQuad(g: Graphics, at: (u: number, v: number) => Pt, w: { u: number; v: number; w: number; h: number }) {
  return g.poly([...at(w.u, w.v), ...at(w.u + w.w, w.v), ...at(w.u + w.w, w.v + w.h), ...at(w.u, w.v + w.h)]);
}

export async function palisade(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (const w of WINDOWS) {
      const on = span(t, 0.1 + w.d * 0.9, 0.2 + w.d * 0.9);
      if (on <= 0) continue;
      const flick = on < 1 && Math.random() < 0.5 ? 0.3 : 1;
      windowQuad(g, at, w).fill({ color: 0x9dffe8, alpha: 0.55 * on * flick * fade });
    }
    for (let i = 0; i < 5; i++) {
      const k = ((t * 0.8 + i / 5) % 1) * span(t, 0, 0.3) * fade;
      const u = 0.8 + i * 0.022;
      g.moveTo(...at(u, 0.52 + k * 0.45))
        .lineTo(...at(u, Math.min(0.97, 0.56 + k * 0.45)))
        .stroke({ width: 2.4, color: 0x9dffe0, alpha: 0.9 * Math.sin(Math.PI * k) });
    }
    return t < 1.9;
  });
  await done();
}

export async function palisadeFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const dust = new Emitter(fx);
  root.addChild(fx);
  let shut = false;
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 0.9, 1.3);
    const k = ease.inOut(span(t, 0, 0.45));
    const edge = 0.92 - k * 0.8;
    g.poly([...at(edge, 0.52), ...at(0.92, 0.52), ...at(0.92, 0.98), ...at(edge, 0.98)]).fill({ color: 0x6ff0d0, alpha: 0.22 * fade });
    for (let i = 1; i < 8; i++) {
      const u = edge + ((0.92 - edge) * i) / 8;
      g.moveTo(...at(u, 0.52))
        .lineTo(...at(u, 0.98))
        .stroke({ width: 1.2, color: 0xc0fff0, alpha: 0.5 * fade });
    }
    g.moveTo(...at(edge, 0.52))
      .lineTo(...at(edge, 0.98))
      .stroke({ width: unit * 0.05, color: 0x6ff0d0, alpha: 0.5 * fade });
    g.moveTo(...at(edge, 0.52))
      .lineTo(...at(edge, 0.98))
      .stroke({ width: 2, color: 0xe0fff8, alpha: 0.9 * fade });
    for (const w of WINDOWS) if (w.u > edge) windowQuad(g, at, w).fill({ color: 0xd8fff4, alpha: 0.6 * fade });
    if (!shut && k >= 1) {
      shut = true;
      for (let i = 0; i < 20; i++) dust.add(sparkTexture(), ...at(0.12, rnd(0.55, 0.95)), { vx: rnd(-1, 0.2) * unit * 0.6, vy: rnd(-1, 1) * unit * 0.3, life: 0.45, tint: 0x9dfff0, scale: (unit / 180) * 0.22 });
      navigator.vibrate?.(30);
    }
    dust.step(dt);
    return t < 1.3 || dust.list.length > 0;
  });
  await done();
}

const TIPS: [number, number][] = [
  [0.85, 0.235],
  [0.79, 0.39],
  [0.5, 0.37],
  [0.665, 0.25],
];

export async function pantographPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const tips = TIPS.map(([u, v]) => at(u, v));
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const dots = tips.map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x9aff6a);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    tips.forEach((p, i) => {
      const d = 0.1 + i * 0.25;
      const touch = span(t, d, d + 0.1);
      dots[i].alpha = 0.85 * touch * fade;
      dots[i].scale.set((unit / 128) * 0.1);
      const k = span(t, d, d + 0.6);
      if (k > 0 && k < 1) {
        for (const m of [1, 0.6]) {
          const [rx, ry] = [unit * 0.2 * m * ease.out(k), unit * 0.08 * m * ease.out(k)];
          g.ellipse(p[0], p[1], sideways ? ry : rx, sideways ? rx : ry).stroke({ width: 2 * (1 - k) + 0.6, color: 0x9aff6a, alpha: 0.9 * (1 - k) });
        }
      }
      if (i > 0) {
        const l = span(t, d - 0.05, d + 0.25);
        if (l > 0)
          g.moveTo(...tips[i - 1])
            .lineTo(...lerp(tips[i - 1], p, ease.out(l)))
            .stroke({ width: 1.8, color: 0xd0ffb0, alpha: 0.75 * fade });
      }
    });
    return t < 1.9;
  });
  await done();
}

export async function regolith(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const ceiling = at(0.5, 0.1);
  const table = at(0.5, 0.345);
  const moonC: Pt = at(0.5, 0.25);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const dust = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (let i = 0; i < 3; i++) {
      const on = span(t, 0.05 + i * 0.12, 0.2 + i * 0.12) * fade;
      if (on > 0) g.ellipse(ceiling[0], ceiling[1] + unit * 0.01 * i, rect.width * (0.09 + i * 0.06), rect.width * (0.022 + i * 0.012)).stroke({ width: 1.4, color: 0x8fd8ff, alpha: 0.75 * on });
    }
    const beam = span(t, 0.4, 0.7) * fade;
    if (beam > 0) g.poly([ceiling[0] - unit * 0.05, ceiling[1] + unit * 0.03, ceiling[0] + unit * 0.05, ceiling[1] + unit * 0.03, table[0] + unit * 0.22, table[1], table[0] - unit * 0.22, table[1]]).fill({ color: 0x8fd8ff, alpha: 0.1 * beam });
    const m = ease.out(span(t, 0.6, 1.2)) * fade;
    if (m > 0) {
      const R = unit * 0.13 * m;
      g.moveTo(moonC[0] - R, moonC[1])
        .arc(moonC[0], moonC[1], R, Math.PI, 0)
        .stroke({ width: 1.4, color: 0xffe6a0, alpha: 0.85 * fade });
      for (let i = 1; i < 4; i++) {
        const h = (R * i) / 4;
        g.ellipse(moonC[0], moonC[1] - h, Math.sqrt(R * R - h * h), R * 0.12).stroke({ width: 1, color: 0xffe6a0, alpha: 0.4 * fade });
      }
      g.ellipse(moonC[0], moonC[1], R, R * 0.2).stroke({ width: 1.2, color: 0xffe6a0, alpha: 0.6 * fade });
    }
    if (t > 0.6 && t < 1.5 && Math.random() < 0.5) dust.add(sparkTexture(), table[0] + rnd(-1, 1) * unit * 0.12, table[1], { vy: -unit * rnd(0.1, 0.25), life: 0.7, tint: 0xffd27a, scale: (unit / 180) * 0.2 });
    dust.step(dt);
    return t < 1.9 || dust.list.length > 0;
  });
  await done();
}

export async function regolithUse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const spots: Pt[] = [at(0.44, 0.34), at(0.51, 0.33), at(0.57, 0.345)];
  const nuggets = spots.map((p, i) => {
    const s = glowSprite(fx, nuggetTexture(), WHITE);
    s.blendMode = "normal";
    return { s, p, d: 0.15 + i * 0.12, spin: rnd(-1.5, 1.5) };
  });
  const glints = spots.map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xfff0c0);
    s.position.set(...p);
    return s;
  });
  const sparks = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    nuggets.forEach((n, i) => {
      const k = span(t, n.d, n.d + 0.9);
      const e = ease.out(k);
      n.s.position.set(n.p[0], n.p[1] - unit * 0.2 * e);
      n.s.rotation = n.spin * e;
      n.s.alpha = k > 0 ? 1 - span(t, n.d + 0.7, n.d + 0.9) : 0;
      n.s.scale.set((unit / 180) * 0.45);
      const gl = Math.sin(Math.PI * span(t, n.d - 0.1, n.d + 0.2));
      glints[i].alpha = 0.9 * gl;
      glints[i].rotation = t * 3;
      glints[i].scale.set((unit / 120) * 0.25 * gl);
      if (k > 0 && k < 0.8 && Math.random() < 0.3) sparks.add(sparkTexture(), n.s.x + rnd(-1, 1) * unit * 0.02, n.s.y + unit * 0.02, { vy: unit * 0.1, life: 0.4, tint: 0xffd27a, scale: (unit / 180) * 0.18 });
    });
    sparks.step(dt);
    return t < 1.3 || sparks.list.length > 0;
  });
  await done();
}
