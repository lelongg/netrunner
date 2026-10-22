import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import { animate } from "./fx/core";
import { motionOff } from "./settings";

const START = 12;
const COMMIT = 0.22;
const FLICK = 0.5;
const ENTER = 70;

function scrollsSideways(from: EventTarget | null, stop: HTMLElement) {
  for (let el = from instanceof Element ? from : null; el && el !== stop; el = el.parentElement) {
    if (el.matches("input, textarea, select, [role=slider], [data-noswipe]")) return true;
    const style = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(style.overflowX)) return true;
  }
  return false;
}

export function Swipe({ index, count, onIndex, class: cls, children }: { index: number; count: number; onIndex: (i: number) => void; class?: string; children: ComponentChildren }) {
  const el = useRef<HTMLDivElement>(null);
  const shown = useRef(index);
  const drag = useRef<{ id: number; x: number; y: number; t: number; dx: number; on: boolean } | null>(null);
  const swallow = useRef(false);

  useLayoutEffect(() => {
    if (shown.current === index) return;
    const dir = index > shown.current ? 1 : -1;
    shown.current = index;
    const node = el.current;
    if (!node) return;
    if (motionOff()) {
      node.style.transform = "";
      node.style.opacity = "";
      return;
    }
    animate(node, { x: [dir * ENTER, 0], opacity: [0, 1] }, { duration: 0.26, ease: [0.2, 0.8, 0.2, 1] });
  }, [index]);

  const move = (dx: number) => {
    const node = el.current!;
    const edge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    const shift = edge ? dx * 0.3 : dx;
    node.style.transform = `translateX(${shift}px)`;
    node.style.opacity = String(1 - Math.min(0.5, Math.abs(shift) / node.clientWidth));
    return shift;
  };

  const release = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    swallow.current = true;
    setTimeout(() => (swallow.current = false), 350);
    const node = el.current!;
    const width = node.clientWidth || 1;
    const speed = d.dx / Math.max(1, performance.now() - d.t);
    const next = index + (d.dx < 0 ? 1 : -1);
    const shift = move(d.dx);
    if (next >= 0 && next < count && (Math.abs(d.dx) > width * COMMIT || Math.abs(speed) > FLICK)) {
      const out = d.dx < 0 ? -width * 0.35 : width * 0.35;
      animate(node, { x: [shift, out], opacity: [Number(node.style.opacity), 0] }, { duration: 0.12, ease: "easeIn", keep: true }).finished.then(() => onIndex(next), () => onIndex(next));
    } else {
      animate(node, { x: [shift, 0], opacity: [Number(node.style.opacity), 1] }, { type: "spring", visualDuration: 0.3, bounce: 0.2 });
    }
  };

  return (
    <div
      ref={el}
      class={`swipe ${cls ?? ""}`}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" || count < 2 || scrollsSideways(e.target, e.currentTarget as HTMLElement)) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, on: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.on) {
          if (Math.abs(dy) > START && Math.abs(dy) > Math.abs(dx)) {
            drag.current = null;
            return;
          }
          if (Math.abs(dx) < START || Math.abs(dx) < Math.abs(dy) * 1.3) return;
          d.on = true;
          d.x = e.clientX;
          d.t = performance.now();
        }
        d.dx = e.clientX - d.x;
        move(d.dx);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onClickCapture={(e) => {
        if (!swallow.current) return;
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
