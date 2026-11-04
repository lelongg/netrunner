import type { Side } from "./engine";

const KEY = "nsg.nav";

export interface Nav {
  tab?: "decks" | "history";
  deck?: string;
  side?: Side;
  game?: string;
  shared?: { code: string; relay?: string };
  watching?: boolean;
  step?: number;
}

export function readNav(): Nav {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Nav;
  } catch {
    return {};
  }
}

export function saveNav(patch: Nav | null) {
  try {
    if (!patch) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify({ ...readNav(), ...patch }));
  } catch {}
}

export function resetNav(nav: Nav) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(nav));
  } catch {}
}
