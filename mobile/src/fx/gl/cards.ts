import { BlurFilter, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { GlitchFilter, GlowFilter, GodrayFilter, MotionBlurFilter, RGBSplitFilter, ShockwaveFilter, TwistFilter } from "pixi-filters";
import { Emitter, filterPoint, focusFilter, ease, glowTexture, lightning, run, span, sparkTexture, stage } from "./stage";
import { type Board, Smoke, CREDIT, CYAN, GOLD, GREEN, RED, type Ready, VIOLET, WHITE, billTexture, bubbleTexture, burst, coinTexture, petalTexture, pt, ringAt, scene, shimmer } from "./kit";

export async function sureGamble(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, zoom, done, cx } = await scene(rect, code, ready, board);
  const glow = new GlowFilter({ color: GOLD, distance: 18, outerStrength: 0, innerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const w = rect.width * 0.84;
  const h = rect.height * 0.24;
  const px = cx - w / 2;
  const py = rect.top + rect.height * 0.56;
  const panel = new Graphics().roundRect(px, py, w, h, 10).fill({ color: 0x07080a, alpha: 0.88 }).stroke({ color: GOLD, width: 2, alpha: 0.9 });
  root.addChild(panel);
  const symbols = ["7", CREDIT, "◆", "★", CREDIT, "◆", "7"];
  const cell = h - 12;
  const reels = [0, 1, 2].map((i) => {
    const rw = (w - 24) / 3;
    const x = px + 6 + i * (rw + 6);
    const mask = new Graphics().rect(x, py + 6, rw, cell).fill(0xffffff);
    const strip = new Container();
    const blur = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 9 });
    strip.filters = [blur];
    for (let k = 0; k < 28; k++) {
      const s = symbols[k % symbols.length];
      const t = new Text({ text: s, style: { fontFamily: s === CREDIT ? "anr-icon" : "Big Shoulders Display, sans-serif", fontWeight: s === CREDIT ? "normal" : "900", fontSize: cell * (s === CREDIT ? 0.6 : 0.78), fill: s === "7" ? 0xff4d3d : s === CREDIT ? GOLD : 0xf2efe6 } });
      t.anchor.set(0.5);
      t.position.set(x + rw / 2, py + 6 + cell / 2 + k * cell);
      strip.addChild(t);
    }
    strip.mask = mask;
    root.addChild(mask, strip);
    const stopAt = 0.7 + i * 0.22;
    const final = -(28 - 1 - ((28 - 1) % symbols.length)) * cell;
    return { strip, blur, stopAt, final, x: x + rw / 2, landed: false };
  });
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const coins = new Emitter(root);
  const flare = new Sprite(glowTexture());
  flare.anchor.set(0.5);
  flare.tint = GOLD;
  flare.blendMode = "add";
  flare.alpha = 0;
  fx.addChild(flare);
  let burstAt = 0;
  await run(app, (t, dt) => {
    zoom(1 + 0.05 * ease.back(span(t, 0, 0.3)) - 0.05 * span(t, 1.9, 2.3));
    glow.outerStrength = 3 * span(t, 0, 0.3) * (1 - span(t, 1.9, 2.3)) + (burstAt ? 2 * Math.max(0, 1 - (t - burstAt) * 2) : 0);
    for (const r of reels) {
      const k = span(t, 0.1, r.stopAt);
      r.strip.y = r.final * ease.out(k);
      r.blur.velocity = { x: 0, y: Math.min(40, Math.abs(r.final * (1 - k) * 3) * 0.02) };
      if (k >= 1 && !r.landed) {
        r.landed = true;
        burst(sparks, r.x, py + h / 2, 12, GOLD, 220, { life: 0.45, scale: 0.5 });
      }
    }
    if (t > 1.2 && !burstAt) {
      burstAt = t;
      for (let n = 0; n < 40; n++) coins.add(coinTexture(), cx + (Math.random() - 0.5) * w * 0.5, py + h / 2, { vx: (Math.random() - 0.5) * 520, vy: -460 - Math.random() * 500, gravity: 1500, life: 1 + Math.random() * 0.3, scale: 0.35 + Math.random() * 0.25, blend: "normal" });
      burst(sparks, cx, py + h / 2, 36, GOLD, 420, { life: 0.9, scale: 0.6 });
      navigator.vibrate?.([20, 20, 20, 60]);
    }
    const f = burstAt ? t - burstAt : -1;
    flare.position.set(cx, py + h / 2);
    flare.scale.set(f > 0 ? 2 + f * 10 : 0);
    flare.alpha = f > 0 ? Math.max(0, 0.9 - f * 1.6) : 0;
    for (const c of coins.list) c.s.scale.x = Math.cos(c.age * 14) * c.s.scale.y;
    sparks.step(dt);
    coins.step(dt);
    panel.alpha = 1 - span(t, 1.9, 2.3);
    for (const r of reels) r.strip.alpha = panel.alpha;
    return t < 2.4 || coins.list.length > 0 || sparks.list.length > 0;
  });
  await done();
}

