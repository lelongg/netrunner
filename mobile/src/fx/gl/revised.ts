import { Graphics } from "pixi.js";
import { GlitchFilter, GlowFilter, GodrayFilter, RGBSplitFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, Smoke, WHITE, burst, painted, scene } from "./kit";
import { type Pt, cubeTexture, glowSprite, lerp, rnd } from "./more";
import { bezier, jolt, runnerAt, triTexture } from "./sixth";

const plateTexture = () =>
  painted("rv-plate", 40, 28, (g) => {
    g.fillStyle = "rgba(255,255,255,0.3)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(6, 4);
    g.lineTo(38, 2);
    g.lineTo(34, 26);
    g.lineTo(2, 24);
    g.closePath();
    g.fill();
    g.stroke();
  });

const facetTexture = () =>
  painted("rv-facet", 48, 48, (g) => {
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(4, 10);
    g.lineTo(44, 2);
    g.lineTo(36, 30);
    g.lineTo(14, 46);
    g.closePath();
    g.fill();
    g.stroke();
  });

const bilinear = (q: [Pt, Pt, Pt, Pt], s: number, r: number): Pt => lerp(lerp(q[0], q[1], s), lerp(q[3], q[2], s), r);

export async function carnivorePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const pad: [Pt, Pt, Pt, Pt] = [at(0.15, 0.29), at(0.47, 0.3), at(0.87, 0.44), at(0.33, 0.47)];
  const head = at(0.6, 0.25);
  const glitch = new GlitchFilter({ slices: 8, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const halo = glowSprite(fx, glowTexture(), 0x59ff8a);
  halo.position.set(...head);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const sweep = ease.inOut(span(t, 0.05, 0.8));
    const fade = 1 - span(t, 1.2, 1.6);
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const lit = Math.max(0, 1 - Math.abs(k - sweep) * 6);
      g.moveTo(...bilinear(pad, 0, k)).lineTo(...bilinear(pad, 1, k));
      g.stroke({ width: 1 + lit * 1.6, color: 0x59ff8a, alpha: (0.12 + 0.8 * lit) * fade });
      g.moveTo(...bilinear(pad, k, 0)).lineTo(...bilinear(pad, k, Math.min(1, sweep * 1.2)));
      g.stroke({ width: 1, color: 0x59ff8a, alpha: 0.25 * fade });
    }
    const scan = span(t, 0.5, 1.3);
    if (scan > 0 && scan < 1) {
      const v = 0.13 + scan * 0.25;
      g.moveTo(...at(0.46, v))
        .lineTo(...at(0.74, v))
        .stroke({ width: unit * 0.01, color: 0x59ff8a, alpha: 0.75 });
    }
    const on = Math.sin(Math.PI * span(t, 0.45, 1.5));
    card.filters = on > 0.05 && Math.random() < 0.2 * on ? [glitch] : [];
    glitch.offset = unit * 0.015;
    glitch.seed = Math.random();
    halo.alpha = 0.35 * on;
    halo.scale.set((unit / 128) * 0.45, (unit / 128) * 0.55);
    return t < 1.6;
  });
  card.filters = [];
  await done();
}

export async function clearinghouse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.33, 0.36);
  const lamp = glowSprite(fx, glowTexture(), 0xff4a2a);
  lamp.position.set(...eye);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const smoke = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const boot = t < 0.45 ? (Math.floor(t * 16) % 3 === 0 ? 1 : 0.2) : 1;
    const on = span(t, 0.05, 0.15) * (1 - span(t, 1.4, 1.8)) * boot;
    lamp.alpha = 0.9 * on;
    lamp.scale.set((unit / 128) * 0.14);
    const k = span(t, 0.5, 1.4);
    if (k > 0 && k < 1) {
      const target = at(0.15 + 0.7 * ease.inOut(k), 0.48);
      g.moveTo(...eye)
        .lineTo(...target)
        .stroke({ width: 1.2, color: 0xff5a3a, alpha: 0.7 * on });
      g.circle(...target, unit * 0.012).fill({ color: 0xffb090, alpha: 0.9 * on });
    }
    if (t > 0.3 && t < 1.3 && Math.random() < 0.25) smoke.puff(...at(rnd(0.25, 0.45), 0.44), { vx: rnd(-1, 1) * unit * 0.05, vy: -unit * 0.08, size: unit * 0.14, life: 1.2, tint: 0x5a6066, alpha: 0.4 });
    smoke.step(dt);
    return t < 1.8 || smoke.list.length > 0;
  });
  await done();
}

