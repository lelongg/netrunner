import { Graphics } from "pixi.js";
import { GlowFilter, GodrayFilter } from "pixi-filters";
import { Emitter, ease, filterPoint, glowTexture, lightning, run, span, sparkTexture } from "./stage";
import { type Board, type Ready, WHITE, billTexture, painted, scene } from "./kit";
import { type Pt, glowSprite, lerp, rnd } from "./more";

const panelTexture = () =>
  painted("s8-panel", 40, 28, (g) => {
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(2, 2, 36, 24, 4);
    g.fill();
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.7)";
    g.fillRect(8, 9, 18, 2);
    g.fillRect(8, 15, 24, 2);
  });

function arcFrom(g: Graphics, c: Pt, rx: number, ry: number, a0: number, a1: number, n = 32) {
  g.moveTo(c[0] + Math.cos(a0) * rx, c[1] + Math.sin(a0) * ry);
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    g.lineTo(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry);
  }
  return g;
}

export async function sendAMessage(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const ghost = at(0.5, 0.17);
  const halo = glowSprite(fx, glowTexture(), 0xe0e8ff);
  halo.position.set(...ghost);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  const ends: Pt[] = [at(0.32, 0.45), at(0.7, 0.42), at(0.82, 0.3), at(0.2, 0.3)];
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const on = span(t, 0.05, 0.2) * (1 - span(t, 1.3, 1.7));
    halo.alpha = 0.5 * on;
    halo.scale.set((unit / 128) * 0.35, (unit / 128) * 0.5);
    if (on > 0 && Math.floor(t * 20) % 3 !== 0) {
      const e = ends[Math.floor(rnd(0, ends.length))];
      lightning(g, ghost[0] + rnd(-1, 1) * unit * 0.05, ghost[1] + unit * 0.08, e[0], e[1], unit * 0.15, 0xb08aff, unit * 0.005);
    }
    return t < 1.7;
  });
  await done();
}

export async function aggressiveTrendsettingScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, card, fx, done, unit, at } = await scene(rect, code, ready, board);
  const flashes = new Emitter(fx);
  const glow = new GlowFilter({ color: 0x8af0ff, distance: 8, outerStrength: 0, quality: 0.3 });
  card.filters = [glow];
  root.addChild(fx);
  await run(app, (t, dt) => {
    if (t < 1.3 && Math.random() < 0.18) {
      const p = at(rnd(0.05, 0.95), rnd(0.12, 0.48));
      flashes.add(sparkTexture(), ...p, { life: 0.25, tint: WHITE, scale: (unit / 180) * rnd(0.7, 1.1), grow: -1 });
      flashes.add(glowTexture(), ...p, { life: 0.25, tint: 0xfff0e0, scale: (unit / 128) * 0.12, alpha: 0.6 });
    }
    glow.outerStrength = 1.2 * Math.sin(Math.PI * span(t, 0.2, 1.6));
    flashes.step(dt);
    return t < 1.7 || flashes.list.length > 0;
  });
  card.filters = [];
  await done();
}

export async function proprionegationScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const c = at(0.4, 0.2);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = span(t, 0, 0.2) * (1 - span(t, 1.4, 1.8));
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.6 + i / 6) % 1;
      const s = unit * 0.5 * (1 - k);
      const rot = 0.6 + k * 1.5;
      const pts: number[] = [];
      for (let j = 0; j < 4; j++) {
        const a = rot + (j * Math.PI) / 2;
        pts.push(c[0] + Math.cos(a) * s, c[1] + Math.sin(a) * s);
      }
      g.poly(pts).stroke({ width: 1.4, color: i % 2 ? 0xff5ab0 : 0x5ae8ff, alpha: 0.7 * fade * Math.sin(Math.PI * k) });
    }
    return t < 1.8;
  });
  await done();
}

export async function sericultureScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, at } = await scene(rect, code, ready, board);
  const g = new Graphics();
  g.blendMode = "add";
  fx.addChild(g);
  root.addChild(fx);
  await run(app, (t) => {
    g.clear();
    const fade = 1 - span(t, 1.4, 1.8);
    const k = ease.out(span(t, 0, 1.2));
    for (const ph of [0, Math.PI]) {
      const pts: number[] = [];
      const n = Math.max(2, Math.floor(40 * k));
      for (let i = 0; i <= n; i++) {
        const s = i / 40;
        const v = 0.44 - s * 0.36;
        const w = 0.07 * (1 - s * 0.6);
        pts.push(...at(0.52 + w * Math.sin(s * 20 + ph + t * 3), v));
      }
      g.poly(pts, false).stroke({ width: 1.2, color: 0xf0e6b0, alpha: 0.8 * fade });
    }
    return t < 1.8;
  });
  await done();
}

export async function offTheBooksScore(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  const { app, root, fx, done, unit, at } = await scene(rect, code, ready, board);
  const hands = at(0.6, 0.4);
  const pages = Array.from({ length: 6 }, (_, i) => ({ s: glowSprite(fx, panelTexture(), 0x7ac8ff), d: i * 0.15 }));
  root.addChild(fx);
  await run(app, (t) => {
    pages.forEach((pg, i) => {
      const k = span(t, pg.d, pg.d + 0.6);
      const e = ease.out(k);
      pg.s.position.set(hands[0] + (i % 2 ? 1 : -1) * unit * 0.05 * e, hands[1] - unit * 0.18 * e);
      pg.s.alpha = k > 0 && k < 1 ? 0.85 * Math.sin(Math.PI * k) : 0;
      pg.s.scale.set((unit / 180) * (0.9 + 0.2 * e), (unit / 180) * (0.9 + 0.2 * e) * Math.abs(Math.cos(k * Math.PI * 1.5)) + 0.01);
    });
    return t < 1.8;
  });
  await done();
}