export async function overclock(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, zoom, done, unit, at } = await scene(rect, code, ready, board);
  const eye = at(0.49, 0.25);
  const glitch = new GlitchFilter({ slices: 10, offset: 0, fillMode: 2, red: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [glitch];
  const heat = shimmer(root, card, rect, unit * 0.03);
  const rings = new Graphics();
  rings.blendMode = "add";
  const core = new Sprite(glowTexture());
  core.anchor.set(0.5);
  core.blendMode = "add";
  core.tint = 0xff3b20;
  fx.addChild(core, rings);
  root.addChild(fx);
  await run(app, (t) => {
    const on = span(t, 0, 0.3) * (1 - span(t, 1.6, 2));
    heat(t, on);
    const beat = Math.max(0, Math.sin(t * Math.PI * 2 * (1.4 + t * 1.8)));
    core.position.set(eye[0], eye[1]);
    core.scale.set((unit / 128) * (0.6 + 0.5 * beat) * on);
    core.alpha = 0.7 * on;
    rings.clear();
    for (let i = 0; i < 4; i++) {
      const p = (t * (0.9 + t * 0.6) + i / 4) % 1;
      rings.circle(eye[0], eye[1], unit * (0.12 + p * 0.9)).stroke({ width: 2 + 3 * (1 - p), color: i % 2 ? 0xff7a2f : 0xff2b2b, alpha: (1 - p) * on * 0.8 });
    }
    glitch.offset = beat > 0.92 && t < 1.7 ? unit * 0.08 : 0;
    glitch.red = { x: beat > 0.92 ? -4 : 0, y: 0 };
    glitch.blue = { x: beat > 0.92 ? 4 : 0, y: 0 };
    glitch.seed = Math.random();
    zoom(1 + 0.02 * beat * on);
    return t < 2.05;
  });
  await done();
}

export async function ritual(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const rays = new GodrayFilter({ angle: -28, gain: 0.45, lacunarity: 2.6, parallel: true, time: 0, alpha: 0 });
  card.filters = [rays];
  const holo = at(0.47, 0.42);
  const halo = new Sprite(glowTexture());
  halo.anchor.set(0.5);
  halo.blendMode = "add";
  halo.tint = 0x6fe3ff;
  fx.addChild(halo);
  const motes = new Emitter(fx);
  const steam = new Smoke(root);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0, 2.3));
    rays.time = t * 0.6;
    rays.alpha = 0.75 * k;
    halo.position.set(holo[0], holo[1]);
    halo.scale.set((unit / 128) * (0.55 + 0.06 * Math.sin(t * 7)));
    halo.alpha = 0.55 * k * (0.75 + 0.25 * Math.sin(t * 23));
    if (Math.random() < 0.5 && t < 2) motes.add(sparkTexture(), rect.left + Math.random() * rect.width * 0.7, rect.top + Math.random() * rect.height * 0.5, { vx: 6 + Math.random() * 10, vy: -4 + Math.random() * 8, life: 1.2, tint: 0xfff1cf, scale: (0.1 + Math.random() * 0.12) * (unit / 180), alpha: 0.8 });
    if (Math.random() < 0.3 && t < 1.9) {
      const [sx, sy] = at(0.78 + Math.random() * 0.03, 0.29);
      steam.puff(sx, sy, { vx: (Math.random() - 0.5) * 6, vy: -unit * 0.12, life: 1.8, size: unit * 0.08, grow: 2.4, alpha: 0.35 });
    }
    motes.step(dt);
    steam.step(dt);
    return t < 2.3;
  });
  await done();
}

export async function dzmzInstall(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.7, 0.3);
  const R = unit * 0.16;
  const atoms: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [-0.5, 0.86, 0],
    [-0.5, -0.86, 0],
    [0, 0, 1],
    [0, 0, -1],
    [1.6, 0.8, 0.4],
    [-1.2, 1.6, -0.3],
  ];
  const bonds = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [1, 6],
    [2, 7],
  ];
  const mol = new Graphics();
  mol.blendMode = "add";
  fx.addChild(mol);
  const scan = new Graphics();
  scan.blendMode = "add";
  fx.addChild(scan);
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = ease.out(span(t, 0.1, 0.6)) * (1 - span(t, 1.7, 2.1));
    const ay = t * 1.6;
    const ax = 0.5 + Math.sin(t) * 0.2;
    const proj = atoms.map(([x, y, z]) => {
      const x1 = x * Math.cos(ay) + z * Math.sin(ay);
      const z1 = -x * Math.sin(ay) + z * Math.cos(ay);
      const y1 = y * Math.cos(ax) - z1 * Math.sin(ax);
      const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
      const p = 1 / (1 - z2 * 0.18);
      return [c[0] + x1 * R * p * k, c[1] + y1 * R * p * k - (1 - k) * unit * 0.1, p] as const;
    });
    mol.clear();
    for (const [a, b] of bonds) mol.moveTo(proj[a][0], proj[a][1]).lineTo(proj[b][0], proj[b][1]);
    mol.stroke({ width: 1.5, color: CYAN, alpha: 0.8 * k });
    proj.forEach(([x, y, p], i) => mol.circle(x, y, R * (i === 0 ? 0.32 : 0.2) * p * k).fill({ color: i === 0 ? 0xbff8ff : CYAN, alpha: 0.75 * k }));
    scan.clear();
    const sy = c[1] - R * 1.6 + ((t * 1.3) % 1) * R * 3.2;
    scan.rect(c[0] - R * 1.6, sy, R * 3.2, 1.5).fill({ color: CYAN, alpha: 0.5 * k });
    if (Math.random() < 0.4 && k > 0.3) motes.add(sparkTexture(), c[0] + (Math.random() - 0.5) * R * 4, c[1] + (Math.random() - 0.5) * R * 4, { vy: -10, life: 0.6, tint: CYAN, scale: 0.18 * (unit / 180), grow: -0.2 });
    motes.step(dt);
    return t < 2.15;
  });
  await done();
}

