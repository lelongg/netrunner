import { play } from "./sound";

export type UiSound = "ui_tap" | "ui_confirm" | "ui_back" | "ui_select" | "ui_toggle_on" | "ui_toggle_off" | "ui_open" | "ui_card_add" | "ui_card_remove" | "ui_copy" | "ui_dive" | "ui_land" | "ui_join" | "ui_ready" | "ui_error" | "ui_notify";

export function uiSound(name: UiSound) {
  play(name, 0.8);
}

function kind(el: Element): UiSound | null {
  if (el.matches(":disabled, [aria-disabled=true]")) return null;
  if (el.getAttribute("role") === "switch") return el.getAttribute("aria-checked") === "true" ? "ui_toggle_off" : "ui_toggle_on";
  if (el.matches("[role=option], [role=tab], [role=radio]") || el.closest("[role=listbox], [role=radiogroup]")) return "ui_select";
  const label = `${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`.trim().toLowerCase();
  if (label.startsWith("add one")) return "ui_card_add";
  if (label.startsWith("remove one")) return "ui_card_remove";
  if (el.matches(".cta, .primary, .dialog-ok")) return "ui_confirm";
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
