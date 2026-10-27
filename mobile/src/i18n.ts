import { settings } from "./settings.ts";

import app from "./i18n/fr/app.ts";
import cards from "./i18n/fr/cards.ts";
import board from "./i18n/fr/board.ts";
import decks from "./i18n/fr/decks.ts";
import game from "./i18n/fr/game.ts";
import screens from "./i18n/fr/screens.ts";
import tutorial from "./i18n/fr/tutorial.ts";

const FR: Record<string, string> = { ...cards, ...app, ...board, ...decks, ...game, ...screens, ...tutorial };

export const french = () => settings.language === "fr";

export function t(en: string, vars?: Record<string, string | number>): string {
  let s = french() ? (FR[en] ?? en) : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