export async function clearinghouseFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.33, 0.36);
  const lamp = glowSprite(fx, glowTexture(), 0xff4a2a);
  lamp.position.set(...eye);
  const g = new Graphics();
  g.blendMode = "add";
  world.addChild(g);
  const smoke = new Smoke(world);
  const sparks = new Emitter(world);
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    lamp.alpha = 0.9 * (1 - span(t, 0.8, 1.1));
    lamp.scale.set((unit / 128) * (0.14 + 0.1 * Math.sin(Math.PI * span(t, 0, 0.25))));
    const src = root.toGlobal({ x: eye[0], y: eye[1] });
    const aim = span(t, 0, 0.25);
    if (aim > 0 && aim < 1)
      g.moveTo(src.x, src.y)
        .lineTo(...target)
        .stroke({ width: 1, color: 0xff4a2a, alpha: 0.6 * (1 - aim) });
    const k = span(t, 0.25, 0.6);
    if (k > 0 && k < 1) {
      const peak: Pt = [(src.x + target[0]) / 2, Math.min(src.y, target[1]) - unit * 0.5];
      const p = bezier([src.x, src.y], peak, target, ease.inOut(k));
      g.circle(p[0], p[1], unit * 0.035).fill({ color: 0xff7a2a, alpha: 0.5 });
      g.circle(p[0], p[1], unit * 0.018).fill({ color: 0xffe0c0 });
      sparks.add(sparkTexture(), p[0], p[1], { life: 0.3, tint: 0xff9a4a, scale: (unit / 180) * 0.35, grow: -1 });
      smoke.puff(p[0], p[1], { size: unit * 0.1, life: 0.8, tint: 0x6a7076, alpha: 0.5 });
    }
    if (!hit && t > 0.6) {
      hit = true;
      burst(sparks, target[0], target[1], 24, 0xff7a2a, unit * 1.8, { life: 0.5, scale: 0.4, gravity: unit * 2 });
      jolt(board);
    }
    smoke.step(dt);
    sparks.step(dt);
    return t < 1.1 || sparks.list.length > 0 || smoke.list.length > 0;
  });
  g.destroy();
  await done();
}

export async function cleaverPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const blade: [Pt, Pt, Pt, Pt] = [at(0.52, 0.27), at(0.8, 0.12), at(0.93, 0.33), at(0.62, 0.47)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const embers = new Emitter(fx);
  const arm: [Pt, Pt] = [at(0.08, 0.46), at(0.47, 0.33)];
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    const trace = ease.out(span(t, 0, 0.5));
    const pts = [...blade, blade[0]];
    const total = 4 * trace;
    g.moveTo(...pts[0]);
    for (let i = 0; i < 4; i++) {
      const f = Math.min(1, Math.max(0, total - i));
      if (f <= 0) break;
      g.lineTo(...lerp(pts[i], pts[i + 1], f));
    }
    g.stroke({ width: 1.6, color: 0xffd6e0, alpha: 0.85 * fade });
    const s = ease.inOut(span(t, 0.45, 1.15));
    if (s > 0 && s < 1) {
      const a = bilinear(blade, s, 0);
      const b = bilinear(blade, s, 1);
      g.moveTo(...a)
        .lineTo(...b)
        .stroke({ width: unit * 0.05, color: 0xff6a8a, alpha: 0.25 });
      g.moveTo(...a)
        .lineTo(...b)
        .stroke({ width: 2, color: WHITE, alpha: 0.9 });
    }
    if (t < 1.3 && Math.random() < 0.6) {
      const p = lerp(arm[0], arm[1], Math.random());
      embers.add(sparkTexture(), p[0] + rnd(-1, 1) * unit * 0.03, p[1] + rnd(-1, 1) * unit * 0.03, { vx: unit * rnd(0.1, 0.4), vy: -unit * rnd(0.1, 0.3), life: 0.6, tint: Math.random() < 0.3 ? 0xffd0a0 : 0xff5a2a, scale: (unit / 180) * 0.25 });
    }
    embers.step(dt);
    return t < 1.7 || embers.list.length > 0;
  });
  await done();
}

export async function cookbook(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const book = at(0.52, 0.33);
  const glow = glowSprite(fx, glowTexture(), 0xffc35a);
  glow.position.set(...book);
  const plates = Array.from({ length: 6 }, (_, i) => ({ s: glowSprite(fx, plateTexture(), 0xffc870), from: at(0.35 + i * 0.07, rnd(0.3, 0.38)), drift: [rnd(-0.12, -0.02), rnd(-0.2, -0.12)] as Pt, d: i * 0.15, spin: rnd(-0.4, 0.4) }));
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const f = Math.sin(Math.PI * span(t, 0, 1.8));
    glow.alpha = 0.4 * f;
    glow.scale.set((unit / 128) * 0.5, (unit / 128) * 0.3);
    for (const p of plates) {
      const k = span(t, p.d, p.d + 1);
      const e = ease.out(k);
      const to = at(0.35 + p.d * 0.45 + p.drift[0], 0.34 + p.drift[1]);
      const pos = lerp(p.from, [to[0], to[1]], e);
      p.s.position.set(...pos);
      p.s.rotation = -0.25 + p.spin * e;
      p.s.alpha = k > 0 && k < 1 ? 0.75 * Math.sin(Math.PI * k) : 0;
      p.s.scale.set((unit / 180) * 1.1);
      if (k > 0 && k < 0.8 && Math.random() < 0.2) motes.add(sparkTexture(), ...pos, { vy: -unit * 0.1, life: 0.5, tint: 0xffe0a0, scale: (unit / 180) * 0.2 });
    }
    motes.step(dt);
    return t < 1.9 || motes.list.length > 0;
  });
  await done();
}

