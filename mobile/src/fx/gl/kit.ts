import { ColorMatrixFilter, Container, DisplacementFilter, type Filter, Graphics, Sprite, Texture } from "pixi.js";
import { Emitter, cardSprite, ease, layer, run, span, sparkTexture, stage } from "./stage";

export const GOLD = 0xf6c945;
export const CYAN = 0x22d3ee;
export const GREEN = 0x3ddc84;
export const RED = 0xff3b30;
export const VIOLET = 0xc792ff;
export const WHITE = 0xffffff;
export const CREDIT = "\ue600";
let glyphFont: Promise<unknown> | null = null;

export type Ready = () => void;

export interface Board {
  hand?: DOMRect | null;
  others: DOMRect[];
  radius?: number;
  track?: () => DOMRect | null;
  dim?: boolean;
  strike?: DOMRect | null;
  strikeTrack?: () => DOMRect | null;
  cap?: number;
  free?: () => void;
  advanced?: DOMRect[];
  gone?: DOMRect[];
  host?: DOMRect | null;
  drained?: DOMRect | null;
  grip?: DOMRect | null;
  access?: DOMRect | null;
  runner?: DOMRect | null;
}

const made = new Map<string, Texture>();

export function painted(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const hit = made.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!);
  const t = Texture.from(c);
  made.set(key, t);
  return t;
}

