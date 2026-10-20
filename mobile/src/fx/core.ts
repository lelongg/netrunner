import { animate as motion } from "motion";
import { motionOff } from "../settings";

const TRANSFORMS = ["transformPerspective", "x", "y", "rotate", "rotateY", "skewX", "scale", "scaleX", "scaleY"] as const;

const unit = (key: string, v: unknown) => {
  if (typeof v === "string") return v;
  if (key === "x" || key === "y") return `${v}px`;
  if (key === "rotate" || key === "rotateY" || key === "skewX") return `${v}deg`;
  return String(v);
};

const part = (key: string, v: unknown) => (key === "transformPerspective" ? `perspective(${unit(key, v)}px)` : key === "x" ? `translateX(${unit(key, v)})` : key === "y" ? `translateY(${unit(key, v)})` : `${key}(${unit(key, v)})`);

function resample(values: unknown[], n: number): unknown[] {
  if (values.length === n) return values;
  if (values.length === 1) return Array(n).fill(values[0]);
  const numeric = values.every((v) => typeof v === "number");
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (values.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(values.length - 1, lo + 1);
    if (!numeric) return values[Math.round(t)];
    return (values[lo] as number) + ((values[hi] as number) - (values[lo] as number)) * (t - lo);
  });
}

function composited(keyframes: Record<string, any>) {
  const keys = TRANSFORMS.filter((k) => k in keyframes);
  if (!keys.length) return keyframes;
  const rest: Record<string, any> = {};
  for (const [k, v] of Object.entries(keyframes)) if (!(TRANSFORMS as readonly string[]).includes(k)) rest[k] = v;
  const arrays = keys.map((k) => (Array.isArray(keyframes[k]) ? keyframes[k] : [keyframes[k]]));
  const n = Math.max(...arrays.map((a) => a.length));
  const sampled = arrays.map((a) => resample(a, n));
  rest.transform = Array.from({ length: n }, (_, i) => keys.map((k, j) => part(k, sampled[j][i])).join(" "));
  if (n === 1) rest.transform = rest.transform[0];
  return rest;
}

export function animate(target: any, keyframes: Record<string, any>, { keep, ...options }: Record<string, any> = {}) {
  const anim = motion(target, composited(keyframes) as any, options as any);
  if (options.repeat !== Infinity && !keep) {
    const els: Element[] = Array.isArray(target) ? target : [target];
    anim.finished.then(
      () =>
        requestAnimationFrame(() => {
          for (const el of els) if (el instanceof HTMLElement && el.isConnected && !el.closest(".fx-layer")) el.style.transform = "";
        }),
      () => {},
    );
  }
  return anim;
}

export type Point = [number, number];

export const reduced = motionOff;

let root: HTMLElement | null = null;

export function layer(): HTMLElement {
  if (root?.isConnected) return root;
  root = document.createElement("div");
  root.className = "fx-layer";
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);
  return root;
}

export function node(cls: string, parent: HTMLElement = layer(), tag = "div"): HTMLElement {
  const el = document.createElement(tag);
  el.className = cls;
  parent.appendChild(el);
  return el;
}

export function place(el: HTMLElement, r: { left: number; top: number; width: number; height: number }) {
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.width = `${r.width}px`;
  el.style.height = `${r.height}px`;
}

export function visible(r: DOMRect | null | undefined): r is DOMRect {
  return !!r && r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}

export function rectOf(el: Element | null | undefined): DOMRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width || r.height ? r : null;
}

export const mid = (r: DOMRect): Point => [r.left + r.width / 2, r.top + r.height / 2];

export function anchor(name: string): Element | null {
  return document.querySelector(`[data-anchor="${name}"]`);
}

export function scoreSegment(side: string): Element | null {
  const lit = anchor(`${side}-points`)?.querySelectorAll("i.on");
  return lit?.length ? lit[lit.length - 1] : anchor(`${side}-points`);
}

export function scoreSegments(side: string, n: number): Element[] {
  const lit = [...(anchor(`${side}-points`)?.querySelectorAll("i.on") ?? [])];
  return lit.slice(-Math.max(1, n));
}

