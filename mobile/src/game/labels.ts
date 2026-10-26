import { french, t } from "../i18n";
import { engineFr } from "./enginefr";

const APP_LABELS = new Set([
  "Select",
  "Deselect",
  "Choose this card",
  "Install",
  "Play",
  "Install (flashback)",
  "Play (flashback)",
  "Advance",
  "Score",
  "Trash",
  "Rez",
  "Ability",
  "Fire unbroken subroutines",
  "Continue end of turn",
  "Allow end of turn",
  "Mandatory draw",
  "Take clicks",
  "Allow mandatory draw",
  "Allow take clicks",
  "Start turn",
  "End turn",
  "Gain 1[credit]",
  "Draw",
  "Run",
  "Remove tag",
  "Purge",
  "Trash resource",
  "Confirm",
  "Approach server",
  "Approach ice",
  "Encounter ice",
  "Movement",
  "Breach server",
  "End run",
  "Let Runner approach server",
  "Let Runner approach ice",
  "Let Runner encounter",
  "Leave ice unrezzed",
  "Let Runner breach",
  "Continue",
  "No further actions",
  "Fire subs",
  "Stop auto-passing",
  "Auto-pass",
  "Waiting for Corp…",
  "Let it fire",
  "Jack out",
]);

const ENGINE_COMMANDS = new Set(["ability", "dynamic-ability", "corp-ability", "runner-ability"]);

export function labelText(label: string, command?: string): string {
  if (typeof label !== "string") return label;
  const auto = label.match(/^Auto-resolve: (Always|Never|Ask)$/);
  if (auto) return t("Auto-resolve: {mode}", { mode: t(auto[1]) });
  if (command && ENGINE_COMMANDS.has(command)) return label === "Ability" ? t(label) : shown(label);
  const i = label.indexOf(" · ");
  const head = i < 0 ? label : label.slice(0, i);
  const tail = i < 0 ? "" : label.slice(i);
  if (APP_LABELS.has(head)) return t(head) + tail;
  const sub = head.match(/^Subroutine (\d+)$/);
  if (sub && (!command || command === "subroutine")) return t("Subroutine {n}", { n: sub[1] }) + tail;
  if (command === "rez" && head.startsWith("Rez ")) return t("Rez {card}", { card: head === "Rez ice" ? t("ice") : head.slice(4) }) + tail;
  return shown(label);
}

export const typeLine = (types: string[]) => types.map((x) => t(x)).join(" · ");

export const shown = (text: string) => (french() && typeof text === "string" ? engineFr(text) : text);

let textEngine: { renderMessage: (m: unknown) => string; setLanguage?: (lang: string) => void } | null = null;
let engineFrench = false;

export function setTextEngine(engine: typeof textEngine, hasFrench: boolean) {
  textEngine = engine;
  engineFrench = hasFrench;
}

export function showMsg(m: unknown, render: (m: unknown) => string): string {
  if (!french()) return render(m);
  if (!textEngine?.setLanguage || !engineFrench) return engineFr(render(m));
  textEngine.setLanguage("fr");
  try {
    return engineFr(textEngine.renderMessage(m));
  } finally {
    textEngine.setLanguage("en");
  }
}
