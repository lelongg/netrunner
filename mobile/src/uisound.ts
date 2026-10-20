import { play } from "./sound";

const FALLBACK: Record<string, [string, number]> = {
  ui_tap: ["click-card", 0.35],
  ui_confirm: ["ting", 0.5],
  ui_back: ["click-card-2", 0.3],
  ui_select: ["click-credit", 0.4],
  ui_toggle_on: ["click-credit-2", 0.45],
  ui_toggle_off: ["click-card-3", 0.35],
  ui_open: ["click-advance", 0.35],
};

export function uiSound(name: keyof typeof FALLBACK) {
  const [fallback, volume] = FALLBACK[name];
  play(name, volume, fallback);
}

function kind(el: Element): keyof typeof FALLBACK | null {
  if (el.matches(":disabled, [aria-disabled=true]")) return null;
  if (el.getAttribute("role") === "switch") return el.getAttribute("aria-checked") === "true" ? "ui_toggle_off" : "ui_toggle_on";
  if (el.matches("[role=option], [role=tab], [role=radio]") || el.closest("[role=listbox], [role=radiogroup]")) return "ui_select";
  if (el.matches(".cta, .primary, .dialog-ok")) return "ui_confirm";
  const label = `${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`.trim().toLowerCase();
  if (/^(back|close|cancel|done)\b/.test(label)) return "ui_back";
  if (el.matches("[aria-haspopup]")) return "ui_open";
  return "ui_tap";
}

export function installUiSounds() {
  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as Element | null)?.closest?.("button, a[href], [role=button], [role=option], [role=switch], [role=tab]");
      if (!el) return;
      if (el.closest(".board") && !el.closest(".menu, .dialog-backdrop")) return;
      const name = kind(el);
      if (name) uiSound(name);
    },
    true,
  );
}
