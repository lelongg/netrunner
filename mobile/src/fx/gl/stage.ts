import "pixi.js/unsafe-eval";
import { Application, Assets, Container, Filter, GlProgram, Graphics, Sprite, Texture, type Ticker, defaultFilterVert } from "pixi.js";
import { AdvancedBloomFilter } from "pixi-filters";

let app: Application | null = null;
let booting: Promise<Application> | null = null;

export async function stage(): Promise<Application> {
  if (app) return app;
  booting ??= (async () => {
    const a = new Application();
    await a.init({ backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, resizeTo: window, preference: "webgl" });
    a.canvas.className = "fx-gl";
    document.body.appendChild(a.canvas);
    if ((window as any).__fxManual) {
      a.ticker.stop();
      (window as any).__fxFrame = () => a.ticker.update(a.ticker.lastTime + 1000 / 30);
    }
    app = a;
    return a;
  })();
  return booting;
}

export function layer(parent: Container, bloom = true) {
  const c = new Container();
  if (bloom) c.filters = [new AdvancedBloomFilter({ threshold: 0.25, bloomScale: 1.4, brightness: 1.05, blur: 6, quality: 6 })];
  parent.addChild(c);
  return c;
}

const textures = new Map<string, Texture>();

function canvasTexture(key: string, size: number, paint: (g: CanvasRenderingContext2D, s: number) => void) {
  const hit = textures.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  paint(c.getContext("2d")!, size);
  const t = Texture.from(c);
  textures.set(key, t);
  return t;
}

export const glowTexture = () =>
  canvasTexture("glow", 128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.25, "rgba(255,255,255,0.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

export const sparkTexture = () =>
  canvasTexture("spark", 64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.15, "rgba(255,255,255,0.9)");
    r.addColorStop(0.4, "rgba(255,255,255,0.15)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.fillRect(s / 2 - 0.75, 0, 1.5, s);
    g.fillRect(0, s / 2 - 0.75, s, 1.5);
  });

export async function cardTexture(code: string) {
  const url = `https://card-images.netrunnerdb.com/v2/large/${code}.jpg`;
  return Assets.load<Texture>({ src: url, parser: "texture", data: { crossOrigin: "anonymous" } } as any);
}

export async function cardSprite(parent: Container, code: string, rect: DOMRect) {
  const tex = await cardTexture(code);
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  const sideways = rect.width > rect.height * 1.1;
  s.rotation = sideways ? Math.PI / 2 : 0;
  s.scale.set((sideways ? rect.height : rect.width) / tex.width, (sideways ? rect.width : rect.height) / tex.height);
  s.position.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
  parent.addChild(s);
  return s;
}

export type Tick = (t: number, dt: number) => boolean | void;

export function run(a: Application, tick: Tick) {
  let t = 0;
  return new Promise<void>((done) => {
    const fn = (ticker: Ticker) => {
      const dt = (window as any).__fxManual ? 1 / 30 : Math.min(0.05, ticker.deltaMS / 1000);
      t += dt;
      if (tick(t, dt) === false) {
        a.ticker.remove(fn);
        done();
      }
    };
    a.ticker.add(fn);
  });
}

export interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  life: number;
  age: number;
  spin: number;
  grow: number;
  drag: number;
  gravity: number;
  fade: number;
}

export class Emitter {
  list: Particle[] = [];
  constructor(public parent: Container) {}
  add(tex: Texture, x: number, y: number, o: Partial<Omit<Particle, "s" | "age">> & { tint?: number; scale?: number; alpha?: number; blend?: "add" | "normal" } = {}) {
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.tint = o.tint ?? 0xffffff;
    s.scale.set(o.scale ?? 1);
    s.alpha = o.alpha ?? 1;
    s.blendMode = o.blend === "normal" ? "normal" : "add";
    this.parent.addChild(s);
    this.list.push({ s, vx: o.vx ?? 0, vy: o.vy ?? 0, life: o.life ?? 1, age: 0, spin: o.spin ?? 0, grow: o.grow ?? 0, drag: o.drag ?? 0, gravity: o.gravity ?? 0, fade: o.fade ?? 1 });
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
      p.vy += p.gravity * dt;
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      if (p.grow) p.s.scale.set(Math.max(0, p.s.scale.y + p.grow * dt));
      p.s.alpha = Math.min(1, (1 - k) * p.fade * 1.4);
    }
    return this.list.length > 0;
  }
}

export const ease = {
  out: (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3),
  inOut: (t: number) => {
    const x = Math.min(1, Math.max(0, t));
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  back: (t: number) => {
    const x = Math.min(1, Math.max(0, t));
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  },
};

export const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

const DISSOLVE = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uProgress;
uniform vec3 uEdge;
uniform vec4 uInputClamp;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main() {
  vec4 color = texture(uTexture, vTextureCoord);
  vec2 uv = (vTextureCoord - uInputClamp.xy) / (uInputClamp.zw - uInputClamp.xy);
  float n = noise(uv * 18.0) * 0.55 + noise(uv * 5.0) * 0.45;
  float h = (1.0 - uv.y) * 0.7 + n * 0.3;
  float edge = uProgress * 1.15 - h;
  float shown = smoothstep(0.0, 0.02, edge);
  float rim = smoothstep(0.09, 0.0, edge) * step(0.0, edge);
  float scan = 0.85 + 0.15 * sin(uv.y * 420.0);
  vec3 c = color.rgb * mix(scan, 1.0, smoothstep(0.2, 0.6, edge)) + uEdge * rim * 2.2;
  finalColor = vec4(c * color.a, color.a) * max(shown, rim);
}`;

export function dissolveFilter(edge: [number, number, number]) {
  const glProgram = GlProgram.from({ vertex: defaultFilterVert, fragment: DISSOLVE, name: "dissolve" });
  return new Filter({ glProgram, resources: { dissolve: { uProgress: { value: 0, type: "f32" }, uEdge: { value: new Float32Array(edge), type: "vec3<f32>" } } } });
}

export function lightning(g: Graphics, x0: number, y0: number, x1: number, y1: number, jag: number, color: number, width: number) {
  const pts: [number, number][] = [[x0, y0]];
  const n = 10;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const len = Math.hypot(nx, ny) || 1;
    const off = (Math.random() - 0.5) * jag * Math.sin(t * Math.PI);
    pts.push([x0 + (x1 - x0) * t + (nx / len) * off, y0 + (y1 - y0) * t + (ny / len) * off]);
  }
  pts.push([x1, y1]);
  for (const [w, a] of [
    [width * 4, 0.18],
    [width * 1.8, 0.45],
    [width * 0.8, 1],
  ] as const) {
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.stroke({ width: w, color: a === 1 ? 0xffffff : color, alpha: a, cap: "round", join: "round" });
  }
}