export async function fermenter(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const sphere = at(0.48, 0.3);
  const heat = shimmer(root, card, rect, unit * 0.03);
  const glow = new Sprite(glowTexture());
  glow.anchor.set(0.5);
  glow.blendMode = "add";
  glow.tint = 0xff4f7a;
  fx.addChild(glow);
  const embers = new Emitter(fx);
  const bubbles = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = Math.sin(Math.PI * span(t, 0, 2));
    heat(t, k);
    glow.position.set(sphere[0], sphere[1]);
    glow.scale.set((unit / 128) * (0.9 + 0.1 * Math.sin(t * 6)));
    glow.alpha = 0.55 * k;
    if (Math.random() < 0.7 && t < 1.8) embers.add(sparkTexture(), sphere[0] + (Math.random() - 0.5) * unit * 0.5, sphere[1] + unit * 0.15, { vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 60, life: 0.9, tint: Math.random() < 0.5 ? 0xff7a3d : 0xff3f6c, scale: (0.15 + Math.random() * 0.2) * (unit / 180), grow: -0.15 });
    if (Math.random() < 0.35 && t < 1.7) {
      const a = Math.random() * Math.PI * 2;
      bubbles.add(bubbleTexture(), sphere[0] + Math.cos(a) * unit * 0.14, sphere[1] + Math.sin(a) * unit * 0.14, { vx: Math.cos(a) * 10, vy: -20, life: 0.8, tint: 0xd59bff, scale: (unit / 180) * (0.12 + Math.random() * 0.15), blend: "add" });
    }
    for (const e of embers.list) e.s.x += Math.sin(e.age * 9 + e.s.y * 0.1) * 0.3;
    embers.step(dt);
    bubbles.step(dt);
    return t < 2.05 || embers.list.length > 0;
  });
  await done();
}

export async function carmen(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, fx, done, unit, at } = sc;
  const her = at(0.67, 0.16);
  const ribbons = new Graphics();
  ribbons.blendMode = "add";
  fx.addChild(ribbons);
  const petals = new Emitter(fx);
  root.addChild(fx);
  const impact = strikeFx(sc, "ribbons", CYAN, her);
  await run(
    app,
    (t, dt) => {
      const k = Math.sin(Math.PI * span(t, 0, 2.1));
      ribbons.clear();
      for (let r = 0; r < 3; r++) {
        const phase = r * 2.1;
        const pts: [number, number][] = [];
        for (let i = 0; i <= 28; i++) {
          const u = i / 28;
          const a = phase + u * Math.PI * 1.6 + t * (1.8 + r * 0.3);
          const rad = unit * (0.08 + u * 0.16);
          pts.push([her[0] + Math.cos(a) * rad, her[1] + u * unit * 0.5 + Math.sin(a) * rad * 0.35]);
        }
        for (const [w, a] of [
          [unit * 0.05, 0.18],
          [unit * 0.012, 0.85],
        ] as const) {
          ribbons.moveTo(pts[0][0], pts[0][1]);
          for (const p of pts.slice(1)) ribbons.lineTo(p[0], p[1]);
          ribbons.stroke({ width: w, color: r === 1 ? 0x9fe3ff : 0x3d8bff, alpha: a * k, cap: "round", join: "round" });
        }
      }
      if (Math.random() < 0.45 && t < 1.8) petals.add(petalTexture(), her[0] + (Math.random() - 0.5) * unit * 0.8, her[1] + (Math.random() - 0.2) * unit * 0.6, { vx: 25 + Math.random() * 25, vy: -12 + Math.random() * 20, spin: (Math.random() - 0.5) * 3, life: 1.2, tint: 0xa8dcff, scale: (0.25 + Math.random() * 0.25) * (unit / 180) });
      petals.step(dt);
      return t < 2.15 || petals.list.length > 0;
    },
    sc.strike ? 2.2 : 1,
  );
  await impact;
  await done();
}

export async function predictivePlanogram(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const prey = at(0.58, 0.19);
  const grid = new Graphics();
  grid.blendMode = "add";
  const reticle = new Graphics();
  fx.addChild(grid, reticle);
  const tags = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const k = span(t, 0, 0.3) * (1 - span(t, 1.8, 2.2));
    grid.clear();
    const sweep = rect.top + ((t * 0.9) % 1) * rect.height * 0.6;
    grid.rect(rect.left, sweep, rect.width, 2).fill({ color: 0x4fd2ff, alpha: 0.7 * k });
    for (let i = 1; i < 7; i++) {
      const x = rect.left + (rect.width * i) / 7;
      grid.moveTo(x, rect.top + rect.height * 0.05).lineTo(rect.left + rect.width / 2 + (x - rect.left - rect.width / 2) * 0.4, rect.top + rect.height * 0.58);
    }
    grid.stroke({ width: 1, color: 0x4fd2ff, alpha: 0.25 * k });
    const lock = ease.out(span(t, 0.3, 1.1));
    const wob = (1 - lock) * unit * 0.25;
    const rx = prey[0] + Math.sin(t * 7) * wob;
    const ry = prey[1] + Math.cos(t * 5) * wob;
    const r = unit * (0.16 - 0.06 * lock);
    reticle.clear();
    reticle.circle(rx, ry, r).stroke({ width: 1.5, color: RED, alpha: k });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + t * (1 - lock) * 3;
      reticle.moveTo(rx + Math.cos(a) * r * 0.6, ry + Math.sin(a) * r * 0.6).lineTo(rx + Math.cos(a) * r * 1.5, ry + Math.sin(a) * r * 1.5);
    }
    reticle.stroke({ width: 2, color: RED, alpha: k });
    if (lock >= 1 && t < 1.6 && Math.random() < 0.3) tags.add(sparkTexture(), rx + (Math.random() - 0.5) * r * 2, ry + (Math.random() - 0.5) * r * 2, { life: 0.4, tint: RED, scale: 0.3 * (unit / 180), grow: -0.5 });
    tags.step(dt);
    return t < 2.25;
  });
  await done();
}