export async function knickknack(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const palm = at(0.26, 0.31);
  const him = at(0.62, 0.22);
  const bowl = at(0.48, 0.36);
  const story = glowSprite(fx, glowTexture(), 0x4fe0ff);
  const glint = glowSprite(fx, sparkTexture(), WHITE);
  glint.position.set(...at(0.63, 0.205));
  const trail = new Emitter(fx);
  const smoke = new Smoke(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0.3, 1.1));
    const p = bezier(palm, at(0.42, 0.12), him, k);
    story.position.set(...p);
    story.alpha = t < 1.15 ? 0.45 * span(t, 0, 0.3) : 0;
    story.scale.set((unit / 128) * (0.06 + 0.015 * Math.sin(t * 12)));
    if (k > 0 && k < 1 && Math.random() < 0.8) trail.add(sparkTexture(), ...p, { life: 0.45, tint: 0x8ff0ff, scale: (unit / 180) * 0.3, grow: -0.6 });
    const g2 = Math.sin(Math.PI * span(t, 1.1, 1.5));
    glint.alpha = g2;
    glint.rotation = t * 2;
    glint.scale.set((unit / 120) * 0.25 * g2);
    if (t < 1.4 && Math.random() < 0.5) smoke.puff(bowl[0] + rnd(-1, 1) * unit * 0.08, bowl[1] - unit * 0.02, { vy: -unit * rnd(0.15, 0.3), vx: rnd(-1, 1) * unit * 0.03, size: unit * 0.13, life: 1.3, grow: 2.2, tint: 0xf4f0e8, alpha: 0.5 });
    trail.step(dt);
    smoke.step(dt);
    return t < 1.6 || smoke.list.length > 0 || trail.list.length > 0;
  });
  await done();
}

export async function aboveTheLaw(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sat = at(0.69, 0.165);
  const consoleAt = at(0.45, 0.34);
  const beacon = glowSprite(fx, sparkTexture(), 0xbfe8ff);
  beacon.position.set(...sat);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const blink = Math.floor(t * 6) % 2 ? 1 : 0.4;
    beacon.alpha = blink * fade;
    beacon.rotation = t;
    beacon.scale.set((unit / 120) * 0.45);
    const k = ease.out(span(t, 0.3, 0.7));
    if (k > 0) {
      const tip = lerp(sat, consoleAt, k);
      g.poly([sat[0] - unit * 0.004, sat[1], sat[0] + unit * 0.004, sat[1], tip[0] + unit * 0.06, tip[1], tip[0] - unit * 0.06, tip[1]]).fill({ color: 0x8fd8ff, alpha: 0.18 * fade });
      g.moveTo(...sat)
        .lineTo(...tip)
        .stroke({ width: 1.2, color: 0xdff4ff, alpha: 0.8 * fade });
    }
    const lock = span(t, 0.7, 1.1);
    if (lock > 0) {
      const R = unit * (0.16 - 0.08 * ease.out(lock));
      g.circle(...consoleAt, R).stroke({ width: 1.5, color: 0x8fd8ff, alpha: 0.9 * fade });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + (1 - ease.out(lock)) * 1.5;
        g.moveTo(consoleAt[0] + Math.cos(a) * R * 0.5, consoleAt[1] + Math.sin(a) * R * 0.5).lineTo(consoleAt[0] + Math.cos(a) * R * 1.4, consoleAt[1] + Math.sin(a) * R * 1.4);
      }
      g.stroke({ width: 1.5, color: 0x8fd8ff, alpha: 0.9 * fade });
      for (let i = 0; i < 5; i++) {
        const v = 0.315 + i * 0.012;
        const w = 0.04 + 0.06 * Math.abs(Math.sin(t * 5 + i));
        g.moveTo(...at(0.37, v))
          .lineTo(...at(0.37 + w, v))
          .stroke({ width: 1, color: 0x9ef0ff, alpha: 0.6 * fade * lock });
      }
    }
    return t < 1.9;
  });
  await done();
}

export async function amazeAmusements(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const apex = at(0.38, 0.08);
  const base = at(0.46, 0.43);
  const rings = 9;
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glints = Array.from({ length: rings }, () => glowSprite(fx, sparkTexture(), WHITE));
  const star = glowSprite(fx, sparkTexture(), 0xfff0b0);
  star.position.set(...apex);
  const flare = glowSprite(fx, glowTexture(), 0xbfe8ff);
  flare.position.set(...at(0.75, 0.27));
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    for (let i = 0; i < rings; i++) {
      const r = 1 - i / (rings - 1);
      const c = lerp(apex, base, 0.12 + 0.88 * r);
      const rx = rect.width * (0.04 + 0.22 * r);
      const ry = rx * 0.26;
      const d = 0.1 + i * 0.09;
      const on = span(t, d, d + 0.25);
      if (on <= 0) {
        glints[i].alpha = 0;
        continue;
      }
      g.ellipse(c[0], c[1], rx, ry).stroke({ width: 1.6, color: 0xffd860, alpha: (0.9 - 0.5 * span(t, d + 0.25, d + 0.8)) * fade });
      const a = t * 5 + i;
      glints[i].position.set(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry);
      glints[i].alpha = on * fade * (Math.sin(a) > 0 ? 1 : 0.35);
      glints[i].scale.set((unit / 120) * 0.28);
    }
    const s = Math.sin(Math.PI * span(t, 0.95, 1.6));
    star.alpha = s;
    star.rotation = t * 2;
    star.scale.set((unit / 120) * 0.8 * s);
    flare.alpha = 0.5 * s;
    flare.scale.set((unit / 128) * 0.3);
    return t < 1.9;
  });
  await done();
}

