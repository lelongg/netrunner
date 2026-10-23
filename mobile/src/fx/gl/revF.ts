import { Graphics, Sprite } from "pixi.js";
import { GlitchFilter } from "pixi-filters";
import { Emitter, ease, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, Fire, GOLD, type Ready, Smoke, WHITE, coinTexture, flyHome, homing, pt, scene, shimmer } from "./kit";
import { type Pt, glyphTexture, glowSprite, lerp, rnd, strikeFx } from "./more";
import { bezier, jolt } from "./sixth";

function blaze(fire: Fire, x: number, y: number, r: number, n: number) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const d = Math.sqrt(Math.random());
    const v = r * (1 + 2 * d);
    fire.emit(x + Math.cos(a) * r * 0.2 * d, y + Math.sin(a) * r * 0.2 * d, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8, size: r * rnd(0.5, 0.9) * (1.2 - d * 0.5), life: rnd(0.6, 1) });
  }
}

export async function flyswatterFire(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const arc = (s: number, r: number): Pt => at(0.66 + 0.5 * r * Math.cos(Math.PI * (0.9 + 0.8 * s)), 0.97 + 0.46 * r * Math.sin(Math.PI * (0.9 + 0.8 * s)));
  const inside = (s: number, r: number): Pt => {
    const a = Math.PI * (0.9 + 0.8 * s);
    return at(Math.min(0.97, Math.max(0.03, 0.66 + 0.5 * r * Math.cos(a))), Math.min(0.97, Math.max(0.535, 0.97 + 0.46 * r * Math.sin(a))));
  };
  const hot: Pt[] = [at(0.45, 0.78), at(0.68, 0.8), at(0.3, 0.9)];
  const glow = new Sprite(card.texture);
  glow.anchor.copyFrom(card.anchor);
  glow.position.copyFrom(card.position);
  glow.scale.copyFrom(card.scale);
  glow.rotation = card.rotation;
  glow.blendMode = "add";
  glow.tint = 0x8fd0ff;
  const band = new Graphics();
  glow.mask = band;
  root.addChild(band, glow);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const zap = new Graphics();
  zap.blendMode = "add";
  world.addChild(zap);
  const flares = hot.map((p) => {
    const s = glowSprite(fx, sparkTexture(), 0xe0f4ff);
    s.position.set(...p);
    return s;
  });
  const sparks = new Emitter(fx);
  const target = board?.runner ? pt(board.runner) : null;
  let hit = false;
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    zap.clear();
    band.clear();
    const fade = 1 - span(t, 1, 1.35);
    const w = ease.inOut(span(t, 0.05, 0.9));
    const r1 = 0.1 + 1.05 * w;
    const r0 = Math.max(0, r1 - 0.28);
    const pts: number[] = [];
    for (let k = 0; k <= 24; k++) pts.push(...inside(k / 24, r1));
    for (let k = 24; k >= 0; k--) pts.push(...inside(k / 24, r0));
    band.poly(pts).fill(0xffffff);
    glow.alpha = 0.55 * fade * span(t, 0.05, 0.2);
    const head = ease.inOut(span(t, 0.55, 1));
    if (head > 0 && head < 1) {
      const tail = Math.max(0, head - 0.4);
      for (const [lw, c, a] of [
        [unit * 0.035, 0xe8f060, 0.35],
        [unit * 0.012, 0xfaffe0, 0.9],
      ] as const) {
        g.moveTo(...arc(tail, 1));
        for (let k = 1; k <= 20; k++) g.lineTo(...arc(tail + ((head - tail) * k) / 20, 1));
        g.stroke({ width: lw, color: c, alpha: a, cap: "round" });
      }
      if (Math.random() < 0.7) sparks.add(sparkTexture(), ...arc(head, 1), { vx: rnd(-1, 1) * unit * 0.4, vy: rnd(-1, 1) * unit * 0.4, life: 0.3, tint: 0xe8f060, scale: (unit / 180) * 0.3 });
    }
    if (t > 0.3 && t < 0.95 && Math.floor(t * 16) % 2 === 0) {
      const a = hot[Math.floor(rnd(0, hot.length))];
      const b = hot[Math.floor(rnd(0, hot.length))];
      if (a !== b) lightning(g, a[0], a[1], b[0], b[1], unit * 0.1, 0x6ad8ff, unit * 0.008);
    }
    hot.forEach((h, i) => {
      const f = Math.sin(Math.PI * span(t, 0.25 + i * 0.15, 0.65 + i * 0.15));
      flares[i].alpha = 0.8 * f;
      flares[i].rotation = t * 3;
      flares[i].scale.set((unit / 120) * 0.4 * f);
    });
    if (target && t > 0.6 && t < 0.85 && Math.floor(t * 24) % 2 === 0) {
      const src = root.toGlobal({ x: hot[1][0], y: hot[1][1] });
      lightning(zap, src.x, src.y, target[0] + rnd(-1, 1) * unit * 0.2, target[1], unit * 0.4, 0xff6ad0, unit * 0.01);
    }
    if (target && !hit && t > 0.8) {
      hit = true;
      jolt(board, 0.3);
    }
    sparks.step(dt);
    return t < 1.35 || sparks.list.length > 0;
  });
  glow.mask = null;
  zap.destroy();
  await done();
}

