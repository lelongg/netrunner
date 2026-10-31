import { useEffect, useMemo, useState } from "preact/hooks";
import { silence } from "../sound";
import { FxGlLab, labCards } from "./FxGlLab";
import { FxLab, plain, useLabCards } from "./FxLab";

export type LabMode = "cards" | "game" | "runs";

const MODES: { key: LabMode; label: string }[] = [
  { key: "cards", label: "Cards" },
  { key: "game", label: "Game" },
  { key: "runs", label: "Runs" },
];

const TYPES: { key: string; label: string; types: string[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "events", label: "Events", types: ["Event", "Operation"] },
  { key: "programs", label: "Programs", types: ["Program"] },
  { key: "hardware", label: "Hardware", types: ["Hardware"] },
  { key: "resources", label: "Resources", types: ["Resource"] },
  { key: "ice", label: "Ice", types: ["ICE"] },
  { key: "assets", label: "Assets", types: ["Asset", "Upgrade"] },
  { key: "agendas", label: "Agendas", types: ["Agenda"] },
];

export function labMode(): LabMode | null {
  const q = new URLSearchParams(location.search);
  const lab = q.get("lab");
  if (lab && MODES.some((m) => m.key === lab)) return lab as LabMode;
  if (q.has("animations") || lab === "scenes") return "game";
  if (q.has("fxgl") || q.has("lab")) return "cards";
  return null;
}

function Cards() {
  const { cards, byPlain } = useLabCards();
  const groups = useMemo(() => {
    const all = labCards(byPlain);
    return TYPES.map((g) => ({ key: g.key, label: g.label, cards: g.types.length ? all.filter((c) => g.types.includes(c.card?.type ?? "")) : all })).filter((g) => g.cards.length);
  }, [byPlain]);
  const sets = useMemo(() => {
    const of = new Map<string, Set<string>>();
    const newest = new Map<string, { name: string; code: number }>();
    for (const c of cards ?? []) {
      if (!c.set_code || c.set_code === "draft") continue;
      const title = plain(c.title);
      if (!of.has(title)) of.set(title, new Set());
      of.get(title)!.add(String(c.set_code));
      const prev = newest.get(String(c.set_code));
      if (!prev || Number(c.code) > prev.code) newest.set(String(c.set_code), { name: String(c.setname ?? c.set_code), code: Number(c.code) });
    }
    return { of, list: [...newest.entries()].sort((a, b) => b[1].code - a[1].code).map(([key, v]) => ({ key, name: v.name })) };
  }, [cards]);
  if (!cards || !groups.length) return <div class="lab-loading label">Loading…</div>;
  return <FxGlLab groups={groups} byPlain={byPlain} sets={sets} />;
}

export function Lab({ initial }: { initial: LabMode }) {
  const [mode, setMode] = useState(initial);
  useEffect(() => {
    silence(false);
    if (mode !== "cards") history.replaceState(null, "", `${location.pathname}?lab=${mode}`);
  }, [mode]);
  return (
    <div class={`lab lab-${mode}`}>
      <div class="tabs lab-tabs" role="tablist">
        {MODES.map((m) => (
          <button role="tab" aria-selected={mode === m.key} class={mode === m.key ? "on" : ""} onClick={() => setMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      {mode === "cards" ? <Cards /> : <FxLab key={mode} scope={mode} />}
    </div>
  );
}
