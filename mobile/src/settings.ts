import type { GameFormat } from "./deckrules";

export interface Settings {
  format: GameFormat;
  animations: boolean;
  parallax: boolean;
  glossary: boolean;
  relay: string;
  notifications: boolean;
  notifyTurn: boolean;
  notifyMatch: boolean;
  sound: boolean;
  volume: number;
  music: boolean;
  musicVolume: number;
  language: "en" | "fr";
}

const KEY = "nsg.settings";
const DEFAULTS: Settings = { format: "casual", animations: true, parallax: true, glossary: true, relay: "", notifications: false, notifyTurn: true, notifyMatch: true, sound: true, volume: 0.6, music: true, musicVolume: 0.4, language: "en" };
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
  for (const fn of listeners) fn();
}

export function onSettings(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const motionOff = () => !settings.animations || matchMedia("(prefers-reduced-motion: reduce)").matches;

export function applySettings() {
  const root = document.documentElement;
  const waking = settings.animations && root.classList.contains("no-motion");
  root.classList.toggle("no-motion", !settings.animations);
  if (!waking) return;
  for (const a of document.getAnimations()) if (a instanceof CSSAnimation && a.effect?.getTiming().iterations !== Infinity) a.finish();
}