export async function gourmand(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, world, fx, done, unit, at } = await scene(rect, code, ready, board);
  const eyes = [at(0.33, 0.325), at(0.43, 0.325)].map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x7dff7a);
    s.position.set(...p);
    return s;
  });
  const mouth = at(0.38, 0.355);
  const knife: [Pt, Pt] = [at(0.7, 0.24), at(0.83, 0.32)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const crumbs = Array.from({ length: 16 }, (_, i) => ({ s: glowSprite(world, sparkTexture(), i % 3 ? 0xb8ff6a : 0xfff0a0), d: 0.35 + i * 0.03, off: rnd(-1, 1) }));
  const from: Pt = board?.access ? pt(board.access) : [0, 0];
  const bolts: [Pt, Pt][] = [
    [at(0.08, 0.13), at(0.2, 0.3)],
    [at(0.88, 0.1), at(0.95, 0.35)],
    [at(0.6, 0.12), at(0.72, 0.2)],
  ];
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.3, 1.7);
    const glare = span(t, 0, 0.2) * fade;
    for (const e of eyes) {
      e.alpha = 0.7 * glare;
      e.scale.set((unit / 128) * 0.07);
    }
    if (t < 1.2 && Math.floor(t * 14) % 3 === 0) {
      const [a, b] = bolts[Math.floor(rnd(0, bolts.length))];
      lightning(g, a[0], a[1], b[0], b[1], unit * 0.08, 0xc8ff5a, unit * 0.004);
    }
    const s = span(t, 0.15, 0.4);
    if (s > 0 && s < 1) {
      const p = lerp(knife[0], knife[1], ease.out(s));
      g.moveTo(...knife[0])
        .lineTo(...p)
        .stroke({ width: 2, color: WHITE, alpha: 0.85 * (1 - s) });
    }
    const src: Pt = board?.access ? [from[0], from[1]] : [mouth[0] + unit * 0.6, mouth[1] - unit * 0.4];
    const dst = root.toGlobal({ x: mouth[0], y: mouth[1] });
    for (const c of crumbs) {
      const k = span(t, c.d, c.d + 0.55);
      const ctrl: Pt = [(src[0] + dst.x) / 2 + c.off * unit * 0.3, Math.min(src[1], dst.y) - unit * 0.3];
      const start: Pt = board?.access ? [src[0] + c.off * unit * 0.15, src[1]] : [src[0] + c.off * unit * 0.2, src[1] + c.off * unit * 0.2];
      c.s.position.set(...bezier(start, ctrl, [dst.x, dst.y], ease.inOut(k)));
      c.s.alpha = k > 0 && k < 1 ? 0.9 : 0;
      c.s.scale.set((unit / 120) * 0.22 * (1 - 0.6 * k));
    }
    return t < 1.7;
  });
  await done();
}

export async function hedgeFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const pit = at(0.5, 0.3);
  const screens: Pt[] = [at(0.47, 0.3), at(0.41, 0.38), at(0.9, 0.33)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glows = screens.map((p) => {
    const s = glowSprite(fx, glowTexture(), 0x9ad8ff);
    s.position.set(...p);
    return s;
  });
  const sources: Pt[] = [at(-0.05, 0.1), at(1.05, 0.15), at(-0.05, 0.45), at(1.05, 0.45), at(0.3, -0.05), at(0.75, -0.05), at(0.5, 0.55), at(0.1, 0.25), at(0.92, 0.22)];
  const flights = sources.map((s, i) => homing(fx, glyphTexture(), s, pit, 0.2 + i * 0.09, 0xe8c860, (unit / 48) * 0.18, rnd(-1, 1) * unit * 0.2));
  const trail = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    const fade = 1 - span(t, 1.6, 2);
    screens.forEach((p, i) => {
      const f = span(t, 0.1 + i * 0.12, 0.3 + i * 0.12) * fade;
      glows[i].alpha = 0.22 * f * (0.8 + 0.2 * Math.sin(t * 9 + i));
      glows[i].scale.set((unit / 128) * 0.1);
    });
    const landed = flyHome(flights, t, trail, 0xe8c860);
    const k = landed / flights.length;
    if (k > 0) g.circle(...pit, unit * (0.05 + 0.08 * k)).stroke({ width: 1.2, color: 0xffe08a, alpha: 0.5 * fade * (1 - span(t, 1.2, 1.6)) });
    trail.step(dt);
    return t < 2 || trail.list.length > 0;
  });
  await done();
}

