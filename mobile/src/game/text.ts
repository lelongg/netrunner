const ICONS: [RegExp, string][] = [
  [/\[(click|clicks)\]/gi, "◷"],
  [/\[(credit|credits|c)\]/gi, "¢"],
  [/\[recurring-credit\]/gi, "↺¢"],
  [/\[subroutine\]/gi, "↳"],
  [/\[(trash|trash-ability)\]/gi, "⌫"],
  [/\[(mu|memory unit)\]/gi, "MU"],
  [/\[link\]/gi, "⛓"],
  [/\[interrupt\]/gi, "⚡"],
  [/\[!\]/g, "⚠"],
  [/\[(their|pronoun|corp-pronoun|runner-pronoun)\]/g, "their"],
  [/\[(haas-bioroid|jinteki|nbn|weyland-consortium|anarch|criminal|shaper|adam|apex|sunny-lebeau)\]/gi, ""],
];

export function iconize(text: unknown): string {
  if (text == null) return "";
  let s = String(text);
  for (const [re, rep] of ICONS) s = s.replace(re, rep);
  return s.replace(/\[hr\]/gi, "———").replace(/\[br\]/gi, "\n");
}

export function serverLabel(label: unknown): string {
  if (label && typeof label === "object") return (label as { title?: string }).title ?? "Host";
  return String(label);
}

export function serverName(key: string): string {
  if (key === "hq") return "HQ";
  if (key === "rd") return "R&D";
  if (key === "archives") return "Archives";
  const n = key.match(/^remote(\d+)$/);
  return n ? `Server ${n[1]}` : key;
}

export const PHASE_LABELS: Record<string, string> = {
  initiation: "Initiation",
  "approach-ice": "Approach ice",
  "encounter-ice": "Encounter ice",
  movement: "Movement",
  "approach-server": "Approach server",
  success: "Success",
};
