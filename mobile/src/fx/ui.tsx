import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { animate } from "motion";

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    return () => anim.stop();
  }, deps);
}

const ENTER: [string, (el: HTMLElement) => void][] = [
  [".sheet", (el) => animate(el, { y: ["100%", "0%"] }, { type: "spring", visualDuration: 0.42, bounce: 0.18 })],
  [".sheet-backdrop, .menu-backdrop", (el) => animate(el, { opacity: [0, 1] }, { duration: 0.2 })],
  [".menu", (el) => animate(el, { scale: [0.85, 1], y: [-14, 0], opacity: [0, 1] }, { type: "spring", visualDuration: 0.3, bounce: 0.3 })],
  [".card-zoom", (el) => animate(el, { scale: [0.6, 1], opacity: [0, 1], rotate: [-4, 0] }, { type: "spring", visualDuration: 0.38, bounce: 0.3 })],
  [".update-banner", (el) => animate(el, { y: [60, 0], opacity: [0, 1] }, { type: "spring", visualDuration: 0.4, bounce: 0.35 })],
  [".toast", (el) => animate(el, { x: [-40, 0], opacity: [0, 1], scale: [0.9, 1] }, { type: "spring", visualDuration: 0.35, bounce: 0.4 })],
  [".encounter", (el) => animate(el, { y: [24, 0], opacity: [0, 1], scale: [0.96, 1] }, { type: "spring", visualDuration: 0.4, bounce: 0.3 })],
  [".breakers .brk", (el) => animate(el, { x: [-24, 0], opacity: [0, 1] }, { type: "spring", visualDuration: 0.35, bounce: 0.3, delay: indexIn(el) * 0.05 })],
  [".actions .buttons > button, .prompt .choices > button, .prompt > button, .prompt .cta", (el) => animate(el, { y: [16, 0], opacity: [0, 1], scale: [0.94, 1] }, { type: "spring", visualDuration: 0.34, bounce: 0.35, delay: indexIn(el) * 0.04 })],
  [".game-list > *, .home .panel, .lobby .panel", (el) => animate(el, { y: [18, 0], opacity: [0, 1] }, { type: "spring", visualDuration: 0.4, bounce: 0.25, delay: indexIn(el) * 0.05 })],
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

  let pressed: HTMLElement | null = null;
  const release = () => {
    if (!pressed) return;
    animate(pressed, { scale: 1 }, { type: "spring", visualDuration: 0.3, bounce: 0.55 });
    pressed = null;
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (still()) return;
      const t = (e.target as Element | null)?.closest?.("button, .tile") as HTMLElement | null;
      if (!t || (t as HTMLButtonElement).disabled || t.closest(".fx-layer")) return;
      pressed = t;
      animate(t, { scale: t.classList.contains("tile") ? 0.93 : 0.95 }, { duration: 0.08, ease: "easeOut" });
    },
    { passive: true },
  );
  document.addEventListener("pointerup", release, { passive: true });
  document.addEventListener("pointercancel", release, { passive: true });
  document.addEventListener("pointerleave", release, { passive: true });
}