export async function governmentSubsidy(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hand = at(0.33, 0.3);
  const boss = at(0.74, 0.3);
  const glint = glowSprite(fx, sparkTexture(), 0xffe7a0);
  glint.position.set(...hand);
  const coins = Array.from({ length: 12 }, (_, i) => {
    const s = glowSprite(fx, coinTexture(), WHITE);
    s.blendMode = "normal";
    const keep = i % 6 === 0;
    const away: Pt = keep ? boss : at(rnd(0.1, 0.95), rnd(-0.1, 0.05));
    return { s, keep, to: away, d: 0.35 + i * 0.05, arc: rnd(-1, 1) * unit * 0.2 };
  });
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const f = Math.sin(Math.PI * span(t, 0.05, 0.6));
    glint.alpha = 0.8 * f;
    glint.rotation = t * 2;
    glint.scale.set((unit / 120) * 0.3 * f);
    for (const c of coins) {
      const k = span(t, c.d, c.d + 0.75);
      const e = ease.inOut(k);
      const ctrl: Pt = [(hand[0] + c.to[0]) / 2 + c.arc, Math.min(hand[1], c.to[1]) - unit * 0.12];
      const p = bezier(hand, ctrl, c.to, e);
      c.s.position.set(...p);
      c.s.rotation = t * 4;
      c.s.scale.set((unit / 64) * 0.09 * (c.keep ? 1 : 1 - 0.5 * k));
      c.s.alpha = k <= 0 || k >= 1 ? 0 : c.keep ? 1 : 0.9 * (1 - k);
      if (c.keep && k > 0 && k < 1 && Math.random() < 0.4) motes.add(sparkTexture(), ...p, { life: 0.35, tint: 0xffd870, scale: (unit / 180) * 0.2, grow: -0.5 });
    }
    motes.step(dt);
    return t < 1.6 || motes.list.length > 0;
  });
  await done();
}

export async function measuredResponse(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const blast = at(0.82, 0.24);
  const tail = at(0.22, 0.29);
  const heat = shimmer(root, card, rect, unit * 0.015);
  const smoke = new Smoke(fx);
  const fire = new Fire(fx, undefined, unit * 0.8);
  const debris = new Emitter(fx);
  const streaks = new Graphics();
  streaks.blendMode = "add";
  fx.addChild(streaks);
  const lamp = glowSprite(fx, glowTexture(), 0xff6a4a);
  lamp.position.set(...tail);
  root.addChild(fx);
  const salvo = board?.grip ? Array.from({ length: 5 }, (_, i) => homing(fx, glowTexture(), blast, pt(board.grip!), 0.5 + i * 0.06, 0xff8a3a, (unit / 128) * 0.08, rnd(-1, 1) * unit * 0.6)) : [];
  const pops = [
    { t: 0.1, at: blast, r: 0.1, n: 22 },
    { t: 0.35, at: at(0.7, 0.16), r: 0.06, n: 12 },
    { t: 0.5, at: at(0.93, 0.33), r: 0.06, n: 12 },
    { t: 0.7, at: at(0.68, 0.34), r: 0.05, n: 10 },
  ].map((p) => ({ ...p, done: false }));
  let struck = false;
  const base = card.position.clone();
  await run(app, (t, dt) => {
    for (const p of pops)
      if (!p.done && t > p.t) {
        p.done = true;
        blaze(fire, ...p.at, unit * p.r, p.n);
        for (let i = 0; i < 8; i++) {
          const a = rnd(-Math.PI * 0.95, 0);
          const v = unit * rnd(0.8, 1.8);
          debris.add(sparkTexture(), p.at[0], p.at[1], { vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: unit * 2.6, life: rnd(0.6, 1), tint: 0xffb060, scale: 0.22 * (unit / 180) });
        }
        if (p.t === 0.1) navigator.vibrate?.([40, 30, 80]);
      }
    if (t > 0.3 && t < 1.6 && Math.random() < 0.5) smoke.puff(blast[0] + rnd(-1, 1) * unit * 0.2, blast[1] + rnd(-0.5, 0.3) * unit * 0.12, { vx: rnd(-1, 1) * unit * 0.06, vy: -unit * rnd(0.1, 0.22), life: 1.8, size: unit * rnd(0.16, 0.26), grow: 2.2, tint: 0x2a2220, alpha: 0.5 });
    streaks.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    for (let i = 0; i < 4; i++) {
      const v = 0.255 + i * 0.022;
      const len = 0.08 + 0.06 * Math.abs(Math.sin(t * 7 + i));
      streaks
        .moveTo(...at(0.21, v))
        .lineTo(...at(0.21 - len, v))
        .stroke({ width: 1, color: 0xbfe8ff, alpha: 0.5 * fade * span(t, 0.1, 0.3) });
    }
    lamp.alpha = (0.4 + 0.25 * Math.sin(t * 30)) * fade;
    lamp.scale.set((unit / 128) * 0.08);
    const quake = t > 0.1 && t < 0.5 ? (1 - (t - 0.1) / 0.4) * unit * 0.012 : 0;
    card.position.set(base.x + rnd(-1, 1) * quake, base.y + rnd(-1, 1) * quake);
    heat(t, Math.sin(Math.PI * span(t, 0.1, 1.8)));
    if (flyHome(salvo, t, debris, 0xff8a3a) === salvo.length && salvo.length && !struck) {
      struck = true;
      const [gx, gy] = pt(board!.grip!);
      blaze(fire, gx, gy, unit * 0.07, 12);
    }
    fire.step(dt);
    debris.step(dt);
    smoke.step(dt);
    return t < 1.8 || smoke.list.length > 0 || fire.list.length > 0;
  });
  card.position.copyFrom(base);
  await done();
}

