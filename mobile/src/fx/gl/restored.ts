import { Graphics } from "pixi.js";
import { Emitter, ease, layer, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, burst, scene } from "./kit";
import { type Pt, glowSprite, prism, rnd, tether } from "./more";
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
