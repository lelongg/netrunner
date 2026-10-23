import { Graphics } from "pixi.js";
import { Emitter, ease, glowTexture, layer, run, span, sparkTexture } from "./stage";
import { type Board, GREEN, RED, type Ready, Smoke, burst, scene } from "./kit";
import { type Pt, glowSprite, lerp, prism, rnd, tether } from "./more";
import { sealTexture } from "./third";

export async function governmentSubsidy(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, done, unit, at } = await scene(rect, code, ready, board);
  const fx = layer(root, false);
  const hand = at(0.38, 0.32);
  const seal = glowSprite(fx, sealTexture(), 0xe8b84a);
  seal.position.set(...hand);
  const rings = new Graphics();
  fx.addChild(rings);
  const motes = new Emitter(fx);
  let stamped = false;
  await run(app, (t, dt) => {
    const drop = ease.inOut(span(t, 0.05, 0.4));
    seal.blendMode = "normal";
    seal.alpha = 0.75 * Math.min(1, drop * 2) * (1 - span(t, 1.1, 1.5));
    seal.scale.set((unit / 96) * (0.9 - 0.45 * drop));
    seal.rotation = (1 - drop) * 0.6;
    if (drop >= 1 && !stamped) {
      stamped = true;
      burst(motes, ...hand, 12, 0xe8b84a, unit * 1.1, { life: 0.55, scale: 0.25 });
      navigator.vibrate?.(30);
    }
    rings.clear();
    const k = span(t, 0.4, 1);
    if (k > 0 && k < 1) rings.circle(...hand, unit * (0.18 + 0.2 * ease.out(k))).stroke({ width: unit * 0.012 * (1 - k) + 1, color: 0xe8b84a, alpha: 0.6 * (1 - k) });
    if (t > 0.4 && t < 1.2 && Math.random() < 0.2) motes.add(sparkTexture(), ...at(rnd(0.05, 0.95), rnd(0.12, 0.48)), { vy: -unit * 0.1, life: 0.6, tint: 0xf0d48a, scale: 0.14 * (unit / 180), alpha: 0.6, grow: -0.2 });
    motes.step(dt);
    return t < 1.7 || motes.list.length > 0;
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
  const src = at(0.565, 0.9);
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

export async function docklandsPass(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const gate = new Graphics();
  gate.blendMode = "add";
  fx.addChild(gate);
  const pass = glowSprite(fx, glowTexture(), GREEN);
  pass.position.set(...at(0.52, 0.42));
  const sparks = new Emitter(fx);
  root.addChild(fx);
  let granted = false;
  await run(app, (t, dt) => {
    gate.clear();
    const k = ease.inOut(span(t, 0.05, 0.75));
    const v = 0.08 + 0.46 * k;
    const a = k > 0 && k < 1 ? 1 : 0;
    gate.poly([...at(0.04, v - 0.004), ...at(0.96, v - 0.004), ...at(0.96, v + 0.004), ...at(0.04, v + 0.004)]).fill({ color: RED, alpha: a });
    gate.poly([...at(0.04, v - 0.03), ...at(0.96, v - 0.03), ...at(0.96, v + 0.03), ...at(0.04, v + 0.03)]).fill({ color: RED, alpha: 0.12 * a });
    const g = span(t, 0.75, 1.5);
    if (g > 0 && !granted) {
      granted = true;
      burst(sparks, ...at(0.52, 0.42), 16, GREEN, unit * 0.9, { life: 0.5, scale: 0.3 });
    }
    pass.alpha = Math.sin(Math.PI * g);
    pass.scale.set((unit / 128) * 0.25);
    if (g > 0 && g < 1) gate.poly([...at(0.04, 0.08), ...at(0.96, 0.08), ...at(0.96, 0.54), ...at(0.04, 0.54)]).stroke({ color: GREEN, width: 2 + 4 * (1 - g), alpha: 1 - g });
    sparks.step(dt);
    return t < 1.55 || sparks.list.length > 0;
  });
  await done();
}

export async function scrounge(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const device = at(0.765, 0.305);
  const dust = new Smoke(fx);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const led = glowSprite(fx, glowTexture(), 0x6ae8ff);
  led.position.set(...device);
  const finds = [at(0.778, 0.428), at(0.885, 0.355), at(0.656, 0.465)].map((p, i) => ({ p, s: glowSprite(fx, sparkTexture(), 0xbff4ff), d: 0.6 + i * 0.2 }));
  const motes = new Emitter(fx);
  root.addChild(fx);
  await run(app, (t, dt) => {
    g.clear();
    if (t < 1.5 && Math.random() < 0.25) dust.puff(...at(-0.05, rnd(0.25, 0.48)), { vx: unit * rnd(0.3, 0.55), vy: -unit * 0.02, life: 1.6, size: unit * rnd(0.12, 0.2), grow: 2, tint: 0xe2c9a0, alpha: 0.25 });
    const on = span(t, 0.2, 0.4) * (1 - span(t, 1.5, 1.9));
    led.alpha = 0.6 * on;
    led.scale.set((unit / 128) * 0.1);
    const sweep = Math.sin(t * 2.4) * 0.12;
    const far = at(0.78 + sweep, 0.44);
    g.poly([...device, far[0] - unit * 0.12, far[1], far[0] + unit * 0.12, far[1]]).fill({ color: 0x6ae8ff, alpha: 0.1 * on });
    g.moveTo(...device)
      .lineTo(...far)
      .stroke({ width: 1, color: 0xbff4ff, alpha: 0.5 * on, cap: "round" });
    for (const f of finds) {
      const k = span(t, f.d, f.d + 0.6);
      f.s.position.set(...lerp(f.p, device, ease.inOut(span(k, 0.4, 1))));
      f.s.alpha = k > 0 && k < 1 ? 0.9 * on : 0;
      f.s.rotation = t * 3;
      f.s.scale.set((unit / 120) * 0.22);
      if (k > 0.4 && k < 1 && Math.random() < 0.5) motes.add(sparkTexture(), f.s.x, f.s.y, { life: 0.3, tint: 0x6ae8ff, scale: (unit / 180) * 0.15, grow: -0.4 });
    }
    dust.step(dt);
    motes.step(dt);
    return t < 1.9 || dust.list.length > 0;
  });
  await done();
}