export async function anoeticVoid(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const orbs: Pt[] = [at(0.45, 0.16), at(0.68, 0.15)];
  const between = at(0.565, 0.155);
  const rays = new GodrayFilter({ angle: 0, gain: 0.55, lacunarity: 2.6, alpha: 0, parallel: false, center: { x: 0, y: 0 } });
  card.filters = [rays];
  const glows = orbs.map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xffb060);
    s.position.set(...p);
    return s;
  });
  const embers = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const f = Math.sin(Math.PI * span(t, 0, 1.9));
    const p = filterPoint(card, between[0], between[1]);
    rays.center = { x: p.x, y: p.y };
    rays.alpha = 0.65 * f;
    rays.time = t * 0.7;
    glows.forEach((gl, i) => {
      const ignite = ease.out(span(t, 0.1 + i * 0.2, 0.6 + i * 0.2)) * (1 - span(t, 1.5, 1.9));
      gl.alpha = 0.7 * ignite;
      gl.scale.set((unit / 128) * (0.15 + 0.2 * ignite));
    });
    if (t < 1.5)
      for (let n = 0; n < 2; n++) {
        const x = rnd(0.05, 0.95);
        embers.add(sparkTexture(), ...at(x, rnd(0.35, 0.5)), { vx: (0.5 - x) * unit * 0.3, vy: -unit * rnd(0.3, 0.6), life: rnd(0.7, 1.1), tint: Math.random() < 0.3 ? 0xffe0a0 : 0xff6a2a, scale: (unit / 180) * rnd(0.15, 0.3) });
      }
    embers.step(dt);
    return t < 1.9 || embers.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function anselFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.58, 0.77);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const facets = Array.from({ length: 9 }, (_, i) => {
    const s = glowSprite(world, facetTexture(), i % 3 === 0 ? 0xff9a4a : 0x6ff0e6);
    return { s, d: 0.3 + i * 0.04, off: [rnd(-1, 1) * unit * 0.4, rnd(-1, 1) * unit * 0.4] as Pt, spin: rnd(-6, 6), size: rnd(0.5, 0.9) };
  });
  const sparks = new Emitter(world);
  const target = runnerAt(board);
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    for (let i = 0; i < 4; i++) {
      const r = unit * (0.03 + i * 0.03) * (1 + 0.6 * ease.out(span(t, 0, 0.35)));
      const a = t * (i % 2 ? -9 : 7);
      g.moveTo(eye[0] + Math.cos(a) * r, eye[1] + Math.sin(a) * r)
        .arc(eye[0], eye[1], r, a, a + Math.PI * 1.3)
        .stroke({ width: 1.6, color: 0x6ff0e6, alpha: 0.9 * (1 - span(t, 0.4, 0.7)) });
    }
    const src = root.toGlobal({ x: eye[0], y: eye[1] });
    for (const fc of facets) {
      const k = span(t, fc.d, fc.d + 0.45);
      const ctrl: Pt = [(src.x + target[0]) / 2 + fc.off[0], (src.y + target[1]) / 2 + fc.off[1]];
      fc.s.position.set(...bezier([src.x, src.y], ctrl, target, ease.inOut(k)));
      fc.s.rotation = t * fc.spin;
      fc.s.alpha = k > 0 && k < 1 ? 0.9 : 0;
      fc.s.scale.set((unit / 180) * fc.size);
    }
    if (!hit && t > 0.8) {
      hit = true;
      for (let i = 0; i < 20; i++) sparks.add(triTexture(), ...target, { vx: rnd(-1, 1) * unit * 2, vy: rnd(-1.4, 0.2) * unit * 1.6, gravity: unit * 3, spin: rnd(-8, 8), life: 0.6, tint: i % 3 ? 0x6ff0e6 : 0xff9a4a, scale: (unit / 180) * rnd(0.25, 0.45), alpha: 0.85 });
      jolt(board);
    }
    sparks.step(dt);
    return t < 1.2 || sparks.list.length > 0;
  });
  await done();
}

