import { MotionGlobalConfig } from "motion";

export interface Settings {
  animations: boolean;
  glossary: boolean;
  relay: string;
}

const KEY = "nsg.settings";
const DEFAULTS: Settings = { animations: true, glossary: true, relay: "" };
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings: Settings = load();

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  settings[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
  applySettings();
  for (const fn of listeners) fn();
}

export function onSettings(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const motionOff = () => !settings.animations || matchMedia("(prefers-reduced-motion: reduce)").matches;

export function applySettings() {
  MotionGlobalConfig.skipAnimations = !settings.animations;
  document.documentElement.classList.toggle("no-motion", !settings.animations);
}