export function points(from: Point, segments: Element[], tone: Tone = "gold") {
  if (reduced()) return;
  segments.forEach((seg, i) => {
    const r = rectOf(seg);
    if (!visible(r)) return;
    const to = mid(r);
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const el = node(`fx-comet tone-${tone}`);
    el.style.left = `${from[0]}px`;
    el.style.top = `${from[1]}px`;
    const delay = i * 0.14;
    animate(el, { x: [0, dx], y: [0, dy], rotate: [angle, angle], scaleX: [0.4, 1.8, 0.9], opacity: [0, 1, 1] }, { duration: 0.6, delay, ease: [0.55, 0, 0.85, 0.45] }).finished.then(
      () => {
        el.remove();
        ring(to, tone, 70);
        burst(to, tone, 10, 40, { size: 4, gravity: 0 });
        const pending = seg instanceof HTMLElement && !!seg.dataset.pending;
        if (pending) delete (seg as HTMLElement).dataset.pending;
        animate(seg, { scaleY: [pending ? 3.5 : 1, 3, 1], opacity: [pending ? 0 : 1, 1, 1], filter: ["brightness(1)", "brightness(2.5)", "brightness(1)"] }, { duration: 0.5, ease: "easeOut" }).finished.then(() => {
          if (pending) (seg as HTMLElement).style.opacity = "";
        });
      },
      () => el.remove(),
    );
  });
}

export function tileEl(cid: unknown): HTMLElement | null {
  return document.querySelector(`.tile[data-cid="${String(cid)}"]`) as HTMLElement | null;
}

export function wrapEl(cid: unknown): HTMLElement | null {
  return (tileEl(cid)?.closest(".tile-wrap") as HTMLElement | null) ?? null;
}

export function pointOf(target: Element | null | undefined): Point | null {
  const r = rectOf(target);
  return visible(r) ? mid(r) : null;
}

export const done = (anim: { finished: Promise<unknown> }, el: Element) =>
  anim.finished.then(
    () => el.remove(),
    () => el.remove(),
  );

export const haptics = { muted: false };

export function buzz(pattern: number | number[]) {
  if (haptics.muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export function shake(power = 1) {
  if (reduced()) return;
  const el = document.querySelector(".playfield") as HTMLElement | null;
  if (!el) return;
  const a = 7 * power;
  animate(el, { x: [0, -a, a * 0.8, -a * 0.5, a * 0.3, 0], y: [0, a * 0.3, -a * 0.4, a * 0.2, 0, 0] }, { duration: 0.42, ease: "easeOut" });
}

export function punch(el: Element | null, scale = 1.25) {
  if (!el || reduced()) return;
  animate(el, { scale: [scale, 1] }, { type: "spring", visualDuration: 0.35, bounce: 0.55 });
}

export function flash(tone: "red" | "cyan" | "gold" | "white" | "violet", strength = 0.5, duration = 0.55) {
  if (reduced()) return;
  const el = node(`fx-flash tone-${tone}`);
  done(animate(el, { opacity: [strength, 0] }, { duration, ease: "easeOut" }), el);
}

export function vignette(tone: "red" | "cyan" | "gold" | "violet" | "orange", hold = 0.6) {
  if (reduced()) return;
  const el = node(`fx-vignette tone-${tone}`);
  done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 0.35 + hold, times: [0, 0.2, 0.7, 1] }), el);
}

const PALETTE: Record<string, string[]> = {
  cyan: ["#22d3ee", "#a5f3fc", "#ffffff"],
  red: ["#ff3b30", "#ff8a80", "#ffd0cc"],
  gold: ["#f6e03a", "#ffb800", "#fff6b0"],
  violet: ["#c792ff", "#7fb0ff", "#ffffff"],
  orange: ["#ff9f1c", "#ffd166", "#ffffff"],
  blue: ["#7fb0ff", "#2b6cff", "#d6e4ff"],
};

export type Tone = keyof typeof PALETTE;

export function burst(at: Point, tone: Tone = "cyan", count = 18, spread = 90, opts: { gravity?: number; size?: number; shards?: boolean } = {}) {
  if (reduced()) return;
  const colors = PALETTE[tone];
  for (let i = 0; i < count; i++) {
    const el = node(opts.shards ? "fx-shard" : "fx-spark");
    const s = (opts.size ?? 6) * (0.6 + Math.random() * 0.8);
    el.style.left = `${at[0]}px`;
    el.style.top = `${at[1]}px`;
    el.style.width = `${opts.shards ? s * 0.6 : s}px`;
    el.style.height = `${opts.shards ? s * 1.8 : s}px`;
    el.style.background = colors[i % colors.length];
    el.style.color = colors[i % colors.length];
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = spread * (0.45 + Math.random() * 0.75);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const g = opts.gravity ?? 40;
    done(animate(el, { x: [0, dx * 0.7, dx], y: [0, dy * 0.7, dy + g], opacity: [1, 1, 0], scale: [1, 1, 0.3], rotate: [0, (Math.random() - 0.5) * 540] }, { duration: 0.55 + Math.random() * 0.35, ease: [0.1, 0.8, 0.3, 1] }), el);
  }
}

