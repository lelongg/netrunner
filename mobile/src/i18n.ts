import { settings } from "./settings";

import app from "./i18n/fr/app";
import board from "./i18n/fr/board";
import decks from "./i18n/fr/decks";
import game from "./i18n/fr/game";
import screens from "./i18n/fr/screens";

const FR: Record<string, string> = { ...app, ...board, ...decks, ...game, ...screens };

export const french = () => settings.language === "fr";

export function t(en: string, vars?: Record<string, string | number>): string {
  let s = french() ? (FR[en] ?? en) : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