export async function hedgeFund(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, at } = await scene(rect, code, ready, board);
  const dim = new Graphics().poly([...at(0.03, 0.08), ...at(0.97, 0.08), ...at(0.97, 0.52), ...at(0.03, 0.52)]).fill({ color: 0x020806, alpha: 0.5 });
  const grid = new Graphics();
  for (let i = 1; i < 6; i++) grid.moveTo(...at(0.05, 0.08 + (0.44 * i) / 6)).lineTo(...at(0.95, 0.08 + (0.44 * i) / 6));
  grid.stroke({ color: GREEN, width: 1, alpha: 0.18 });
  root.addChild(dim, grid);
  const pts: [number, number][] = [];
  let v = 0.47;
  for (let i = 0; i <= 12; i++) {
    pts.push(at(0.08 + (0.84 * i) / 12, Math.max(0.12, v)));
    v -= 0.3 / 12 + (Math.random() - 0.35) * 0.05 * (i % 3 === 2 ? -1.6 : 1);
  }
  const line = new Graphics();
  fx.addChild(line);
  const head = new Sprite(sparkTexture());
  head.anchor.set(0.5);
  head.blendMode = "add";
  head.tint = GREEN;
  fx.addChild(head);
  const trail = new Emitter(fx);
  root.addChild(fx);
  const top = pts[pts.length - 1];
  await run(app, (t, dt) => {
    dim.alpha = span(t, 0, 0.2) * (1 - span(t, 1.8, 2.2));
    grid.alpha = dim.alpha;
    const k = ease.inOut(span(t, 0.15, 1.05));
    const n = k * (pts.length - 1);
    const i = Math.floor(n);
    const f = n - i;
    const hx = i >= pts.length - 1 ? top[0] : pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
    const hy = i >= pts.length - 1 ? top[1] : pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    line.clear();
    const color = t > 1.05 ? GOLD : GREEN;
    for (const [lw, a] of [
      [10, 0.15],
      [5, 0.4],
      [2.2, 1],
    ] as const) {
      line.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j <= i && j < pts.length; j++) line.lineTo(pts[j][0], pts[j][1]);
      line.lineTo(hx, hy);
      line.stroke({ width: lw, color: a === 1 ? WHITE : color, alpha: a * (1 - span(t, 1.8, 2.2)), cap: "round", join: "round" });
    }
    head.position.set(hx, hy);
    head.scale.set(0.8 + 0.2 * Math.sin(t * 30));
    head.alpha = 1 - span(t, 1.2, 1.5);
    if (t < 1.1 && Math.random() < 0.8) trail.add(sparkTexture(), hx, hy, { vx: (Math.random() - 0.5) * 60, vy: 30 + Math.random() * 60, life: 0.6, tint: GREEN, scale: 0.25 + Math.random() * 0.2, grow: -0.3 });
    trail.step(dt);
    return t < 2.25 || trail.list.length > 0;
  });
  await done();
}

export async function spinDoctor(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, card, fx, zoom, done, cx, cy, unit } = await scene(rect, code, ready, board);
  const twist = new TwistFilter({ radius: Math.hypot(rect.width, rect.height) * 0.6, angle: 0, offset: { x: 0, y: 0 }, padding: unit });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [twist, split];
  const orbit = new Emitter(fx);
  const ring = new Graphics();
  fx.addChild(ring);
  await run(app, (t, dt) => {
    const p = span(t, 0.05, 1.3);
    const k = Math.sin(Math.PI * p);
    twist.angle = 1.6 * k * k * Math.sin(p * Math.PI * 2);
    twist.offset = filterPoint(card, cx, cy);
    const s = 4 * Math.max(0, 1 - Math.abs(t - 0.65) * 3);
    split.red = { x: -s, y: 0 };
    split.blue = { x: s, y: 0 };
    zoom(1 - 0.08 * k);
    for (let n = 0; n < 3 && t < 1.3; n++) {
      const a = t * 9 + n * ((Math.PI * 2) / 3);
      const rr = Math.max(rect.width, rect.height) * (0.6 - 0.12 * k);
      orbit.add(sparkTexture(), cx + Math.cos(a) * rr * 0.8, cy + Math.sin(a) * rr, { life: 0.45, tint: n === 1 ? VIOLET : CYAN, scale: 0.5 * (unit / 180), grow: -1 });
    }
    orbit.step(dt);
    ring.clear();
    ringAt(ring, cx, cy, Math.max(rect.width, rect.height) * 1.2, span(t, 1.15, 1.8), CYAN, 6);
    return t < 1.85 || orbit.list.length > 0;
  });
  await done();
}

export async function pingRez(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const [bx, by] = at(0.41, 0.74);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.1, wavelength: unit * 0.45, speed: 1, brightness: 1.15, radius: -1, time: 0 });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  card.filters = [wave, split];
  const rings = new Graphics();
  fx.addChild(rings);
  const dots = new Emitter(fx);
  const core = new Sprite(glowTexture());
  core.anchor.set(0.5);
  core.tint = RED;
  core.blendMode = "add";
  fx.addChild(core);
  root.addChild(fx);
  const reach = Math.max(innerWidth, innerHeight) * 0.9;
  const speed = reach / 1.1;
  const pinged = new Set<number>();
  const others = board?.others ?? [];
  await run(app, (t, dt) => {
    wave.time = Math.max(0, t - 0.1) * speed;
    wave.center = filterPoint(card, bx, by);
    const g = t < 0.25 ? (1 - t / 0.25) * 8 : 0;
    split.red = { x: -g, y: 0 };
    split.blue = { x: g, y: g * 0.5 };
    rings.clear();
    for (let n = 0; n < 3; n++) {
      const k = span(t, 0.1 + n * 0.25, 1.2 + n * 0.25);
      if (k > 0 && k < 1) rings.circle(bx, by, k * reach).stroke({ width: 3 * (1 - k) + 1, color: RED, alpha: 1 - k });
    }
    const front = Math.max(0, t - 0.1) * speed;
    others.forEach((o, i) => {
      if (pinged.has(i)) return;
      const [ox, oy] = pt(o);
      if (Math.hypot(ox - bx, oy - by) > front) return;
      pinged.add(i);
      dots.add(glowTexture(), ox, oy, { life: 0.5, tint: RED, scale: Math.min(o.width, o.height) / 70, grow: 1 });
      dots.add(sparkTexture(), ox, oy, { life: 0.4, tint: WHITE, scale: 0.5, grow: -1 });
    });
    if (t < 1.2 && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.max(rect.width, rect.height) * (0.6 + Math.random() * 0.6);
      dots.add(sparkTexture(), bx + Math.cos(a) * d, by + Math.sin(a) * d, { life: 0.5, tint: RED, scale: 0.35 * (unit / 180), grow: -0.6 });
    }
    dots.step(dt);
    core.position.set(bx, by);
    core.scale.set((1 + 3 * span(t, 0, 0.3)) * (unit / 180));
    core.alpha = (1 - span(t, 0.1, 0.6)) * 0.9;
    card.tint = t < 0.3 ? 0xffd0c8 : WHITE;
    return t < 1.9;
  });
  await done();
}

