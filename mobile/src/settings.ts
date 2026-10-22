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
}

const KEY = "nsg.settings";
const DEFAULTS: Settings = { format: "casual", animations: true, parallax: true, glossary: true, relay: "", notifications: false, notifyTurn: true, notifyMatch: true, sound: true, volume: 0.6, music: true, musicVolume: 0.4 };
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
  document.documentElement.classList.toggle("no-motion", !settings.animations);
}