export async function betaBuild(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const glitch = new GlitchFilter({ slices: 12, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const glow = new GlowFilter({ color: 0xd8c8ff, distance: 12, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const visor = glowSprite(fx, glowTexture(), 0x7dff9a);
  visor.position.set(...at(0.39, 0.15));
  const voxels = Array.from({ length: 40 }, () => {
    const to = at(rnd(0.2, 0.75), rnd(0.12, 0.48));
    const a = rnd(0, Math.PI * 2);
    return { s: glowSprite(fx, cubeTexture(), Math.random() < 0.7 ? 0xe0d4ff : 0x9dffb0), to, from: [to[0] + Math.cos(a) * unit * rnd(0.6, 1), to[1] + Math.sin(a) * unit * rnd(0.6, 1)] as Pt, d: rnd(0, 0.5) };
  });
  root.addChild(fx);
  await run(app, (t) => {
    for (const v of voxels) {
      const k = span(t, v.d, v.d + 0.55);
      v.s.position.set(...lerp(v.from, v.to, ease.inOut(k)));
      v.s.alpha = k > 0 ? 0.85 * (1 - span(t, 1.05, 1.3)) : 0;
      v.s.rotation = (1 - k) * 4;
      v.s.scale.set((unit / 180) * 0.35);
    }
    const built = span(t, 1, 1.25);
    const flick = built > 0 && built < 1 && Math.random() < 0.6;
    card.filters = flick ? [glow, glitch] : [glow];
    glitch.offset = unit * 0.02;
    glitch.seed = Math.random();
    glow.outerStrength = 2.2 * Math.sin(Math.PI * span(t, 0.8, 1.9));
    const on = span(t, 1.1, 1.3) * (1 - span(t, 1.7, 1.9));
    visor.alpha = on * (0.7 + 0.3 * Math.sin(t * 14));
    visor.scale.set((unit / 128) * 0.12);
    return t < 1.9;
  });
  card.filters = [];
  await done();
}

export async function blingPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const band: [Pt, Pt, Pt, Pt] = [at(0.45, 0.27), at(0.62, 0.23), at(0.72, 0.4), at(0.55, 0.48)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const halo = glowSprite(fx, glowTexture(), 0x6ad8ff);
  halo.position.set(...at(0.6, 0.35));
  const gems = [at(0.52, 0.33), at(0.52, 0.37), at(0.5, 0.41)].map((p, i) => {
    const s = glowSprite(fx, sparkTexture(), [0x8aff8a, 0xd08aff, 0xffe08a][i]);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    for (let i = 0; i < 7; i++) {
      const s = ((t * 0.9 + i / 7) % 1) * span(t, 0, 0.3) * fade;
      g.moveTo(...bilinear(band, 0, s))
        .lineTo(...bilinear(band, 1, s))
        .stroke({ width: 1, color: 0x9ae8ff, alpha: 0.45 * s * (1 - s) * 4 });
    }
    const sweep = ease.inOut(span(t, 0.2, 0.9));
    if (sweep > 0 && sweep < 1) {
      g.moveTo(...bilinear(band, sweep, 0))
        .lineTo(...bilinear(band, sweep, 1))
        .stroke({ width: unit * 0.03, color: 0x6ad8ff, alpha: 0.3 });
      g.moveTo(...bilinear(band, sweep, 0))
        .lineTo(...bilinear(band, sweep, 1))
        .stroke({ width: 1.8, color: WHITE, alpha: 0.9 });
    }
    halo.alpha = 0.35 * Math.sin(Math.PI * span(t, 0.1, 1.6));
    halo.scale.set((unit / 128) * 0.45, (unit / 128) * 0.35);
    gems.forEach((gm, i) => {
      const f = Math.sin(Math.PI * span(t, 0.8 + i * 0.12, 1.3 + i * 0.12));
      gm.alpha = f;
      gm.rotation = t * 2;
      gm.scale.set((unit / 120) * 0.35 * f);
    });
    return t < 1.8;
  });
  await done();
}

export async function charmOffensive(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const him = at(0.58, 0.2);
  const her = at(0.79, 0.26);
  const flushes = [him, her].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0xffa07a);
    s.position.set(...p);
    return s;
  });
  const spark = glowSprite(fx, sparkTexture(), 0xffc8a0);
  const trail = new Emitter(fx);
  const twinkle = glowSprite(fx, sparkTexture(), WHITE);
  twinkle.position.set(...at(0.6, 0.23));
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0.35, 1));
    const p = bezier(him, at(0.69, 0.12), her, k);
    spark.position.set(...p);
    spark.alpha = k > 0 && k < 1 ? 1 : 0;
    spark.rotation = t * 3;
    spark.scale.set((unit / 120) * 0.2);
    if (k > 0 && k < 1 && Math.random() < 0.9) trail.add(sparkTexture(), ...p, { vy: unit * 0.05, life: 0.6, tint: Math.random() < 0.5 ? 0xffd890 : 0xffa0b8, scale: (unit / 180) * 0.25, grow: -0.3 });
    const tw = Math.sin(Math.PI * span(t, 0.1, 0.45));
    twinkle.alpha = 0.7 * tw;
    twinkle.scale.set((unit / 120) * 0.2 * tw);
    flushes[0].alpha = 0.35 * Math.sin(Math.PI * span(t, 0.1, 1.7));
    flushes[1].alpha = 0.45 * Math.sin(Math.PI * span(t, 0.9, 1.9));
    for (const f of flushes) f.scale.set((unit / 128) * 0.28);
    trail.step(dt);
    return t < 1.9 || trail.list.length > 0;
  });
  await done();
}