export function ring(at: Point, tone: Tone = "cyan", size = 120, delay = 0) {
  if (reduced()) return;
  const el = node(`fx-ring tone-${tone}`);
  el.style.left = `${at[0] - size / 2}px`;
  el.style.top = `${at[1] - size / 2}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  done(animate(el, { scale: [0.15, 1], opacity: [1, 0] }, { duration: 0.6, delay, ease: [0.2, 0.8, 0.3, 1] }), el);
}

export function rays(at: Point, tone: Tone = "gold", size = 520, duration = 1.4) {
  if (reduced()) return;
  const el = node(`fx-rays tone-${tone}`);
  el.style.left = `${at[0] - size / 2}px`;
  el.style.top = `${at[1] - size / 2}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  done(animate(el, { scale: [0.3, 1.1, 1.2], opacity: [0, 0.9, 0], rotate: [0, 50] }, { duration, ease: "easeOut" }), el);
}

export function floater(at: Point, text: string, tone: Tone = "cyan", rise = 60, big = false) {
  if (reduced()) return;
  const el = node(`fx-floater tone-${tone} ${big ? "big" : ""}`);
  el.textContent = text;
  el.style.left = `${at[0]}px`;
  el.style.top = `${at[1]}px`;
  done(animate(el, { y: [10, -rise * 0.4, -rise], scale: [0.4, 1.2, 1], opacity: [0, 1, 0] }, { duration: 1.1, times: [0, 0.25, 1], ease: "easeOut" }), el);
}

export function banner(title: string, sub: string, tone: Tone | "white" = "cyan", opts: { size?: "xl" | "lg" | "md"; hold?: number; from?: "left" | "right" } = {}) {
  const el = node(`fx-banner tone-${tone} size-${opts.size ?? "lg"}`);
  const band = node("fx-banner-band", el);
  const t = node("fx-banner-title", band, "span");
  t.textContent = title;
  t.dataset.text = title;
  if (sub) node("fx-banner-sub", band, "span").textContent = sub;
  const hold = opts.hold ?? 0.75;
  if (reduced()) {
    done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: hold + 0.6 }), el);
    return;
  }
  const dir = opts.from === "right" ? 1 : -1;
  animate(band, { x: [`${dir * 110}%`, "0%"], skewX: [dir * 18, 0] }, { type: "spring", visualDuration: 0.38, bounce: 0.3 });
  animate(t, { letterSpacing: ["0.6em", "0.04em"], opacity: [0, 1] }, { duration: 0.45, ease: [0.2, 0.9, 0.3, 1] });
  const out = animate(band, { x: ["0%", `${-dir * 120}%`], opacity: [1, 0] }, { duration: 0.28, delay: 0.38 + hold, ease: "easeIn" });
  done(out, el);
}

export function stamp(at: Point, text: string, tone: Tone = "red") {
  if (reduced()) return;
  const el = node(`fx-stamp tone-${tone}`);
  el.textContent = text;
  el.style.left = `${at[0]}px`;
  el.style.top = `${at[1]}px`;
  done(animate(el, { scale: [2.6, 0.92, 1, 1], rotate: [-14, -8, -8, -8], opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.16, 0.3, 1], ease: "easeOut" }), el);
}

export function glitch(power = 1) {
  if (reduced()) return;
  const el = node("fx-glitch");
  for (let i = 0; i < 6; i++) {
    const bar = node("fx-glitch-bar", el);
    bar.style.top = `${Math.random() * 92}%`;
    bar.style.height = `${2 + Math.random() * 9}%`;
    bar.style.background = i % 2 ? "rgb(255 59 48 / 0.22)" : "rgb(34 211 238 / 0.2)";
    animate(bar, { x: [0, (Math.random() - 0.5) * 80 * power, (Math.random() - 0.5) * 40 * power, 0] }, { duration: 0.4, ease: "linear" });
  }
  done(animate(el, { opacity: [1, 0.7, 1, 0] }, { duration: 0.45, times: [0, 0.3, 0.6, 1] }), el);
}