export const coinTexture = () =>
  painted("coin", 64, 64, (g) => {
    const r = g.createRadialGradient(24, 22, 4, 32, 32, 30);
    r.addColorStop(0, "#fff6c4");
    r.addColorStop(0.5, "#f6c945");
    r.addColorStop(1, "#9a6a00");
    g.fillStyle = r;
    g.beginPath();
    g.arc(32, 32, 29, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(90,60,0,0.8)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(32, 32, 21, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(90,60,0,0.85)";
    g.font = "30px anr-icon";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(CREDIT, 32, 33);
  });

export const billTexture = () =>
  painted("bill", 96, 48, (g) => {
    const r = g.createLinearGradient(0, 0, 96, 48);
    r.addColorStop(0, "#b8f5c9");
    r.addColorStop(1, "#3c9a5c");
    g.fillStyle = r;
    g.fillRect(0, 0, 96, 48);
    g.strokeStyle = "rgba(20,70,40,0.8)";
    g.lineWidth = 3;
    g.strokeRect(5, 5, 86, 38);
    g.beginPath();
    g.arc(48, 24, 12, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(20,70,40,0.9)";
    g.font = "18px anr-icon";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(CREDIT, 48, 25);
  });

export const bubbleTexture = () =>
  painted("bubble", 64, 64, (g) => {
    const r = g.createRadialGradient(26, 24, 2, 32, 32, 30);
    r.addColorStop(0, "rgba(255,255,255,0.9)");
    r.addColorStop(0.3, "rgba(160,255,190,0.15)");
    r.addColorStop(0.85, "rgba(120,255,160,0.35)");
    r.addColorStop(1, "rgba(120,255,160,0)");
    g.fillStyle = r;
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
  });

export async function scene(rect: DOMRect, code: string, ready?: Ready, board?: Board) {
  glyphFont ??= document.fonts.load("40px anr-icon").catch(() => null);
  await glyphFont;
  const app = await stage();
  const root = new Container();
  app.stage.addChild(root);
  const card = await cardSprite(root, code, rect, board?.radius ?? 0);
  if (board?.dim) {
    const grey = new ColorMatrixFilter();
    grey.desaturate();
    grey.brightness(0.55, true);
    card.filters = [grey];
  }
  const sideways = rect.width > rect.height * 1.1;
  const cw = sideways ? rect.height : rect.width;
  const ch = sideways ? rect.width : rect.height;
  const at = (u: number, v: number): [number, number] => {
    const dx = (u - 0.5) * cw;
    const dy = (v - 0.5) * ch;
    return sideways ? [rect.left + rect.width / 2 - dy, rect.top + rect.height / 2 + dx] : [rect.left + rect.width / 2 + dx, rect.top + rect.height / 2 + dy];
  };
  const bx = card.scale.x;
  const by = card.scale.y;
  const fx = layer(root);
  const mid = (r: DOMRect) => [r.left + r.width / 2, r.top + r.height / 2];
  const [x0, y0] = mid(rect);
  const hit = board?.strike;
  const [hx, hy] = hit ? mid(hit) : [x0, y0];
  const grow = hit ? Math.min(3, Math.max(1, (Math.min(hit.width, hit.height) * 1.5) / Math.min(rect.width, rect.height))) : 1;
  let reach = 0;
  root.pivot.set(x0, y0);
  let world: Container | null = null;
  const follow = () => {
    const r = board?.track?.();
    const [x, y] = r && r.width ? mid(r) : [x0, y0];
    const sr = board?.strikeTrack?.();
    const [nx, ny] = sr && sr.width ? mid(sr) : [hx, hy];
    world?.position.set(nx - hx, ny - hy);
    const k = ease.inOut(reach);
    const len = Math.hypot(x - hx, y - hy) || 1;
    const gap = hit ? Math.min(rect.width, rect.height) * grow * 0.75 + Math.min(hit.width, hit.height) * 0.45 : 0;
    const tx = nx + ((x - hx) / len) * gap;
    const ty = ny + ((y - hy) / len) * gap;
    root.position.set(x + (tx - x) * k, y + (ty - y) * k);
    const rs = r && r.width ? r.width / rect.width : 1;
    root.scale.set(rs * (1 + (grow - 1) * k));
  };
  app.ticker.add(follow, undefined, 1);
  let alive = 0;
  const release = (ticker: { deltaMS: number }) => {
    alive += (window as any).__fxManual ? 1 / 30 : ticker.deltaMS / 1000;
    if (!board?.cap || alive < board.cap) return;
    app.ticker.remove(release);
    card.visible = false;
    board.free?.();
    const fade = (tk: { deltaMS: number }) => {
      root.alpha = Math.max(0, root.alpha - ((window as any).__fxManual ? 1 / 30 : tk.deltaMS / 1000) / 0.55);
      if (root.alpha <= 0) app.ticker.remove(fade);
    };
    app.ticker.add(fade);
  };
  if (board?.cap) app.ticker.add(release);
  world = layer(app.stage);
  const glide = (to: number) => {
    const from = reach;
    return run(app, (t) => {
      reach = from + (to - from) * span(t, 0, 0.28);
      return t < 0.28;
    });
  };
  ready?.();
  if (hit) await glide(1);
  return {
    app,
    root,
    card,
    fx,
    world: world as Container,
    strike: hit ? ([hx, hy] as [number, number]) : null,
    zoom: (f: number) => card.scale.set(bx * f, by * f),
    done: async () => {
      if (hit) await glide(0);
      app.ticker.remove(follow);
      app.ticker.remove(release);
      root.destroy({ children: true });
      world?.destroy({ children: true });
    },
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    unit: Math.min(rect.width, rect.height),
    at,
    sideways,
  };
}

export function burst(e: Emitter, x: number, y: number, n: number, color: number, speed: number, o: { life?: number; scale?: number; gravity?: number; tex?: Texture } = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    e.add(o.tex ?? sparkTexture(), x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (o.life ?? 0.6) * (0.6 + Math.random() * 0.6), drag: 2.5, gravity: o.gravity ?? 0, tint: Math.random() < 0.25 ? WHITE : color, scale: (o.scale ?? 0.45) * (0.6 + Math.random() * 0.8) });
  }
}

export function ringAt(g: Graphics, x: number, y: number, r: number, k: number, color: number, width = 5) {
  if (k <= 0 || k >= 1) return;
  g.circle(x, y, r * ease.out(k)).stroke({ width: width * (1 - k) + 1, color, alpha: 1 - k });
}

interface Homing {
  s: Sprite;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  at: number;
  dur: number;
  arc: number;
}

export function homing(parent: Container, tex: Texture, from: [number, number], to: [number, number], at: number, tint: number, scale: number, arc: number): Homing {
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  s.tint = tint;
  s.blendMode = "add";
  s.scale.set(scale);
  s.alpha = 0;
  parent.addChild(s);
  return { s, x0: from[0], y0: from[1], x1: to[0], y1: to[1], at, dur: 0.55 + Math.random() * 0.2, arc };
}

export function flyHome(list: Homing[], t: number, trail?: Emitter, color = GOLD) {
  let landed = 0;
  for (const h of list) {
    const k = span(t, h.at, h.at + h.dur);
    if (k <= 0) continue;
    const e = ease.inOut(k);
    const x = h.x0 + (h.x1 - h.x0) * e + Math.sin(e * Math.PI) * h.arc;
    const y = h.y0 + (h.y1 - h.y0) * e - Math.sin(e * Math.PI) * Math.abs(h.arc) * 0.6;
    h.s.position.set(x, y);
    h.s.alpha = k >= 1 ? 0 : 1;
    if (k < 1 && trail && Math.random() < 0.6) trail.add(sparkTexture(), x, y, { life: 0.3, tint: color, scale: h.s.scale.x * 0.6, grow: -1 });
    if (k >= 1) landed++;
  }
  return landed;
}

export function landing(e: Emitter, at: DOMRect | null | undefined, color: number) {
  if (!at) return;
  burst(e, at.left + at.width / 2, at.top + at.height / 2, 14, color, 160, { life: 0.45, scale: 0.4 });
}

export const pt = (r: DOMRect): [number, number] => [r.left + r.width / 2, r.top + r.height / 2];

export const noiseTexture = () =>
  painted("noise", 256, 256, (g) => {
    const img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const x = (i / 4) % 256;
      const y = Math.floor(i / 4 / 256);
      const v = 128 + 60 * Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) + 40 * Math.sin(y * 0.11 + x * 0.02);
      img.data[i] = v;
      img.data[i + 1] = 255 - v;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });

export function shimmer(root: Container, target: Container, rect: DOMRect, strength: number) {
  const noise = new Sprite(noiseTexture());
  noise.width = rect.width * 1.5;
  noise.height = rect.height * 1.5;
  noise.position.set(rect.left - rect.width * 0.25, rect.top);
  noise.alpha = 0;
  root.addChild(noise);
  const filter = new DisplacementFilter({ sprite: noise, scale: { x: 0, y: 0 } });
  target.filters = [...((target.filters as Filter[] | undefined) ?? []), filter];
  return (t: number, k: number) => {
    noise.y = rect.top - ((t * rect.height * 0.35) % (rect.height * 0.5));
    filter.scale.x = strength * k * 0.4;
    filter.scale.y = strength * k;
  };
}

export const petalTexture = () =>
  painted("petal", 48, 24, (g) => {
    const r = g.createLinearGradient(0, 0, 48, 0);
    r.addColorStop(0, "rgba(160,220,255,0)");
    r.addColorStop(0.5, "rgba(200,240,255,1)");
    r.addColorStop(1, "rgba(160,220,255,0)");
    g.fillStyle = r;
    g.beginPath();
    g.ellipse(24, 12, 22, 7, 0, 0, Math.PI * 2);
    g.fill();
  });

export const puffTexture = (n: number) =>
  painted(`puff${n}`, 128, 128, (g) => {
    let seed = n * 9301 + 49297;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.pow(rand(), 0.7) * 34;
      const x = 64 + Math.cos(a) * d;
      const y = 64 + Math.sin(a) * d * 0.85;
      const r = 14 + rand() * 22;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const alpha = 0.1 + rand() * 0.12;
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(0.6, `rgba(255,255,255,${alpha * 0.45})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
  });

interface Puff {
  s: Sprite;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  spin: number;
  alpha: number;
  phase: number;
}

export class Smoke {
  list: Puff[] = [];
  constructor(public parent: Container) {}
  puff(x: number, y: number, o: { vx?: number; vy?: number; life?: number; size: number; grow?: number; tint?: number; alpha?: number; add?: boolean }) {
    const s = new Sprite(puffTexture(Math.floor(Math.random() * 4)));
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.tint = o.tint ?? 0xffffff;
    s.blendMode = o.add ? "add" : "normal";
    s.rotation = Math.random() * Math.PI * 2;
    s.alpha = 0;
    this.parent.addChild(s);
    this.list.push({ s, vx: o.vx ?? 0, vy: o.vy ?? 0, age: 0, life: o.life ?? 1.6, size: o.size, grow: o.grow ?? 1.4, spin: (Math.random() - 0.5) * 0.6, alpha: o.alpha ?? 0.6, phase: Math.random() * 6 });
  }
  step(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        p.s.destroy();
        this.list.splice(i, 1);
        continue;
      }
      p.vx *= 1 - 0.6 * dt;
      p.vy *= 1 - 0.4 * dt;
      p.s.x += (p.vx + Math.sin(p.age * 2.2 + p.phase) * p.size * 0.15) * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      p.s.scale.set((p.size / 128) * (1 + (p.grow - 1) * ease.out(k)));
      p.s.alpha = p.alpha * Math.min(1, k * 5) * Math.pow(1 - k, 1.5);
    }
    return this.list.length > 0;
  }
}