export async function cacophonyPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const beak = at(0.3, 0.2);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const shards = new Emitter(fx);
  const colors = [0xff4fb0, 0x4fe0ff, 0x8aff6a, 0xffd84a];
  const beats = [0.15, 0.55, 0.95];
  const hit = beats.map(() => false);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    beats.forEach((b, i) => {
      const k = span(t, b, b + 0.7);
      if (k > 0 && k < 1) {
        const R = unit * (0.08 + 0.75 * ease.out(k));
        g.moveTo(beak[0] + R, beak[1]);
        for (let s = 1; s <= 40; s++) {
          const a = (s / 40) * Math.PI * 2;
          const r = R * (1 + 0.08 * Math.sin(a * 7 + t * 20));
          g.lineTo(beak[0] + Math.cos(a) * r, beak[1] + Math.sin(a) * r);
        }
        g.stroke({ width: 2 * (1 - k) + 0.6, color: colors[i], alpha: 0.7 * (1 - k) });
      }
      if (!hit[i] && t > b) {
        hit[i] = true;
        for (let n = 0; n < 10; n++) {
          const a = rnd(0, Math.PI * 2);
          shards.add(triTexture(), beak[0] + Math.cos(a) * unit * 0.1, beak[1] + Math.sin(a) * unit * 0.1, { vx: Math.cos(a) * unit * rnd(0.5, 1.1), vy: Math.sin(a) * unit * rnd(0.5, 1.1), drag: 1.5, spin: rnd(-6, 6), life: 0.8, tint: colors[n % 4], scale: (unit / 180) * rnd(0.25, 0.45), alpha: 0.9 });
        }
      }
    });
    const thump = Math.max(...beats.map((b) => Math.max(0, 1 - Math.abs(t - b - 0.03) * 10)));
    split.red = { x: unit * 0.008 * thump, y: 0 };
    split.blue = { x: -unit * 0.008 * thump, y: 0 };
    shards.step(dt);
    return t < 1.7 || shards.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function cacophony(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, world, done, unit, at } = await scene(rect, code, ready, board);
  const beak = at(0.3, 0.2);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const shards = new Emitter(world);
  const colors = [0xff4fb0, 0x4fe0ff, 0x8aff6a, 0xffd84a];
  let burstDone = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    const src = root.toGlobal({ x: beak[0], y: beak[1] });
    const on = 1 - span(t, 0.3, 0.6);
    split.red = { x: unit * 0.01 * on * Math.sin(t * 40), y: 0 };
    split.blue = { x: -unit * 0.01 * on * Math.sin(t * 33), y: 0 };
    if (!burstDone && t > 0.1) {
      burstDone = true;
      for (let n = 0; n < 40; n++) {
        const a = rnd(0, Math.PI * 2);
        const v = unit * rnd(1.2, 2.6);
        shards.add(triTexture(), src.x, src.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 1.8, spin: rnd(-8, 8), life: rnd(0.7, 1.1), tint: colors[n % 4], scale: (unit / 180) * rnd(0.3, 0.6), alpha: 0.9 });
      }
    }
    shards.step(dt);
    return t < 0.6 || shards.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function detentePose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const holo: [Pt, Pt, Pt, Pt] = [at(0.29, 0.21), at(0.45, 0.24), at(0.43, 0.34), at(0.27, 0.31)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glitch = new GlitchFilter({ slices: 6, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const chips = [at(0.17, 0.47), at(0.27, 0.5)].map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xffb0b0);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    const on = span(t, 0, 0.2) * fade;
    g.poly(holo.flat())
      .fill({ color: 0x6ad8ff, alpha: 0.1 * on })
      .stroke({ width: 1.4, color: 0xbfeeff, alpha: 0.75 * on });
    const v = (t * 1.2) % 1;
    g.moveTo(...bilinear(holo, 0, v))
      .lineTo(...bilinear(holo, 1, v))
      .stroke({ width: 1.6, color: WHITE, alpha: 0.8 * on });
    for (let i = 1; i < 6; i++)
      g.moveTo(...bilinear(holo, 0, i / 6))
        .lineTo(...bilinear(holo, 1, i / 6))
        .stroke({ width: 1, color: 0x6ad8ff, alpha: 0.18 * on });
    const flick = t > 0.4 && t < 1.2 && Math.random() < 0.12;
    card.filters = flick ? [glitch] : [];
    glitch.offset = unit * 0.01;
    glitch.seed = Math.random();
    chips.forEach((c, i) => {
      const f = Math.sin(Math.PI * span(t, 0.6 + i * 0.25, 1.1 + i * 0.25));
      c.alpha = f;
      c.rotation = t * 2;
      c.scale.set((unit / 120) * 0.35 * f);
    });
    return t < 1.7;
  });
  card.filters = [];
  await done();
}

