import { type AnimationPlaybackControls, animate as animateValue } from "motion";
import { motionOff } from "../settings";
import { useRef } from "preact/hooks";

export function useSwipe(onSwipe: (dir: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      start.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e: TouchEvent) => {
      const from = start.current;
      start.current = null;
      const t = e.changedTouches[0];
      if (!from || !t) return;
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

export interface Peek {
  move: (dx: number) => void;
  release: (dir: -1 | 0 | 1) => void;
  gap?: number;
}

const SPRING = { type: "spring", stiffness: 600, damping: 50, restDelta: 1, restSpeed: 40 } as const;

export function useDragPager(target: () => HTMLElement | null | undefined, can: (dir: -1 | 1) => boolean, step: (dir: -1 | 1) => void, peek?: Peek) {
  const drag = useRef<{ x: number; y: number; t: number; axis?: "x" | "y"; dx: number; v: number } | null>(null);
  const flight = useRef<AnimationPlaybackControls | null>(null);
  const settle = (el: HTMLElement, from: number, velocity: number, to: number, done: () => void) => {
    const width = el.getBoundingClientRect().width;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const paint = (raw: number) => {
      const x = Math.min(hi, Math.max(lo, raw));
      el.style.transform = x ? `translateX(${x}px)` : "";
      if (!peek) el.style.opacity = x ? String(1 - (0.7 * Math.min(Math.abs(x), width)) / width) : "";
      peek?.move(x);
    };
    if (motionOff()) {
      paint(to);
      return done();
    }
    flight.current = animateValue(from, to, {
      ...SPRING,
      velocity,
      onUpdate: paint,
      onComplete: () => {
        flight.current = null;
        paint(to);
        done();
      },
    });
  };
  return {
    onTouchStart: (e: TouchEvent) => {
      flight.current?.complete();
      const t = e.touches[0];
      drag.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: performance.now(), dx: 0, v: 0 } : null;
    },
    onTouchMove: (e: TouchEvent) => {
      const d = drag.current;
      const el = target();
      if (!d || !el) return;
      const t = e.touches[0];
      const dx = t.clientX - d.x;
      const dy = t.clientY - d.y;
      if (!d.axis && Math.hypot(dx, dy) > 8) d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis !== "x") return;
      const dir = dx < 0 ? 1 : -1;
      const next = can(dir) ? dx : dx * 0.25;
      const now = performance.now();
      const dt = Math.max(1, now - d.t);
      d.v = 0.7 * ((next - d.dx) / dt) + 0.3 * d.v;
      d.t = now;
      d.dx = next;
      el.style.transform = `translateX(${d.dx}px)`;
      peek?.move(d.dx);
    },
    onTouchEnd: () => {
      const d = drag.current;
      drag.current = null;
      const el = target();
      if (!d || !el || d.axis !== "x") return;
      if (performance.now() - d.t > 80) d.v = 0;
      const width = el.getBoundingClientRect().width;
      const flick = Math.abs(d.v) > 0.45 ? (d.v < 0 ? 1 : -1) : 0;
      const dir = flick || (Math.abs(d.dx) > width * 0.3 ? (d.dx < 0 ? 1 : -1) : 0);
      if (dir && can(dir) && (d.dx < 0 ? 1 : -1) === dir) {
        settle(el, d.dx, d.v * 1000, -dir * (width + (peek?.gap ?? 0)), () => {
          peek?.release(dir);
          step(dir);
        });
      } else {
        settle(el, d.dx, d.v * 1000, 0, () => peek?.release(0));
      }
    },
  };
}
