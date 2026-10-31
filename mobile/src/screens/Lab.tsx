import { useEffect, useMemo, useState } from "preact/hooks";
import { silence } from "../sound";
import { FxGlLab, glTitles } from "./FxGlLab";
import { FxLab } from "./FxLab";

export type LabMode = "cards" | "signatures" | "game" | "runs";

const MODES: { key: LabMode; label: string }[] = [
  { key: "cards", label: "Cards" },
  { key: "signatures", label: "Signatures" },
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

function CardEffects() {
  const [typeOf, setTypeOf] = useState<Map<string, string> | null>(null);
  const [type, setType] = useState(() => new URLSearchParams(location.search).get("type") ?? "all");
  useEffect(() => {
    fetch("data/cards.json")
      .then((r) => r.json())
      .then((all: { title: string; type: string }[]) => setTypeOf(new Map(all.flatMap((c) => [[c.title, c.type], [c.title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), c.type]]))))
      .catch(() => setTypeOf(new Map()));
  }, []);
  const groups = useMemo(() => {
    const titles = glTitles();
    return TYPES.map((g) => ({ ...g, titles: new Set(g.types.length ? titles.filter((t) => g.types.includes(typeOf?.get(t) ?? "")) : titles) })).filter((g) => g.titles.size);
  }, [typeOf]);
  const current = groups.find((g) => g.key === type) ?? groups[0];
  useEffect(() => {
    history.replaceState(null, "", `${location.pathname}?lab${current.key === "all" ? "" : `&type=${current.key}`}`);
  }, [current.key]);
  if (!typeOf) return null;
  return (
    <>
      <div class="tabs lab-types" role="tablist">
        {groups.map((g) => (
          <button role="tab" aria-selected={g.key === current.key} class={g.key === current.key ? "on" : ""} onClick={() => setType(g.key)}>
            {g.label}
            <span class="lab-count">{g.titles.size}</span>
          </button>
        ))}
      </div>
      <FxGlLab key={current.key} only={current.key === "all" ? undefined : current.titles} />
    </>
  );
}

export function Lab({ initial }: { initial: LabMode }) {
  const [mode, setMode] = useState(initial);
  useEffect(() => {
    silence(mode === "cards");
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
      {mode === "cards" ? <CardEffects /> : <FxLab key={mode} scope={mode} />}
    </div>
  );
}
