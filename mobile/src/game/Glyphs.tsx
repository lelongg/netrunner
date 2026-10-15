import type { ComponentChildren } from "preact";
import { Icon } from "../icons";
import { GLYPHS } from "./text";

export function glyphs(text: string): ComponentChildren {
  if (!/[\uE001-\uE009]/.test(text)) return text;
  return text.split(/([\uE001-\uE009])/).map((part) => (GLYPHS[part] ? <Icon name={GLYPHS[part]} class="glyph" /> : part));
}