export async function risingTide(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at } = sc;
  const waves: [Pt, Pt, Pt, number][] = [
    [at(-0.02, 0.48), at(0.35, 0.3), at(0.72, 0.47), 0],
    [at(0.05, 0.42), at(0.3, 0.2), at(0.55, 0.36), 0.12],
    [at(1.02, 0.42), at(0.78, 0.22), at(0.6, 0.14), 0.06],
    [at(0.98, 0.5), at(0.8, 0.36), at(0.62, 0.3), 0.18],
  ];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const foam = new Emitter(fx);
  root.addChild(fx);
  const impact = strikeFx(sc, "splash", 0x6ad8ff, at(0.5, 0.2));
  await run(
    app,
    (t, dt) => {
      g.clear();
      const fade = 1 - span(t, 0.9, 1.3);
      for (const [a, b, c, d] of waves) {
        const k = ease.out(span(t, d, d + 0.55));
        if (k <= 0) continue;
        const tail = Math.max(0, k - 0.5);
        for (const [w, col, al] of [
          [unit * 0.07, 0x3aa8ff, 0.35],
          [unit * 0.015, 0xe0f8ff, 0.9],
        ] as const) {
          g.moveTo(...bezier(a, b, c, tail));
          for (let i = 1; i <= 18; i++) g.lineTo(...bezier(a, b, c, tail + ((k - tail) * i) / 18));
          g.stroke({ width: w, color: col, alpha: al * fade, cap: "round" });
        }
        if (k < 1) {
          const p = bezier(a, b, c, k);
          foam.add(glowTexture(), ...p, { vx: rnd(-1, 1) * unit * 0.3, vy: -unit * rnd(0.2, 0.6), gravity: unit * 1.8, life: 0.55, tint: 0xbfeeff, scale: (unit / 128) * rnd(0.015, 0.035) });
        }
      }
      foam.step(dt);
      return t < 1.3 || foam.list.length > 0;
    },
    sc.strike ? 1.4 : 1,
  );
  await impact;
  await done();
}

