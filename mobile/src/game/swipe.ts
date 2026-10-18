import { type AnimationPlaybackControls, animate as animateValue } from "motion";
import { motionOff } from "../settings";
import { useLayoutEffect, useRef } from "preact/hooks";
import { animate as animateFx } from "../fx/core";

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

export function useSheetPager(sheet: { current: HTMLElement | null }, key: unknown, can: (dir: -1 | 1) => boolean, step: (dir: -1 | 1) => void) {
  const entering = useRef<-1 | 1 | 0>(0);
  const peeked = useRef(false);
  const head = () => sheet.current?.querySelector<HTMLElement>(".sheet-head");
  const peekOf = (dir: -1 | 1) => sheet.current?.querySelector<HTMLElement>(dir === 1 ? ".sheet-peek.next" : ".sheet-peek.prev");
  const peek: Peek = {
    move: (dx) => {
      const h = head();
      if (!h) return;
      const w = h.getBoundingClientRect().width + 24;
      for (const dir of [-1, 1] as const) {
        const el = peekOf(dir);
        if (!el) continue;
        const show = dir === 1 ? dx < 0 : dx > 0;
        if (show && el.style.visibility !== "visible") {
          el.style.top = `${h.offsetTop}px`;
          el.style.height = "auto";
          const need = el.offsetHeight;
          el.style.height = `${Math.max(need, h.offsetHeight)}px`;
          const box = sheet.current;
          if (box && need > h.offsetHeight) {
            const locked = box.style.minHeight;
            box.style.minHeight = "";
            const grown = box.offsetHeight + need - h.offsetHeight;
            box.style.minHeight = `${Math.max(grown, parseFloat(locked) || 0)}px`;
          }
        }
        el.style.visibility = show ? "visible" : "hidden";
        el.style.transform = `translateX(${dir * w + dx}px)`;
      }
    },
    release: (dir) => {
      if (!dir) return;
      peeked.current = true;
      const box = sheet.current;
      if (box) box.style.minHeight = `${box.offsetHeight}px`;
    },
    gap: 24,
  };
  const swipe = useDragPager(head, can, (dir) => {
    entering.current = dir;
    step(dir);
  }, peek);
  useLayoutEffect(() => {
    const dir = entering.current;
    entering.current = 0;
    if (peeked.current) {
      peeked.current = false;
      for (const d of [-1, 1] as const) {
        const el = peekOf(d);
        if (el) el.style.visibility = "hidden";
      }
      return;
    }
    const el = head();
    if (!dir || !el || motionOff()) return;
    const from = dir * el.getBoundingClientRect().width * 0.6;
    el.style.transform = `translateX(${from}px)`;
    el.style.opacity = "0.3";
    animateFx(el, { x: [from, 0], opacity: [0.3, 1] }, { type: "spring", visualDuration: 0.3, bounce: 0.15 }).finished.then(
      () => (el.style.opacity = ""),
      () => {},
    );
  }, [key]);
  return swipe;
}
