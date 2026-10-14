const ICONS: [RegExp, string][] = [
  [/\[(click|clicks)\]/gi, "◷"],
  [/\[(credit|credits|c)\]/gi, "¢"],
  [/\[recurring-credit\]/gi, "↺¢"],
  [/\[subroutine\]/gi, "↳"],
  [/\[(trash|trash-ability)\]/gi, "🗑"],
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

const SERVER_LABELS: Record<string, string> = {
  HQ: "QG (HQ)",
  "R&D": "R&D",
  Archives: "Archives",
  "New remote": "Nouveau serveur",
  Expend: "Dépenser",
};

export function serverLabel(label: unknown): string {
  if (label && typeof label === "object") return (label as { title?: string }).title ?? "Héberger";
  const s = String(label);
  const remote = s.match(/^Server (\d+)$/);
  if (remote) return `Serveur ${remote[1]}`;
  return SERVER_LABELS[s] ?? s;
}

export function serverName(key: string): string {
  if (key === "hq") return "QG";
  if (key === "rd") return "R&D";
  if (key === "archives") return "Archives";
  const n = key.match(/^remote(\d+)$/);
  return n ? `Serveur ${n[1]}` : key;
}

export const PHASE_LABELS: Record<string, string> = {
  initiation: "Initiation",
  "approach-ice": "Approche de la glace",
  "encounter-ice": "Rencontre de la glace",
  movement: "Mouvement",
  "approach-server": "Approche du serveur",
  success: "Run réussi",
};

export const TYPE_LABELS: Record<string, string> = {
  Agenda: "Projet",
  Asset: "Actif",
  ICE: "Glace",
  Upgrade: "Extension",
  Operation: "Opération",
  Event: "Événement",
  Hardware: "Matériel",
  Program: "Programme",
  Resource: "Ressource",
  Identity: "Identité",
};
