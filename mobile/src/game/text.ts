import type { IconName } from "../icons";

export const GLYPHS: Record<string, IconName> = {
  "\uE001": "click",
  "\uE002": "credit",
  "\uE003": "recurring",
  "\uE004": "sub",
  "\uE005": "trash",
  "\uE006": "link",
  "\uE007": "bolt",
  "\uE008": "warning",
  "\uE009": "mu",
};

const ICONS: [RegExp, string][] = [
  [/\[(click|clicks)\]/gi, "\uE001"],
  [/\[recurring-credit\]/gi, "\uE003"],
  [/\[(credit|credits|c)\]/gi, "\uE002"],
  [/\[subroutine\]/gi, "\uE004"],
  [/\[(trash|trash-ability)\]/gi, "\uE005"],
  [/\[(mu|memory unit)\]/gi, "\uE009"],
  [/\[link\]/gi, "\uE006"],
  [/\[interrupt\]/gi, "\uE007"],
  [/\[!\]/g, "\uE008"],
  [/¢/g, "\uE002"],
  [/↳/g, "\uE004"],
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

const CENTRAL_RANK: Record<string, number> = { HQ: 0, "R&D": 1, Archives: 2 };

export function serverRank(label: unknown): number | undefined {
  const name = typeof label === "string" ? label : undefined;
  if (!name) return undefined;
  if (name in CENTRAL_RANK) return CENTRAL_RANK[name];
  const remote = name.match(/^Server (\d+)$/);
  return remote ? 2 + Number(remote[1]) : undefined;
}

export function byServerOrder<T>(items: T[], label: (item: T) => unknown): T[] {
  const servers = items.filter((i) => serverRank(label(i)) !== undefined).sort((a, b) => serverRank(label(a))! - serverRank(label(b))!);
  let next = 0;
  return items.map((i) => (serverRank(label(i)) === undefined ? i : servers[next++]));
}