export async function detente(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const holo: [Pt, Pt, Pt, Pt] = [at(0.29, 0.21), at(0.45, 0.24), at(0.43, 0.34), at(0.27, 0.31)];
  const face = at(0.36, 0.27);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [split];
  const flash = glowSprite(fx, glowTexture(), 0x8fe8ff);
  flash.position.set(...face);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 0.8, 1.1);
    const pulse = Math.sin(Math.PI * span(t, 0, 0.5));
    flash.alpha = 0.6 * pulse;
    flash.scale.set((unit / 128) * (0.15 + 0.15 * pulse));
    const j = pulse * unit * 0.012;
    split.red = { x: j, y: 0 };
    split.blue = { x: -j, y: 0 };
    for (let i = 0; i < 3; i++) {
      const k = span(t, i * 0.12, i * 0.12 + 0.6);
      if (k <= 0 || k >= 1) continue;
      const grow = 1 + 0.8 * ease.out(k);
      const q = holo.map((p) => [face[0] + (p[0] - face[0]) * grow, face[1] + (p[1] - face[1]) * grow] as Pt);
      g.poly(q.flat()).stroke({ width: 1.5 * (1 - k) + 0.5, color: 0x8fe8ff, alpha: 0.8 * (1 - k) * fade });
    }
    return t < 1.1;
  });
  card.filters = [];
  await done();
}

export async function devadattaDrone(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const queen = at(0.52, 0.36);
  const swarm: [Pt, number][] = [
    [at(0.12, 0.16), 0.6],
    [at(0.5, 0.17), 0.7],
    [at(0.83, 0.17), 0.7],
    [at(0.2, 0.33), 0.8],
    [at(0.82, 0.43), 0.8],
    [at(0.27, 0.45), 0.7],
    [at(0.62, 0.45), 0.6],
  ];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const eyes = [at(0.49, 0.36), at(0.56, 0.36)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x9aff5a);
    s.position.set(...p);
    return s;
  });
  const glows = swarm.map(([p]) => {
    const s = glowSprite(fx, glowTexture(), 0xbfe8ff);
    s.position.set(...p);
    return s;
  });
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const wake = span(t, 0.05, 0.35) * fade;
    for (const e of eyes) {
      e.alpha = 0.8 * wake;
      e.scale.set((unit / 128) * 0.06);
    }
    for (let i = 0; i < 3; i++) {
      const k = span(t, 0.2 + i * 0.25, 0.9 + i * 0.25);
      if (k > 0 && k < 1) g.circle(...queen, unit * (0.06 + 0.3 * ease.out(k))).stroke({ width: 1.4, color: 0x9aff5a, alpha: 0.5 * (1 - k) * fade });
    }
    swarm.forEach(([p, s], i) => {
      const d = 0.25 + (Math.hypot(p[0] - queen[0], p[1] - queen[1]) / unit) * 0.9;
      const f = span(t, d, d + 0.15) * fade;
      glows[i].alpha = 0.5 * f * (0.7 + 0.3 * Math.sin(t * 40 + i));
      glows[i].scale.set((unit / 128) * 0.1 * s);
      if (f > 0) {
        const w = unit * 0.05 * s;
        const flap = Math.sin(t * 50 + i) * 0.3;
        for (const side of [-1, 1])
          g.moveTo(...p)
            .quadraticCurveTo(p[0] + side * w, p[1] - w * (1 + flap), p[0] + side * w * 1.4, p[1] - w * 0.2)
            .stroke({ width: 1, color: 0xe0f4ff, alpha: 0.6 * f });
      }
    });
    return t < 1.9;
  });
  await done();
}

export async function docklandsPass(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hands = at(0.43, 0.37);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glow = glowSprite(fx, glowTexture(), 0x8fe0ff);
  glow.position.set(...hands);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    const rise = ease.out(span(t, 0.1, 0.6));
    const c: Pt = [hands[0], hands[1] - unit * 0.12 * rise];
    const w = unit * 0.16;
    const h = unit * 0.1;
    if (rise > 0) {
      g.roundRect(c[0] - w / 2, c[1] - h / 2, w, h, unit * 0.012)
        .fill({ color: 0x6ad8ff, alpha: 0.12 * fade })
        .stroke({ width: 1.5, color: 0xd0f4ff, alpha: 0.85 * fade * rise });
      g.circle(c[0] - w * 0.27, c[1], h * 0.25).stroke({ width: 1, color: 0xd0f4ff, alpha: 0.7 * fade * rise });
      for (let i = 0; i < 3; i++)
        g.moveTo(c[0] - w * 0.05, c[1] - h * 0.2 + i * h * 0.2)
          .lineTo(c[0] + w * (0.35 - i * 0.08), c[1] - h * 0.2 + i * h * 0.2)
          .stroke({ width: 1, color: 0xd0f4ff, alpha: 0.6 * fade * rise });
    }
    const ok = span(t, 0.7, 0.9);
    if (ok > 0) {
      g.moveTo(c[0] + w * 0.22, c[1] + h * 0.15)
        .lineTo(c[0] + w * 0.3, c[1] + h * 0.3)
        .lineTo(c[0] + w * 0.45, c[1] - h * 0.05)
        .stroke({ width: 2, color: 0x6aff9a, alpha: ok * fade });
    }
    const open = ease.inOut(span(t, 0.8, 1.4));
    if (open > 0) {
      const gap = 0.02 + 0.06 * open;
      for (const side of [-1, 1])
        g.moveTo(...at(0.86 + side * gap, 0.1))
          .lineTo(...at(0.86 + side * gap, 0.4))
          .stroke({ width: 2, color: WHITE, alpha: 0.7 * fade });
      g.poly([...at(0.86 - gap, 0.1), ...at(0.86 + gap, 0.1), ...at(0.86 + gap, 0.4), ...at(0.86 - gap, 0.4)]).fill({ color: 0xd8f0ff, alpha: 0.2 * fade });
    }
    glow.alpha = 0.5 * Math.sin(Math.PI * span(t, 0, 1.4));
    glow.scale.set((unit / 128) * 0.25);
    if (t < 0.7 && Math.random() < 0.5) motes.add(sparkTexture(), hands[0] + rnd(-1, 1) * unit * 0.06, hands[1], { vy: -unit * rnd(0.15, 0.3), life: 0.5, tint: 0x8fe0ff, scale: (unit / 180) * 0.2 });
    motes.step(dt);
    return t < 1.8 || motes.list.length > 0;
  });
  await done();
}