export async function creativeCommission(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const [dx, dy] = at(0.25, 0.3);
  const R = rect.width * 0.27;
  const [sx, sy] = at(0.49, 0.27);
  const SYM = 6;
  const strokes = [
    { at: 0.1, color: 0xff4fd8, seed: 1.3, len: 0.95 },
    { at: 0.55, color: VIOLET, seed: 2.7, len: 0.8 },
    { at: 0.95, color: CYAN, seed: 4.1, len: 0.6 },
  ].map((st) => ({
    ...st,
    pts: Array.from({ length: 40 }, (_, i) => {
      const k = i / 39;
      return { r: R * (0.3 + (st.len - 0.3) * k), a: 0.42 * Math.sin(k * 7 + st.seed) * k + st.seed * 0.3 };
    }),
  }));
  const glow = new GlowFilter({ color: 0xff4fd8, distance: 12, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  const paint = new Graphics();
  const beam = new Graphics();
  beam.blendMode = "add";
  fx.addChild(paint, beam);
  const motes = new Emitter(fx);
  const tip = new Sprite(glowTexture());
  tip.anchor.set(0.5);
  tip.blendMode = "add";
  tip.tint = 0xffb8f0;
  tip.position.set(sx, sy);
  fx.addChild(tip);
  root.addChild(fx);
  const trace = (pts: { r: number; a: number }[], n: number, spin: number) => {
    for (let j = 0; j < SYM; j++)
      for (const m of [1, -1]) {
        const off = (j / SYM) * Math.PI * 2 + spin;
        pts.slice(0, n).forEach((q, i) => {
          const x = dx + q.r * Math.cos(m * q.a + off);
          const y = dy + q.r * Math.sin(m * q.a + off);
          if (i) paint.lineTo(x, y);
          else paint.moveTo(x, y);
        });
      }
  };
  let shed = false;
  await run(app, (t, dt) => {
    const fade = 1 - span(t, 2.1, 2.7);
    const spin = t * 0.12;
    paint.clear();
    beam.clear();
    paint.circle(dx, dy, R).stroke({ width: unit * 0.006, color: CYAN, alpha: 0.35 * Math.sin(Math.PI * span(t, 0, 2.7)) });
    for (const st of strokes) {
      const p = ease.inOut(span(t, st.at, st.at + 0.75));
      const n = Math.floor(p * (st.pts.length - 1)) + 1;
      if (n < 2) continue;
      trace(st.pts, n, spin);
      paint.stroke({ width: unit * 0.018, color: st.color, alpha: 0.35 * fade, cap: "round", join: "round" });
      trace(st.pts, n, spin);
      paint.stroke({ width: unit * 0.005, color: 0xfff0fb, alpha: 0.75 * fade, cap: "round", join: "round" });
      if (p > 0 && p < 1) {
        const q = st.pts[n - 1];
        const hx = dx + q.r * Math.cos(q.a + spin);
        const hy = dy + q.r * Math.sin(q.a + spin);
        beam
          .moveTo(sx, sy)
          .lineTo(hx, hy)
          .stroke({ width: unit * 0.006, color: st.color, alpha: 0.55 });
        if (Math.random() < 0.6) motes.add(sparkTexture(), hx, hy, { vx: (Math.random() - 0.5) * unit * 0.3, vy: (Math.random() - 0.5) * unit * 0.3, life: 0.5, drag: 2, tint: st.color, scale: 0.22 * (unit / 180), grow: -0.3 });
      }
    }
    if (!shed && t > 2.1) {
      shed = true;
      for (const st of strokes)
        for (let j = 0; j < SYM; j++) {
          const q = st.pts[Math.floor(Math.random() * st.pts.length)];
          const a = q.a + (j / SYM) * Math.PI * 2 + spin;
          motes.add(sparkTexture(), dx + q.r * Math.cos(a), dy + q.r * Math.sin(a), { vx: Math.cos(a) * unit * 0.25, vy: Math.sin(a) * unit * 0.25 - unit * 0.1, life: 1 + Math.random() * 0.5, drag: 1, tint: st.color, scale: 0.26 * (unit / 180) });
        }
    }
    const painting = strokes.some((st) => t > st.at && t < st.at + 0.75);
    tip.alpha = (painting ? 0.8 : 0.3) * fade * span(t, 0, 0.15);
    tip.scale.set((unit / 128) * (0.12 + 0.03 * Math.sin(t * 30)));
    glow.outerStrength = 1.4 * Math.sin(Math.PI * span(t, 0, 2.7));
    motes.step(dt);
    return t < 2.7 || motes.list.length > 0;
  });
  await done();
}

export async function pettyCash(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, cx, unit } = await scene(rect, code, ready, board);
  const bills = new Emitter(root);
  const sparks = new Emitter(fx);
  root.addChild(fx);
  let spawned = 0;
  await run(app, (t, dt) => {
    while (spawned < 22 && t > spawned * 0.035) {
      spawned++;
      bills.add(billTexture(), cx + (Math.random() - 0.5) * rect.width * 0.4, rect.top + rect.height * 0.55, { vx: (Math.random() - 0.5) * 420, vy: -520 - Math.random() * 300, gravity: 900, drag: 1.2, spin: (Math.random() - 0.5) * 9, life: 1.5, scale: (unit / 180) * (0.45 + Math.random() * 0.2), blend: "normal" });
    }
    for (const b of bills.list) b.s.scale.y = Math.abs(Math.cos(b.age * 9)) * b.s.scale.x * 0.9 + 0.1 * b.s.scale.x;
    if (Math.random() < 0.5 && t < 1.2) sparks.add(sparkTexture(), cx + (Math.random() - 0.5) * rect.width, rect.top + Math.random() * rect.height * 0.6, { life: 0.5, tint: GREEN, scale: 0.4, grow: -0.7 });
    bills.step(dt);
    sparks.step(dt);
    return t < 1.95 || bills.list.length > 0 || sparks.list.length > 0;
  });
  await done();
}

export async function jailbreak(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const [cx, cy] = at(0.5, 0.3);
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.08, wavelength: unit * 0.5, speed: unit * 3, brightness: 1.1, radius: -1, time: 0 });
  card.filters = [wave, split];
  const lock = new Graphics();
  fx.addChild(lock);
  const shards = new Emitter(fx);
  const s = unit * 0.38;
  let broke = false;
  await run(app, (t, dt) => {
    lock.clear();
    const lk = span(t, 0, 0.2);
    const open = ease.back(span(t, 0.55, 0.75));
    const shake = t > 0.2 && t < 0.55 ? Math.sin(t * 90) * 4 : 0;
    const a = lk * (1 - span(t, 0.75, 0.95));
    if (a > 0) {
      const x = cx + shake;
      lock
        .roundRect(x - s * 0.45, cy - s * 0.1, s * 0.9, s * 0.7, 8)
        .fill({ color: 0x0b0c0e, alpha: 0.9 * a })
        .stroke({ color: RED, width: 3, alpha: a });
      lock
        .moveTo(x - s * 0.28, cy - s * 0.1)
        .lineTo(x - s * 0.28, cy - s * 0.35 - open * s * 0.25)
        .arc(x, cy - s * 0.35 - open * s * 0.25, s * 0.28, Math.PI, 0)
        .lineTo(x + s * 0.28, cy - s * 0.1 - open * s * 0.25);
      lock.stroke({ width: 5, color: RED, alpha: a });
      lock.circle(x, cy + s * 0.22, s * 0.07).fill({ color: RED, alpha: a });
    }
    if (t > 0.55 && !broke) {
      broke = true;
      burst(shards, cx, cy, 40, RED, unit * 3.2, { life: 0.8, scale: 0.55 * (unit / 180) });
      navigator.vibrate?.([30, 30, 60]);
    }
    wave.time = Math.max(0, t - 0.55);
    wave.center = filterPoint(card, cx, cy);
    const g = t > 0.55 && t < 0.8 ? (1 - (t - 0.55) / 0.25) * 9 : 0;
    split.red = { x: -g, y: 0 };
    split.blue = { x: g, y: 0 };
    shards.step(dt);
    return t < 1.6 || shards.list.length > 0;
  });
  await done();
}

