import { useEffect, useMemo, useState } from "preact/hooks";
import { silence } from "../sound";
import { FxGlLab, labCards } from "./FxGlLab";
import { FxLab, useLabCards } from "./FxLab";

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
  if (!cards || !groups.length) return <div class="lab-loading label">Loading…</div>;
  return <FxGlLab groups={groups} byPlain={byPlain} />;
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
