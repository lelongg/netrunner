import type { ComponentChildren } from "preact";
import { useRef, useState } from "preact/hooks";
import { animate } from "motion";
import { Icon } from "../icons";
import { motionOff } from "../settings";

const THRESHOLD = 0.35;

export function SwipeDelete({ children, label, confirm }: { children: ComponentChildren; label: string; confirm: () => Promise<boolean> }) {
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; dx: number; axis?: "x" | "y" } | null>(null);
  const [armed, setArmed] = useState(false);
  const place = (x: number) => {
    if (row.current) row.current.style.transform = x ? `translateX(${x}px)` : "";
  };
  const settle = (to: number) => {
    const el = row.current;
    if (!el) return Promise.resolve();
    const from = drag.current?.dx ?? 0;
    if (motionOff()) {
      place(to);
      return Promise.resolve();
    }
    return new Promise<void>((done) => animate(from, to, { type: "spring", stiffness: 500, damping: 45, onUpdate: place, onComplete: () => done() }));
  };
  return (
    <div class={`swipe-delete ${armed ? "armed" : ""}`}>
      <div class="swipe-delete-under" aria-hidden="true">
        <Icon name="trash" />
        <span>{label}</span>
      </div>
      <div
        ref={row}
        class="swipe-delete-row"
        onPointerDown={(e) => {
          if (e.button === 0) drag.current = { x: e.clientX, y: e.clientY, dx: 0 };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.axis && Math.hypot(dx, dy) > 8) d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (d.axis !== "x") return;
          if (!row.current?.hasPointerCapture(e.pointerId)) row.current?.setPointerCapture(e.pointerId);
          d.dx = Math.min(0, dx);
          place(d.dx);
          setArmed(-d.dx > (row.current?.offsetWidth ?? 300) * THRESHOLD);
        }}
        onPointerCancel={() => {
          if (drag.current?.axis !== "x") drag.current = null;
        }}
        onPointerUp={async () => {
          const d = drag.current;
          if (!d || d.axis !== "x") return (drag.current = null);
          const width = row.current?.offsetWidth ?? 300;
          if (-d.dx > width * THRESHOLD) {
            await settle(-width * 0.5);
            drag.current = { ...d, dx: -width * 0.5 };
            const yes = await confirm();
            if (!yes) await settle(0);
          } else await settle(0);
          setArmed(false);
          setTimeout(() => (drag.current = null));
        }}
        onClickCapture={(e) => {
          if (drag.current?.axis === "x") {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
