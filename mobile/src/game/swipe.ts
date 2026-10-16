import { animate } from "../fx/core";
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

export function useDragPager(target: () => HTMLElement | null | undefined, can: (dir: -1 | 1) => boolean, step: (dir: -1 | 1) => void) {
  const drag = useRef<{ x: number; y: number; t: number; axis?: "x" | "y"; dx: number } | null>(null);
  const settle = (el: HTMLElement, to: number, done?: () => void) => {
    const from = drag.current?.dx ?? 0;
    if (motionOff()) {
      el.style.transform = "";
      return done?.();
    }
    animate(el, { x: [from, to], opacity: to ? [1, 0.3] : [1, 1] }, to ? { duration: 0.16, ease: [0.4, 0, 1, 1] } : { type: "spring", visualDuration: 0.3, bounce: 0.2 }).finished.then(
      () => done?.(),
      () => {},
    );
  };
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      drag.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: performance.now(), dx: 0 } : null;
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
      d.dx = can(dir) ? dx : dx * 0.25;
      el.style.transform = `translateX(${d.dx}px)`;
    },
    onTouchEnd: () => {
      const d = drag.current;
      const el = target();
      if (!d || !el || d.axis !== "x") {
        drag.current = null;
        return;
      }
      const dir = d.dx < 0 ? 1 : -1;
      const speed = Math.abs(d.dx) / Math.max(1, performance.now() - d.t);
      const width = el.getBoundingClientRect().width;
      if (can(dir) && (Math.abs(d.dx) > width * 0.25 || speed > 0.6)) settle(el, -dir * width, () => step(dir));
      else settle(el, 0);
      drag.current = null;
    },
  };
}