export async function pinholeThreading(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, fx, done, unit, at } = await scene(rect, code, ready, board);
  const [hx, hy] = at(0.38, 0.27);
  const x0 = rect.left - unit * 0.6;
  const len = rect.width + unit * 1.2;
  const uh = (hx - x0) / len;
  const thread = new Graphics();
  fx.addChild(thread);
  const hole = new Sprite(glowTexture());
  hole.anchor.set(0.5);
  hole.blendMode = "add";
  hole.tint = CYAN;
  fx.addChild(hole);
  const sparks = new Emitter(fx);
  const path = (u: number): [number, number] => [x0 + len * u, hy + Math.sin((u - uh) * Math.PI * 3) * rect.height * 0.2 * Math.sqrt(Math.max(0, 1 - Math.abs(u - 0.5) * 2))];
  await run(app, (t, dt) => {
    const k = ease.inOut(span(t, 0.15, 1.1));
    thread.clear();
    const n = 40;
    for (const [w, a] of [
      [7, 0.18],
      [3, 0.5],
      [1.3, 1],
    ] as const) {
      const p0 = path(0);
      thread.moveTo(p0[0], p0[1]);
      for (let i = 1; i <= Math.floor(n * k); i++) {
        const p = path(i / n);
        thread.lineTo(p[0], p[1]);
      }
      thread.stroke({ width: w, color: a === 1 ? WHITE : CYAN, alpha: a * (1 - span(t, 1.3, 1.7)) });
    }
    const head = path(k);
    if (k > 0 && k < 1) sparks.add(sparkTexture(), head[0], head[1], { life: 0.35, tint: CYAN, scale: 0.4 * (unit / 180), grow: -1 });
    sparks.step(dt);
    hole.position.set(hx, hy);
    const pk = Math.max(0, 1 - Math.abs(k - uh) * 8);
    hole.scale.set((0.3 + pk * 1.4) * (unit / 180));
    hole.alpha = (0.4 + pk * 0.6) * (1 - span(t, 1.2, 1.5));
    return t < 1.75;
  });
  await done();
}

