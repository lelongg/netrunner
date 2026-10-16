import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { animate } from "motion";
import { motionOff } from "../settings";

const still = motionOff;

export function Count({ value, anchor }: { value: number; anchor?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  useLayoutEffect(() => {
    if (el.current) el.current.textContent = String(shown.current);
  }, []);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const from = shown.current;
    shown.current = value;
    if (from === value || still()) {
      node.textContent = String(value);
      return;
    }
    const anim = animate(from, value, {
      duration: Math.min(0.9, 0.25 + Math.abs(value - from) * 0.06),
      ease: [0.2, 0.8, 0.3, 1],
      onUpdate: (v) => (node.textContent = String(Math.round(v))),
    });
    node.classList.add(value > from ? "counting-up" : "counting-down");
    anim.finished.then(() => node.classList.remove("counting-up", "counting-down"));
    return () => anim.stop();
  }, [value]);
  return <span ref={el} class="count" data-anchor={anchor} />;
}

export function useLoop(ref: { current: Element | null }, keyframes: any, options: any, deps: unknown[] = []) {
  useEffect(() => {
    if (!ref.current || still()) return;
    const anim = animate(ref.current, keyframes, { repeat: Infinity, ...options });
    return () => anim.cancel();
  }, deps);
}

const BOUNCE = [0.2, 1.25, 0.4, 1] as const;
const SMOOTH = [0.2, 0.9, 0.3, 1] as const;

function settle(el: Element) {
  requestAnimationFrame(() => {
    const style = (el as HTMLElement).style;
    style.transform = "";
    style.opacity = "";
  });
}

function rise(el: Element, from: string, duration: number, ease: readonly number[], delay = 0, fade = true) {
  const to = from.replace(/translate([XY])\([^)]*\)/g, "translate$1(0px)").replace(/scale\([^)]*\)/g, "scale(1)");
  animate(el, fade ? { transform: [from, to], opacity: [0, 1] } : { transform: [from, to] }, { duration, ease: ease as any, delay }).finished.then(
    () => settle(el),
    () => settle(el),
  );
}

const ENTER: [string, (el: HTMLElement) => void][] = [
  [".sheet", (el) => rise(el, "translateY(100%)", 0.32, SMOOTH, 0, false)],
  [
    ".sheet-backdrop, .menu-backdrop",
    (el) =>
      animate(el, { opacity: [0, 1] }, { duration: 0.18 }).finished.then(
        () => settle(el),
        () => settle(el),
      ),
  ],
  [".menu", (el) => rise(el, "translateY(-14px) scale(0.85)", 0.28, BOUNCE)],
  [
    ".card-zoom",
    (el) =>
      animate(el, { opacity: [0, 1] }, { duration: 0.15 }).finished.then(
        () => settle(el),
        () => settle(el),
      ),
  ],
  [".update-banner", (el) => rise(el, "translateY(60px)", 0.35, BOUNCE)],
  [".toast", (el) => rise(el, "translateX(-40px) scale(0.9)", 0.32, BOUNCE)],
  [".encounter", (el) => rise(el, "translateY(24px) scale(0.96)", 0.34, BOUNCE)],
  [".breakers .brk", (el) => rise(el, "translateX(-24px)", 0.3, BOUNCE, indexIn(el) * 0.05)],
  [".actions .buttons > button, .prompt .choices > button, .prompt > button, .prompt .cta", (el) => rise(el, "translateY(16px) scale(0.94)", 0.3, BOUNCE, indexIn(el) * 0.04)],
  [".game-list > *, .home .panel, .lobby .panel", (el) => rise(el, "translateY(18px)", 0.34, SMOOTH, indexIn(el) * 0.05)],
];

function indexIn(el: Element) {
  const parent = el.parentElement;
  if (!parent) return 0;
  return Math.min(8, Array.prototype.indexOf.call(parent.children, el));
}

function enter(root: Element) {
  for (const [selector, run] of ENTER) {
    if (root.matches(selector)) run(root as HTMLElement);
    for (const el of root.querySelectorAll<HTMLElement>(selector)) run(el);
  }
}

let installed = false;

export function installMotion() {
  if (installed) return;
  installed = true;
  const observer = new MutationObserver((records) => {
    if (still()) return;
    for (const r of records)
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        const el = n as HTMLElement;
        if (el.closest(".fx-layer")) continue;
        enter(el);
      }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener(
    "click",
    (e) => {
      if (still()) return;
      const t = (e.target as Element | null)?.closest?.("button, .tile") as HTMLElement | null;
      if (!t || (t as HTMLButtonElement).disabled || t.closest(".fx-layer")) return;
      const from = t.classList.contains("tile") ? 0.92 : 0.94;
      animate(t, { transform: [`scale(${from})`, "scale(1)"] }, { duration: 0.3, ease: [0.2, 1.6, 0.4, 1] }).finished.then(
        () => requestAnimationFrame(() => (t.style.transform = "")),
        () => requestAnimationFrame(() => (t.style.transform = "")),
      );
    },
    { capture: true, passive: true },
  );
}
