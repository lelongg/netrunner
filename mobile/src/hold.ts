import { useRef } from "preact/hooks";

export const HOLD_MS = 300;

export function useHold(onHold: ((on: boolean) => void) | undefined) {
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer);
  };
  const handlers = onHold
    ? {
        onPointerDown: (e: PointerEvent) => {
          cancel();
          const p = { x: e.clientX, y: e.clientY, fired: false, timer: 0 };
          p.timer = window.setTimeout(() => {
            p.fired = true;
            navigator.vibrate?.(12);
            onHold(true);
            const block = (e: Event) => e.preventDefault();
            const release = () => {
              onHold(false);
              window.removeEventListener("pointerup", release);
              window.removeEventListener("pointercancel", release);
              setTimeout(() => window.removeEventListener("contextmenu", block, true), 300);
            };
            window.addEventListener("contextmenu", block, true);
            window.addEventListener("pointerup", release);
            window.addEventListener("pointercancel", release);
          }, HOLD_MS);
          press.current = p;
        },
        onPointerMove: (e: PointerEvent) => {
          const p = press.current;
          if (p && !p.fired && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancel();
        },
        onPointerUp: cancel,
        onPointerCancel: cancel,
        onPointerLeave: cancel,
        onContextMenu: (e: Event) => e.preventDefault(),
      }
    : {};
  const consumed = () => {
    const fired = !!press.current?.fired;
    if (fired) press.current = null;
    return fired;
  };
  return { handlers, consumed };
}