export async function mutualFavor(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, cx, cy, unit, at } = await scene(rect, code, ready, board);
  const bx = card.scale.x;
  const by = card.scale.y;
  const focus = at(0.55, 0.34);
  const frame = new Graphics().roundRect(rect.left, rect.top, rect.width, rect.height, 10).fill(0xffffff);
  const shot = new Container();
  root.addChildAt(shot, 0);
  const blur = new BlurFilter({ strength: 0, quality: 3 });
  card.filters = [blur];
  const sharp = new Sprite(card.texture);
  sharp.anchor.set(0.5);
  sharp.filters = [focusFilter([0.55, 0.34], 0.12, 0.3, rect.width / rect.height)];
  shot.addChild(card, sharp);
  shot.mask = frame;
  root.addChild(frame);
  const vignette = new Graphics();
  root.addChild(vignette, fx);
  const streak = new Sprite(glowTexture());
  streak.anchor.set(0.5);
  streak.blendMode = "add";
  streak.tint = 0xffd9a0;
  streak.alpha = 0;
  fx.addChild(streak);
  const star = new Sprite(sparkTexture());
  star.anchor.set(0.5);
  star.blendMode = "add";
  star.alpha = 0;
  fx.addChild(star);
  const glints = new Emitter(fx);
  await run(app, (t, dt) => {
    const zin = ease.inOut(span(t, 0, 0.6));
    const zout = ease.inOut(span(t, 1.25, 1.8));
    const depth = zin * (1 - zout);
    const z = 1 + 0.8 * depth;
    const tx = focus[0] + (cx - focus[0]) * depth;
    const ty = focus[1] + (cy - focus[1]) * depth;
    const px = tx - (focus[0] - cx) * z;
    const py = ty - (focus[1] - cy) * z;
    for (const s of [card, sharp]) {
      s.scale.set(bx * z, by * z);
      s.position.set(px, py);
    }
    blur.strength = 9 * depth;
    sharp.alpha = 1;
    vignette.clear();
    if (depth > 0.01) vignette.roundRect(rect.left, rect.top, rect.width, rect.height, 10).stroke({ width: unit * 0.18, color: 0x000000, alpha: 0.45 * depth, alignment: 0 });
    const f = span(t, 0.6, 1.05);
    streak.position.set(tx - unit * 0.6 + f * unit * 1.2, ty);
    streak.width = unit * 2.2;
    streak.height = unit * 0.07;
    streak.alpha = Math.sin(Math.PI * f) * 0.9;
    const g = span(t, 0.85, 1.25);
    star.position.set(tx + unit * 0.15, ty - unit * 0.06);
    star.scale.set((unit / 64) * 0.55 * Math.sin(Math.PI * g));
    star.rotation = g * 1.5;
    star.alpha = Math.sin(Math.PI * g);
    if (t > 0.75 && t < 1.2 && Math.random() < 0.3) glints.add(sparkTexture(), tx + (Math.random() - 0.5) * unit * 0.4, ty + (Math.random() - 0.5) * unit * 0.25, { life: 0.35, tint: 0xfff0d0, scale: 0.25 * (unit / 180), grow: -0.6 });
    glints.step(dt);
    return t < 1.85;
  });
  await done();
}

export async function cleanGetaway(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, zoom, done, cx } = await scene(rect, code, ready, board);
  const blur = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 11 });
  card.filters = [blur];
  const streaks = new Container();
  root.addChildAt(streaks, 0);
  const lines: { s: Sprite; v: number }[] = [];
  const sparks = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    const dash = Math.sin(Math.PI * span(t, 0.1, 0.6));
    card.x = cx + dash * rect.width * 0.12;
    blur.velocity = { x: dash * 30, y: 0 };
    zoom(1 + 0.03 * dash);
    if (t < 1 && Math.random() < 0.9) {
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0, 0.5);
      s.width = 60 + Math.random() * 140;
      s.height = 1.5 + Math.random() * 2;
      s.tint = Math.random() < 0.25 ? RED : WHITE;
      s.blendMode = "add";
      s.alpha = 0.7;
      s.position.set(rect.right + Math.random() * 60, rect.top + Math.random() * rect.height);
      streaks.addChild(s);
      lines.push({ s, v: -1600 - Math.random() * 900 });
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      l.s.x += l.v * dt;
      if (l.s.x + l.s.width < rect.left - 120) {
        l.s.destroy();
        lines.splice(i, 1);
      }
    }
    sparks.step(dt);
    return t < 1.85 || lines.length > 0 || sparks.list.length > 0;
  });
  card.x = cx;
  await done();
}

export async function risingTide(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, card, fx, done, cx, cy, unit } = sc;
  const water = new Graphics();
  const mask = new Graphics().rect(rect.left, rect.top, rect.width, rect.height).fill(0xffffff);
  water.mask = mask;
  root.addChild(mask, water);
  const wave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: unit * 0.06, wavelength: unit * 0.4, speed: unit * 2.2, brightness: 1.15, radius: -1, time: 0 });
  card.filters = [wave];
  const glints = new Emitter(fx);
  root.addChild(fx);
  const impact = strikeFx(sc, "splash", CYAN, [cx, cy]);
  await run(
    app,
    (t, dt) => {
      const level = rect.bottom - rect.height * ease.out(span(t, 0, 0.8)) * 0.9 * (1 - ease.inOut(span(t, 1, 1.5)));
      water.clear();
      water.moveTo(rect.left, rect.bottom);
      for (let i = 0; i <= 20; i++) water.lineTo(rect.left + (rect.width * i) / 20, level + Math.sin(i * 0.9 + t * 9) * unit * 0.03);
      water.lineTo(rect.right, rect.bottom).closePath().fill({ color: 0x1673c9, alpha: 0.45 });
      if (Math.random() < 0.6 && t < 1.3) glints.add(sparkTexture(), rect.left + Math.random() * rect.width, level + Math.random() * (rect.bottom - level), { life: 0.4, tint: 0x9fe7ff, scale: 0.3 * (unit / 180), grow: -0.5 });
      glints.step(dt);
      wave.time = Math.max(0, t - 0.75);
      wave.center = filterPoint(card, cx, cy);
      return t < 1.6;
    },
    sc.strike ? 1.6 : 1,
  );
  await impact;
  await done();
}

