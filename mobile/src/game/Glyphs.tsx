import type { ComponentChildren } from "preact";
import { Icon } from "../icons";
import { GLYPHS } from "./text";

export function glyphs(text: string): ComponentChildren {
  if (!/[-]/.test(text)) return text;
  return text.split(/([-])/).map((part) => (GLYPHS[part] ? <Icon name={GLYPHS[part]} class="glyph" /> : part));
}