export async function sangKancilPose(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at, sideways } = await scene(rect, code, ready, board);
  const launch = at(0.47, 0.47);
  const body = at(0.63, 0.27);
  const eye = at(0.77, 0.14);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const splash = new Emitter(fx);
  const glint = glowSprite(fx, sparkTexture(), 0xfff4c0);
  glint.position.set(...eye);
  const lanes = [-0.06, -0.02, 0.02, 0.06].map((o, i) => ({ o, d: 0.1 + i * 0.07 }));
  const dir: Pt = [body[0] - launch[0], body[1] - launch[1]];
  const len = Math.hypot(...dir);
  const nrm: Pt = [-dir[1] / len, dir[0] / len];
  root.addChild(fx);
  let splashed = false;
  await run(app, (t, dt) => {
    g.clear();
    if (!splashed && t > 0.05) {
      splashed = true;
      for (let i = 0; i < 26; i++) splash.add(glowTexture(), launch[0] + rnd(-1, 1) * unit * 0.1, launch[1], { vx: rnd(-1, 1) * unit * 0.5, vy: -unit * rnd(0.3, 0.9), gravity: unit * 2.2, life: 0.75, tint: 0xbfeeff, scale: (unit / 128) * rnd(0.02, 0.04) });
    }
    const r = span(t, 0.05, 0.8);
    if (r > 0 && r < 1) {
      const [rx, ry] = [unit * 0.3 * ease.out(r), unit * 0.06 * ease.out(r)];
      g.ellipse(...launch, sideways ? ry : rx, sideways ? rx : ry).stroke({ width: 2 * (1 - r) + 0.8, color: 0x9be8ff, alpha: 0.8 * (1 - r) });
    }
    for (const l of lanes) {
      const k = span(t, l.d, l.d + 0.5);
      if (k <= 0 || k >= 1) continue;
      const head = 0.2 + 1.1 * ease.out(k);
      const tail = Math.max(0, head - 0.5);
      const off: Pt = [nrm[0] * unit * l.o * 2, nrm[1] * unit * l.o * 2];
      const P = (s: number): Pt => [launch[0] + dir[0] * s + off[0], launch[1] + dir[1] * s + off[1]];
      g.moveTo(...P(tail))
        .lineTo(...P(head))
        .stroke({ width: unit * 0.025, color: 0xffc83a, alpha: 0.3 * (1 - k) });
      g.moveTo(...P(tail))
        .lineTo(...P(head))
        .stroke({ width: 1.6, color: 0xfff0b0, alpha: 0.9 * (1 - k) });
    }
    const gl = Math.sin(Math.PI * span(t, 0.7, 1.2));
    glint.alpha = gl;
    glint.rotation = t * 2;
    glint.scale.set((unit / 120) * 0.35 * gl);
    splash.step(dt);
    return t < 1.3 || splash.list.length > 0;
  });
  await done();
}

export async function spinDoctor(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const man = at(0.63, 0.3);
  const desk: [Pt, Pt, Pt, Pt] = [at(0.2, 0.29), at(0.33, 0.28), at(0.36, 0.45), at(0.22, 0.46)];
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const glitch = new GlitchFilter({ slices: 6, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const panels = 6;
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.5, 1.9);
    const on = span(t, 0, 0.3) * fade;
    const spin = t * 1.8;
    const items = Array.from({ length: panels }, (_, i) => {
      const a = spin + (i / panels) * Math.PI * 2;
      return { a, z: Math.sin(a) };
    }).sort((p, q) => p.z - q.z);
    for (const p of items) {
      const x = man[0] + Math.cos(p.a) * unit * 0.38;
      const y = man[1] + p.z * unit * 0.05;
      const w = unit * 0.11 * (0.75 + 0.25 * p.z) * Math.max(0.25, Math.abs(Math.sin(p.a)));
      const h = unit * 0.075 * (0.75 + 0.25 * p.z);
      const al = on * (p.z > 0 ? 0.8 : 0.3);
      g.rect(x - w / 2, y - h / 2, w, h)
        .fill({ color: 0x6ad0ff, alpha: 0.12 * al })
        .stroke({ width: 1, color: 0xc8f0ff, alpha: al });
      for (let r = 1; r < 3; r++)
        g.moveTo(x - w * 0.35, y - h / 2 + (h * r) / 3)
          .lineTo(x + w * (0.35 - r * 0.1), y - h / 2 + (h * r) / 3)
          .stroke({ width: 1, color: 0xc8f0ff, alpha: 0.6 * al });
    }
    const lerp4 = (s: number, r: number): Pt => lerp(lerp(desk[0], desk[1], s), lerp(desk[3], desk[2], s), r);
    for (let i = 1; i < 7; i++) {
      const r = i / 7;
      const scramble = t < 1 ? Math.random() : 1;
      const len = t < 1 ? 0.3 + 0.6 * scramble : 0.4 + ((i * 37) % 5) * 0.12;
      g.moveTo(...lerp4(0.1, r))
        .lineTo(...lerp4(0.1 + 0.8 * len, r))
        .stroke({ width: 1, color: 0xbfeeff, alpha: 0.55 * on });
    }
    card.filters = t > 0.2 && t < 1 && Math.random() < 0.12 ? [glitch] : [];
    glitch.offset = unit * 0.01;
    glitch.seed = Math.random();
    return t < 1.9;
  });
  card.filters = [];
  await done();
}
