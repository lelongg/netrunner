const KNOWN = new Set(["adam", "anarch", "apex", "criminal", "haas-bioroid", "jinteki", "nbn", "shaper", "sunny-lebeau", "weyland-consortium"]);

export function factionLogoKey(faction?: string | null): string | null {
  const key = (faction ?? "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  return KNOWN.has(key) ? key : null;
}

export function FactionLogo({ faction, class: cls }: { faction?: string | null; class?: string }) {
  const key = factionLogoKey(faction);
  return key ? <img class={`faction-logo logo-${key} ${cls ?? ""}`} src={`${import.meta.env.BASE_URL}factions/${key}.png`} alt="" aria-hidden="true" decoding="async" /> : null;
}