const RODS: [number, number, number, number][] = [
  [0.2, 0.6, 0.33, 0.92],
  [0.27, 0.58, 0.4, 0.93],
  [0.37, 0.57, 0.48, 0.93],
  [0.47, 0.55, 0.56, 0.93],
  [0.58, 0.54, 0.66, 0.93],
];

export async function diviner(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const bubbles = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    RODS.forEach(([u0, v0, u1, v1], i) => {
      const k = ease.out(span(t, 0.05 + i * 0.12, 0.7 + i * 0.12));
      if (k <= 0) return;
      const bottom = at(u1, v1);
      const top = at(u0, v0);
      const level = lerp(bottom, top, k);
      g.moveTo(...bottom)
        .lineTo(...level)
        .stroke({ width: unit * 0.035, color: 0x3dff7a, alpha: 0.3 * fade, cap: "round" });
      g.moveTo(...bottom)
        .lineTo(...level)
        .stroke({ width: 1.4, color: 0xd0ffd8, alpha: 0.8 * fade, cap: "round" });
      g.circle(...level, unit * 0.012).fill({ color: WHITE, alpha: 0.9 * fade * (k < 1 ? 1 : 0.4) });
      if (k > 0.1 && Math.random() < 0.3) bubbles.add(glowTexture(), ...lerp(bottom, level, Math.random()), { vx: (top[0] - bottom[0]) * 0.4, vy: (top[1] - bottom[1]) * 0.4, life: 0.5, tint: 0x9affb0, scale: (unit / 128) * 0.02, alpha: 0.8 });
    });
    bubbles.step(dt);
    return t < 1.8 || bubbles.list.length > 0;
  });
  await done();
}

export async function divinerFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const w = new Graphics();
  w.blendMode = "add";
  world.addChild(w);
  const target = runnerAt(board);
  const pick = 2;
  let hit = false;
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    w.clear();
    const shake = t < 0.45 ? Math.sin(t * 60) * unit * 0.008 : 0;
    RODS.forEach(([u0, v0, u1, v1], i) => {
      if (i === pick && t > 0.45) return;
      const a = at(u0, v0);
      const b = at(u1, v1);
      const on = (1 - span(t, 0.9, 1.3)) * span(t, 0, 0.1);
      g.moveTo(a[0] + shake, a[1])
        .lineTo(b[0] + shake, b[1])
        .stroke({ width: 1.4, color: 0xd0ffd8, alpha: 0.7 * on, cap: "round" });
    });
    const k = span(t, 0.45, 0.8);
    if (k > 0 && k < 1) {
      const [u0, v0, u1, v1] = RODS[pick];
      const mid = at((u0 + u1) / 2, (v0 + v1) / 2);
      const src = root.toGlobal({ x: mid[0], y: mid[1] });
      const p = lerp([src.x, src.y], target, ease.inOut(k));
      const dir = Math.atan2(target[1] - src.y, target[0] - src.x) + k * 8;
      const L = unit * 0.2;
      const e: Pt = [Math.cos(dir) * L, Math.sin(dir) * L];
      w.moveTo(p[0] - e[0], p[1] - e[1])
        .lineTo(p[0] + e[0], p[1] + e[1])
        .stroke({ width: unit * 0.04, color: 0x3dff7a, alpha: 0.35, cap: "round" });
      w.moveTo(p[0] - e[0], p[1] - e[1])
        .lineTo(p[0] + e[0], p[1] + e[1])
        .stroke({ width: 2, color: 0xe0ffe8, alpha: 0.95, cap: "round" });
    }
    const r = span(t, 0.8, 1.3);
    if (r > 0 && r < 1) {
      for (let i = 0; i < 6; i++) {
        const y = target[1] - unit * 0.15 + i * unit * 0.06;
        const broken = (i * 7 + 3) % 3 === 0;
        const half = unit * 0.18;
        if (broken) {
          w.moveTo(target[0] - half, y).lineTo(target[0] - half * 0.2, y);
          w.moveTo(target[0] + half * 0.2, y).lineTo(target[0] + half, y);
        } else w.moveTo(target[0] - half, y).lineTo(target[0] + half, y);
      }
      w.stroke({ width: unit * 0.02, color: 0x3dff7a, alpha: 0.8 * (1 - r) });
    }
    if (!hit && t > 0.8) {
      hit = true;
      jolt(board, 0.35);
    }
    return t < 1.3;
  });
  w.destroy();
  await done();
}