export function coins(from: Point, to: Point, n: number, tone: Tone = "gold", delay = 0) {
  if (reduced()) return;
  const count = Math.min(Math.max(n, 1), 8);
  for (let i = 0; i < count; i++) {
    const el = node(`fx-coin tone-${tone}`);
    el.style.left = `${from[0] - 7}px`;
    el.style.top = `${from[1] - 7}px`;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const lift = -40 - Math.random() * 50;
    const sx = (Math.random() - 0.5) * 50;
    done(animate(el, { x: [0, dx * 0.35 + sx, dx], y: [0, dy * 0.35 + lift, dy], scale: [0.4, 1.15, 0.6], opacity: [0, 1, 1] }, { duration: 0.55 + i * 0.03, delay: delay + i * 0.06, ease: [0.4, 0, 0.3, 1] }), el);
  }
}

export function lunge(source: HTMLElement | null, target: Point, opts: { tone?: Tone; reach?: number; onHit?: () => void } = {}) {
  const r = rectOf(source);
  if (!source || !visible(r) || reduced()) {
    opts.onHit?.();
    return;
  }
  const ghost = node("fx-ghost fx-lunge");
  place(ghost, r);
  const face = source.cloneNode(true) as HTMLElement;
  face.removeAttribute("data-cid");
  face.style.opacity = "";
  ghost.appendChild(face);
  const from = mid(r);
  const reach = opts.reach ?? 0.82;
  const dx = (target[0] - from[0]) * reach;
  const dy = (target[1] - from[1]) * reach;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const tilt = Math.max(-25, Math.min(25, (angle - 90) * 0.25));
  source.style.opacity = "0.35";
  animate(ghost, { x: [0, -dx * 0.08, dx], y: [0, -dy * 0.08 - 14, dy], scale: [1, 1.18, 1.05], rotate: [0, -tilt, tilt] }, { duration: 0.34, times: [0, 0.35, 1], ease: [0.5, 0, 0.9, 0.6] })
    .finished.then(() => {
      opts.onHit?.();
      return animate(ghost, { x: [dx, 0], y: [dy, 0], scale: [1.05, 1], rotate: [tilt, 0] }, { type: "spring", visualDuration: 0.4, bounce: 0.35 }).finished;
    })
    .then(
      () => {
        ghost.remove();
        source.style.opacity = "";
      },
      () => {
        ghost.remove();
        source.style.opacity = "";
      },
    );
}

export function slash(at: Point, tone: Tone = "cyan", size = 90, angle = -35) {
  if (reduced()) return;
  const el = node(`fx-slash tone-${tone}`);
  el.style.left = `${at[0] - size / 2}px`;
  el.style.top = `${at[1] - 2}px`;
  el.style.width = `${size}px`;
  done(animate(el, { rotate: [angle, angle], scaleX: [0, 1.15, 1.15], opacity: [1, 1, 0] }, { duration: 0.45, times: [0, 0.3, 1], ease: "easeOut" }), el);
}

export function split(tone: Tone = "cyan") {
  if (reduced()) return;
  const el = node(`fx-split tone-${tone}`);
  const top = node("fx-split-half top", el);
  const bottom = node("fx-split-half bottom", el);
  const seam = node("fx-split-seam", el);
  animate(seam, { scaleX: [0, 1, 1], opacity: [1, 1, 0] }, { duration: 0.52, times: [0, 0.45, 1], ease: "easeOut" });
  const open = { duration: 0.38, delay: 0.23, ease: [0.3, 0, 0.2, 1] };
  animate(top, { y: ["0%", "-100%"] }, open);
  animate(bottom, { y: ["0%", "100%"] }, open);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 0.7, times: [0, 0.9, 1] }), el);
}

export function gate(target: Element | null, tone: Tone = "orange") {
  const r = rectOf(target);
  if (!visible(r) || reduced()) return;
  const el = node(`fx-gate tone-${tone}`);
  place(el, { left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 });
  const left = node("fx-gate-half l", el);
  const right = node("fx-gate-half r", el);
  const seam = node("fx-gate-seam", el);
  const close = { duration: 0.24, ease: [0.55, 0, 0.9, 0.5] };
  animate(left, { x: ["-100%", "0%"] }, close);
  animate(right, { x: ["100%", "0%"] }, close);
  animate(seam, { opacity: [0, 1, 0.6], scaleY: [0.2, 1.15, 1] }, { duration: 0.35, delay: 0.22 });
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.1, times: [0, 0.7, 1] }), el);
}