export async function echelon(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const sc = await scene(rect, code, ready, board);
  const { app, root, card, fx, done, unit, at } = sc;
  const sats = [
    [0.07, 0.33],
    [0.35, 0.43],
    [0.41, 0.33],
    [0.68, 0.25],
    [0.87, 0.23],
    [0.85, 0.38],
  ].map(([x, y], i) => ({ p: at(x, y), on: 0.15 + i * 0.13, lit: false }));
  const [ex, ey] = at(0.27, 0.22);
  const twist = new TwistFilter({ radius: rect.width * 0.22, angle: 0, offset: { x: 0, y: 0 }, padding: unit * 0.2 });
  card.filters = [twist];
  const eye = new Sprite(glowTexture());
  eye.anchor.set(0.5);
  eye.tint = RED;
  eye.blendMode = "add";
  eye.position.set(ex, ey);
  const net = new Graphics();
  net.blendMode = "add";
  fx.addChild(eye, net);
  const lights = sats.map((st) => {
    const l = new Sprite(glowTexture());
    l.anchor.set(0.5);
    l.tint = VIOLET;
    l.blendMode = "add";
    l.position.set(...st.p);
    l.alpha = 0;
    fx.addChild(l);
    return l;
  });
  const sparks = new Emitter(fx);
  root.addChild(fx);
  const lerp = (a: [number, number], b: [number, number], k: number): [number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const impact = strikeFx(sc, "bolts", VIOLET, sats[5].p);
  await run(
    app,
    (t, dt) => {
      const fade = 1 - span(t, 1.9, 2.4);
      const wake = Math.sin(Math.PI * span(t, 0.2, 2.3));
      twist.offset = filterPoint(card, ex, ey);
      twist.angle = 0.7 * wake;
      eye.alpha = (0.3 + 0.12 * Math.sin(t * 7)) * wake;
      eye.scale.set((unit / 128) * (0.4 + 0.1 * wake));
      net.clear();
      sats.forEach((st, i) => {
        if (!st.lit && t > st.on) {
          st.lit = true;
          sparks.add(sparkTexture(), st.p[0], st.p[1], { life: 0.4, tint: WHITE, scale: 0.4 * (unit / 180), grow: -0.8, spin: 2 });
          sparks.add(glowTexture(), st.p[0], st.p[1], { life: 0.35, tint: VIOLET, scale: (unit / 128) * 0.1, grow: 0.5, alpha: 0.7 });
        }
        lights[i].alpha = st.lit ? (0.3 + 0.12 * Math.sin(t * 9 + i)) * fade : 0;
        lights[i].scale.set((unit / 128) * 0.08);
        if (i === 0) return;
        const k = ease.out(span(t, st.on - 0.05, st.on + 0.2));
        if (k <= 0) return;
        const b = lerp(sats[i - 1].p, st.p, k);
        net.moveTo(...sats[i - 1].p).lineTo(...b);
      });
      net.stroke({ width: unit * 0.012, color: VIOLET, alpha: 0.3 * fade });
      sats.forEach((st, i) => {
        if (!i) return;
        const k = ease.out(span(t, st.on - 0.05, st.on + 0.2));
        if (k > 0) net.moveTo(...sats[i - 1].p).lineTo(...lerp(sats[i - 1].p, st.p, k));
      });
      net.stroke({ width: unit * 0.004, color: 0xe6dcff, alpha: 0.8 * fade });
      const pk = span(t, 1.2, 1.8);
      if (pk > 0 && pk < 1) {
        const f = pk * (sats.length - 1);
        const j = Math.min(sats.length - 2, Math.floor(f));
        const [px, py] = lerp(sats[j].p, sats[j + 1].p, f - j);
        sparks.add(glowTexture(), px, py, { life: 0.25, tint: 0xd8c8ff, scale: (unit / 128) * 0.07, grow: -0.1 });
        sparks.add(sparkTexture(), px, py, { life: 0.3, tint: WHITE, scale: 0.4 * (unit / 180), grow: -0.8 });
      }
      sparks.step(dt);
      return t < 2.4 || sparks.list.length > 0;
    },
    sc.strike ? 2.2 : 1,
  );
  await impact;
  await done();
}

export async function flyswatter(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, card, fx, done, cx, cy, unit } = await scene(rect, code, ready, board);
  const glitch = new GlitchFilter({ slices: 6, offset: 0, fillMode: 2 });
  card.filters = [glitch];
  const mesh = new Graphics();
  mesh.blendMode = "add";
  fx.addChild(mesh);
  const bolts = new Graphics();
  fx.addChild(bolts);
  const bugs = new Emitter(fx);
  const targets = (board?.others ?? []).slice(0, 6);
  for (let i = 0; i < 10; i++) bugs.add(sparkTexture(), cx + (Math.random() - 0.5) * rect.width * 1.4, cy + (Math.random() - 0.5) * rect.height * 1.2, { vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.55 + Math.random() * 0.3, tint: GREEN, scale: 0.3 * (unit / 180) });
  let zap = 0;
  let n = 0;
  await run(app, (t, dt) => {
    mesh.clear();
    const k = span(t, 0, 0.3) * (1 - span(t, 1.1, 1.4));
    const step = unit * 0.14;
    for (let x = rect.left; x <= rect.right + 0.1; x += step) mesh.moveTo(x, rect.top).lineTo(x, rect.bottom);
    for (let y = rect.top; y <= rect.bottom + 0.1; y += step) mesh.moveTo(rect.left, y).lineTo(rect.right, y);
    mesh.stroke({ width: 1.2, color: CYAN, alpha: k * (0.5 + 0.5 * Math.sin(t * 50)) });
    if (t > zap && t < 1.1) {
      zap = t + 0.09;
      bolts.clear();
      const tgt = targets[n++ % Math.max(1, targets.length)];
      const end: [number, number] = tgt ? pt(tgt) : [cx + (Math.random() - 0.5) * rect.width * 1.6, cy + (Math.random() - 0.5) * rect.height * 1.6];
      lightning(bolts, cx, cy, end[0], end[1], unit * 0.25, CYAN, 1.6);
      bugs.add(glowTexture(), end[0], end[1], { life: 0.3, tint: CYAN, scale: 0.4, grow: -1 });
    }
    if (t >= 1.1) bolts.clear();
    glitch.offset = t % 0.3 < 0.06 && t < 1 ? 12 : 0;
    glitch.seed = Math.random();
    bugs.step(dt);
    return t < 1.45;
  });
  await done();
}

export const warm = () => stage();
export * from "./more";
export * from "./third";
export * from "./fourth";
export * from "./fifth";
import { glowSprite, strikeFx } from "./more";
export * from "./sixth";
export * from "./seventh";
export * from "./eighth";
export * from "./revised";
export * from "./revC";
